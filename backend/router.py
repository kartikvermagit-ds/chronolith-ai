from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
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
        new_user_data = {"email": user.email, "hashed_password": hashed_password}
        db.table('users').insert(new_user_data).execute()
        return {"message": "User created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not create user: {e}")


@router.post("/auth/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db = Depends(get_db)):
    # Find the user by email
    response = db.table('users').select("email, hashed_password").eq('email', user_credentials.email).execute()
    
    db_user = response.data[0] if response.data else None

    if not db_user:
        raise HTTPException(status_code=404, detail="Invalid credentials")

    # Verify the password
    if not utils.verify_password(user_credentials.password, db_user['hashed_password']):
        raise HTTPException(status_code=404, detail="Invalid credentials")

    # Create and return a JWT token
    access_token = utils.create_access_token(data={"sub": db_user['email']})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Goals & Tasks Routes ---

@router.get("/goals")
def get_goals(current_user: str = Depends(get_current_user), db = Depends(get_db)):
    # Fetch goals for this user
    goals_res = db.table('goals').select('*').eq('user_email', current_user).execute()
    goals = goals_res.data
    
    # For each goal, fetch its tasks
    for goal in goals:
        tasks_res = db.table('tasks').select('*').eq('goal_id', goal['id']).execute()
        goal['tasks'] = tasks_res.data
        
    return goals


@router.post("/goals", status_code=201)
def create_goal(goal_data: schemas.GoalCreate, current_user: str = Depends(get_current_user), db = Depends(get_db)):
    # 1. Create the goal
    goal_payload = {
        "user_email": current_user,
        "title": goal_data.title,
        "target_date": goal_data.target_date,
        "progress": 0
    }
    goal_res = db.table('goals').insert(goal_payload).execute()
    new_goal = goal_res.data[0]
    
    # 2. Call Gemini to generate the roadmap tasks
    try:
        tasks = gemini_service.generate_roadmap(goal_data.title, goal_data.target_date)
    except Exception as e:
        print(f"Roadmap generation error: {e}")
        tasks = []
    
    # 3. Save the generated tasks to DB
    tasks_payload = []
    for t in tasks:
        tasks_payload.append({
            "goal_id": new_goal["id"],
            "text": t["text"],
            "completed": False,
            "date": t["date"]
        })
    
    if tasks_payload:
        tasks_res = db.table('tasks').insert(tasks_payload).execute()
        new_goal["tasks"] = tasks_res.data
    else:
        new_goal["tasks"] = []
        
    return new_goal


@router.post("/tasks/{task_id}/toggle")
def toggle_task(task_id: int, db = Depends(get_db)):
    # 1. Fetch current task
    task_res = db.table('tasks').select('*').eq('id', task_id).execute()
    if not task_res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    task = task_res.data[0]
    
    # 2. Toggle status
    new_status = not task["completed"]
    db.table('tasks').update({"completed": new_status}).eq('id', task_id).execute()
    
    # 3. Recalculate progress of the corresponding goal
    goal_id = task["goal_id"]
    all_tasks_res = db.table('tasks').select('*').eq('goal_id', goal_id).execute()
    all_tasks = all_tasks_res.data
    completed_count = sum(1 for t in all_tasks if t["completed"])
    total_count = len(all_tasks)
    new_progress = int((completed_count / total_count) * 100) if total_count > 0 else 0
    
    db.table('goals').update({"progress": new_progress}).eq('id', goal_id).execute()
    
    return {"task_id": task_id, "completed": new_status, "progress": new_progress}


@router.post("/goals/{goal_id}/reschedule")
def reschedule_goal(goal_id: int, db = Depends(get_db)):
    # 1. Fetch the goal
    goal_res = db.table('goals').select('*').eq('id', goal_id).execute()
    if not goal_res.data:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal = goal_res.data[0]
    
    # 2. Fetch all tasks for this goal
    tasks_res = db.table('tasks').select('*').eq('goal_id', goal_id).execute()
    tasks = tasks_res.data
    
    # 3. Call Gemini service to reschedule uncompleted tasks
    try:
        updated_tasks = gemini_service.reschedule_roadmap(tasks, goal["target_date"])
    except Exception as e:
        print(f"Reschedule error: {e}")
        updated_tasks = tasks
    
    # 4. Update the tasks in the database
    for ut in updated_tasks:
        db.table('tasks').update({"date": ut["date"], "completed": ut["completed"]}).eq('goal_id', goal_id).eq('text', ut['text']).execute()
        
    # Fetch fresh tasks and return
    fresh_tasks_res = db.table('tasks').select('*').eq('goal_id', goal_id).execute()
    return fresh_tasks_res.data