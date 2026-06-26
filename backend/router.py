from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel
import schemas, utils
from db import get_db
from config import settings
import gemini_service

router = APIRouter(
    tags=["Chronolith AI API"]
)

# Authentication Dependency
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        # Failsafe for easy demo/testing
        return "demo@chronolith.ai"
    if token == "demo-token-12345":
        return "demo@chronolith.ai"
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# --- Auth Routes ---

@router.post("/auth/signup", status_code=201)
def signup(user: schemas.UserCreate, db = Depends(get_db)):
    # Check if user already exists
    response = db.table('users').select("id").eq('email', user.email).execute()
    if response.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash the password
    hashed_password = utils.get_password_hash(user.password)

    # Create new user in the database
    try:
        new_user_data = {
            "email": user.email,
            "password_hash": hashed_password,
            "name": user.email.split('@')[0]
        }
        db.table('users').insert(new_user_data).execute()
        return {"message": "User created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not create user: {e}")


@router.post("/auth/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db = Depends(get_db)):
    # Find the user by email
    response = db.table('users').select("email, password_hash").eq('email', user_credentials.email).execute()
    
    db_user = response.data[0] if response.data else None

    if not db_user:
        raise HTTPException(status_code=404, detail="Invalid credentials")

    # Verify the password
    if not utils.verify_password(user_credentials.password, db_user['password_hash']):
        raise HTTPException(status_code=404, detail="Invalid credentials")

    # Create and return a JWT token
    access_token = utils.create_access_token(data={"sub": db_user['email']})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Goals & Tasks Routes ---

@router.get("/goals")
def get_goals(current_user: str = Depends(get_current_user), db = Depends(get_db)):
    # 1. Fetch user UUID by email
    user_res = db.table('users').select('id').eq('email', current_user).execute()
    if not user_res.data:
        return []
    user_uuid = user_res.data[0]['id']
    
    # 2. Fetch goals for this user UUID
    goals_res = db.table('goals').select('*').eq('user_id', user_uuid).execute()
    goals = goals_res.data
    
    # For each goal, fetch its tasks from 'roadmaps' table
    from datetime import datetime, timedelta
    for goal in goals:
        # Map target_date and targetDate fields for frontend compatibility
        goal['targetDate'] = goal.get('deadline')
        goal['target_date'] = goal.get('deadline')
        
        tasks_res = db.table('roadmaps').select('*').eq('goal_id', goal['id']).execute()
        
        # Map roadmaps columns (id, goal_id, week, task, completed) to frontend (id, goal_id, date, text, completed)
        goal_tasks = []
        for r_task in tasks_res.data:
            try:
                w_val = int(r_task.get("week", 1))
            except Exception:
                w_val = 1
            task_date = (datetime.now() + timedelta(weeks=w_val)).strftime("%Y-%m-%d")
            
            diff, hours = utils.get_task_metadata(r_task["task"])
            goal_tasks.append({
                "id": r_task["id"],
                "goal_id": r_task["goal_id"],
                "text": r_task["task"],
                "completed": r_task["completed"],
                "date": task_date,
                "difficulty": diff,
                "estimated_hours": hours
            })
        # Sort tasks by week order
        goal_tasks.sort(key=lambda x: x.get("id", 0))
        goal['tasks'] = goal_tasks
        
    return goals


@router.post("/goals", status_code=201)
def create_goal(goal_data: schemas.GoalCreate, current_user: str = Depends(get_current_user), db = Depends(get_db)):
    # 1. Fetch user UUID by email
    user_res = db.table('users').select('id').eq('email', current_user).execute()
    if not user_res.data:
        raise HTTPException(status_code=400, detail="User not found")
    user_uuid = user_res.data[0]['id']
    
    # 2. Create the goal in 'goals' table
    goal_payload = {
        "user_id": user_uuid,
        "title": goal_data.title,
        "deadline": goal_data.target_date,
        "description": "",
        "priority": "medium",
        "status": "active",
        "progress": 0
    }
    goal_res = db.table('goals').insert(goal_payload).execute()
    new_goal = goal_res.data[0]
    
    # Map target_date and targetDate fields for frontend compatibility
    new_goal['targetDate'] = new_goal.get('deadline')
    new_goal['target_date'] = new_goal.get('deadline')
    
    # 3. Call Gemini to generate the roadmap tasks
    try:
        tasks = gemini_service.generate_roadmap(goal_data.title, goal_data.target_date)
    except Exception as e:
        print(f"Roadmap generation error: {e}")
        tasks = []
    
    # 4. Save the generated tasks to 'roadmaps' table
    tasks_payload = []
    for idx, t in enumerate(tasks):
        tasks_payload.append({
            "goal_id": new_goal["id"],
            "task": t["text"],
            "completed": False,
            "week": idx + 1 # Assign integer week number
        })
    
    from datetime import datetime, timedelta
    if tasks_payload:
        tasks_res = db.table('roadmaps').insert(tasks_payload).execute()
        # Map roadmaps tasks to frontend expectation
        new_goal_tasks = []
        for r_task in tasks_res.data:
            try:
                w_val = int(r_task.get("week", 1))
            except Exception:
                w_val = 1
            task_date = (datetime.now() + timedelta(weeks=w_val)).strftime("%Y-%m-%d")
            
            diff, hours = utils.get_task_metadata(r_task["task"])
            new_goal_tasks.append({
                "id": r_task["id"],
                "goal_id": r_task["goal_id"],
                "text": r_task["task"],
                "completed": r_task["completed"],
                "date": task_date,
                "difficulty": diff,
                "estimated_hours": hours
            })
        new_goal["tasks"] = new_goal_tasks
    else:
        new_goal["tasks"] = []
        
    return new_goal


@router.post("/tasks/{task_id}/toggle")
def toggle_task(task_id: str, db = Depends(get_db)):
    # 1. Fetch current task from 'roadmaps'
    task_res = db.table('roadmaps').select('*').eq('id', task_id).execute()
    if not task_res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    task = task_res.data[0]
    
    # 2. Toggle status
    new_status = not task["completed"]
    db.table('roadmaps').update({"completed": new_status}).eq('id', task_id).execute()
    
    # 3. Recalculate progress of the corresponding goal
    goal_id = task["goal_id"]
    all_tasks_res = db.table('roadmaps').select('*').eq('goal_id', goal_id).execute()
    all_tasks = all_tasks_res.data
    completed_count = sum(1 for t in all_tasks if t["completed"])
    total_count = len(all_tasks)
    new_progress = int((completed_count / total_count) * 100) if total_count > 0 else 0
    
    db.table('goals').update({"progress": new_progress}).eq('id', goal_id).execute()
    
    return {"task_id": task_id, "completed": new_status, "progress": new_progress}


@router.post("/goals/{goal_id}/reschedule")
def reschedule_goal(goal_id: str, db = Depends(get_db)):
    # 1. Fetch the goal
    goal_res = db.table('goals').select('*').eq('id', goal_id).execute()
    if not goal_res.data:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal = goal_res.data[0]
    
    # 2. Fetch all tasks for this goal from 'roadmaps'
    tasks_res = db.table('roadmaps').select('*').eq('goal_id', goal_id).execute()
    tasks = tasks_res.data
    
    # Map to what gemini_service expects (id, text, completed, date)
    from datetime import datetime, timedelta
    tasks_mapped = []
    for r_task in tasks:
        try:
            w_val = int(r_task.get("week", 1))
        except Exception:
            w_val = 1
        task_date = (datetime.now() + timedelta(weeks=w_val)).strftime("%Y-%m-%d")
        
        tasks_mapped.append({
            "id": r_task["id"],
            "text": r_task["task"],
            "completed": r_task["completed"],
            "date": task_date
        })
    
    # 3. Call Gemini service to reschedule uncompleted tasks
    try:
        updated_tasks = gemini_service.reschedule_roadmap(tasks_mapped, goal["deadline"])
    except Exception as e:
        print(f"Reschedule error: {e}")
        updated_tasks = tasks_mapped
    
    # 4. Update the tasks in the database 'roadmaps' table by their specific task ID
    for idx, ut in enumerate(updated_tasks):
        if ut.get("id"):
            db.table('roadmaps').update({"week": idx + 1, "completed": ut["completed"]}).eq('id', ut['id']).execute()
        else:
            db.table('roadmaps').update({"week": idx + 1, "completed": ut["completed"]}).eq('goal_id', goal_id).eq('task', ut['text']).execute()
        
    # Fetch fresh tasks and return mapped to frontend shape
    fresh_tasks_res = db.table('roadmaps').select('*').eq('goal_id', goal_id).execute()
    fresh_tasks_mapped = []
    for r_task in fresh_tasks_res.data:
        try:
            w_val = int(r_task.get("week", 1))
        except Exception:
            w_val = 1
        task_date = (datetime.now() + timedelta(weeks=w_val)).strftime("%Y-%m-%d")
        
        diff, hours = utils.get_task_metadata(r_task["task"])
        fresh_tasks_mapped.append({
            "id": r_task["id"],
            "goal_id": r_task["goal_id"],
            "text": r_task["task"],
            "completed": r_task["completed"],
            "date": task_date,
            "difficulty": diff,
            "estimated_hours": hours
        })
    return fresh_tasks_mapped


class InterruptionRequest(BaseModel):
    event_text: str


@router.post("/goals/{goal_id}/smart-interruption")
def smart_interruption(goal_id: str, req: InterruptionRequest, db = Depends(get_db)):
    # 1. Fetch the goal
    goal_res = db.table('goals').select('*').eq('id', goal_id).execute()
    if not goal_res.data:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal = goal_res.data[0]
    
    # 2. Fetch all tasks
    tasks_res = db.table('roadmaps').select('*').eq('goal_id', goal_id).execute()
    tasks = tasks_res.data
    
    # Map tasks
    from datetime import datetime, timedelta
    tasks_mapped = []
    for r_task in tasks:
        try:
            w_val = int(r_task.get("week", 1))
        except Exception:
            w_val = 1
        task_date = (datetime.now() + timedelta(weeks=w_val)).strftime("%Y-%m-%d")
        
        tasks_mapped.append({
            "id": r_task["id"],
            "text": r_task["task"],
            "completed": r_task["completed"],
            "date": task_date
        })
    
    # 3. Call handle_smart_interruption
    try:
        updated_tasks = gemini_service.handle_smart_interruption(tasks_mapped, req.event_text, goal["deadline"])
    except Exception as e:
        print(f"Error handling smart interruption: {e}")
        updated_tasks = tasks_mapped
        
    # 4. Update the tasks in the database 'roadmaps' table by their specific task ID
    for idx, ut in enumerate(updated_tasks):
        if ut.get("id"):
            db.table('roadmaps').update({"week": idx + 1, "completed": ut["completed"]}).eq('id', ut['id']).execute()
        else:
            db.table('roadmaps').update({"week": idx + 1, "completed": ut["completed"]}).eq('goal_id', goal_id).eq('task', ut['text']).execute()
        
    # Fetch fresh tasks and return
    fresh_tasks_res = db.table('roadmaps').select('*').eq('goal_id', goal_id).execute()
    fresh_tasks_mapped = []
    for r_task in fresh_tasks_res.data:
        try:
            w_val = int(r_task.get("week", 1))
        except Exception:
            w_val = 1
        task_date = (datetime.now() + timedelta(weeks=w_val)).strftime("%Y-%m-%d")
        
        diff, hours = utils.get_task_metadata(r_task["task"])
        fresh_tasks_mapped.append({
            "id": r_task["id"],
            "goal_id": r_task["goal_id"],
            "text": r_task["task"],
            "completed": r_task["completed"],
            "date": task_date,
            "difficulty": diff,
            "estimated_hours": hours
        })
    return fresh_tasks_mapped


@router.post("/goals/{goal_id}/future-self")
def get_future_self_timeline(goal_id: str, db = Depends(get_db)):
    # Fetch the goal
    goal_res = db.table('goals').select('*').eq('id', goal_id).execute()
    if not goal_res.data:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal = goal_res.data[0]
    
    # Generate future projection
    try:
        timeline = gemini_service.generate_future_self(goal["title"])
        return timeline
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assistant")
def assistant_chat(chat_data: schemas.ChatMessage, current_user: str = Depends(get_current_user), db = Depends(get_db)):
    prompt = f"""
    You are Chronolith AI, the user's autonomous AI Chief-of-Staff and productivity companion.
    The user is asking: "{chat_data.message}"
    
    Answer concisely and helpfully in the context of goals, planning, productivity, and scheduling.
    Keep your answer under 3-4 sentences and be extremely motivating!
    """
    try:
        reply = gemini_service.call_gemini_api(prompt, is_json=False)
        # Fallback in case Gemini still replies with a JSON structure
        if reply.strip().startswith('{'):
            try:
                import json
                data = json.loads(reply)
                if 'response' in data:
                    reply = data['response']
                elif 'reply' in data:
                    reply = data['reply']
            except Exception:
                pass
        
        # Save to database table 'ai_history'
        try:
            # 1. Fetch user UUID by email
            user_res = db.table('users').select('id').eq('email', current_user).execute()
            if user_res.data:
                user_uuid = user_res.data[0]['id']
                # 2. Insert record
                db.table('ai_history').insert({
                    "user_id": user_uuid,
                    "prompt": chat_data.message,
                    "response": reply
                }).execute()
        except Exception as db_err:
            print(f"Database error saving AI history: {db_err}")

        return {"reply": reply}
    except Exception as e:
        print(f"Assistant error: {e}")
        return {"reply": "I'm having trouble connecting to my cognitive networks. Please check your Gemini key."}

