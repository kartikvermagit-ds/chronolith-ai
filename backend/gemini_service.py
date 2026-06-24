import os
import json
import httpx
from datetime import datetime, timedelta
from config import settings

# Pre-defined study plans for high-quality mock fallbacks
TEMPLATE_ROADMAPS = {
    "gate": [
        "Revise Engineering Mathematics & General Aptitude",
        "Master Theory of Computation, Compilers & Digital Logic",
        "Master Computer Architecture, Programming & Data Structures",
        "Cover Operating Systems, Databases & Computer Networks",
        "Solve last 10 years GATE papers and take full-length mock tests",
        "Perform final revision and weak-concept resolution"
    ],
    "python": [
        "Learn Python syntax, control flows, data types and OOP concepts",
        "Learn SQL databases, CRUD operations and write complex queries",
        "Learn NumPy, Pandas, Matplotlib and perform Exploratory Data Analysis",
        "Build 3 core python projects (Web Scraper, CLI tool, Data Analyzer)",
        "Review basic concepts and complete python coding challenges"
    ],
    "ds": [
        "Master Python programming and basic statistics",
        "Learn SQL and Data Wrangling with Pandas & NumPy",
        "Understand Linear Regression, Decision Trees and basic ML algorithms",
        "Build a Machine Learning classification project and upload to GitHub",
        "Create interactive data dashboards (Streamlit/Tableau) and finalize portfolio"
    ],
    "web": [
        "Master semantic HTML5, modern CSS Layouts (Grid/Flexbox) and ES6+ JS",
        "Learn React.js (State, Hooks, Context API) and styling frameworks",
        "Learn backend basics (FastAPI/Node) and database connections (Supabase/PostgreSQL)",
        "Build a full-stack SaaS application with authentication and dashboards",
        "Perform testing, optimize site performance and deploy to production (Vercel/Render)"
    ]
}

def generate_local_roadmap(title: str, target_date_str: str):
    """
    Generates a realistic roadmap locally using template mapping if Gemini is unavailable.
    """
    title_lower = title.lower()
    milestones = TEMPLATE_ROADMAPS["web"] # Default
    
    if "gate" in title_lower:
        milestones = TEMPLATE_ROADMAPS["gate"]
    elif "python" in title_lower:
        milestones = TEMPLATE_ROADMAPS["python"]
    elif "data scientist" in title_lower or "ds" in title_lower or "ml" in title_lower or "machine learning" in title_lower:
        milestones = TEMPLATE_ROADMAPS["ds"]
    elif "web" in title_lower or "react" in title_lower or "saas" in title_lower or "app" in title_lower or "software" in title_lower:
        milestones = TEMPLATE_ROADMAPS["web"]
    else:
        # Generic plan
        milestones = [
            "Research, gather resources and design the project scope",
            "Set up development environment and implement foundation architecture",
            "Build core feature components and verify integration flows",
            "Perform rigorous testing, fix bugs and optimize usability",
            "Complete final configurations and deploy the product to production"
        ]

    # Distribute dates between today and target date
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
    except Exception:
        target_date = datetime.now() + timedelta(days=90)
        
    today = datetime.now()
    days_diff = (target_date - today).days
    if days_diff <= 0:
        days_diff = 30

    tasks = []
    num_milestones = len(milestones)
    for idx, milestone in enumerate(milestones):
        # Linearly distribute the dates
        task_days = int(days_diff * (idx + 1) / num_milestones)
        task_date = (today + timedelta(days=task_days)).strftime("%Y-%m-%d")
        tasks.append({
            "text": milestone,
            "completed": False,
            "date": task_date
        })
    return tasks

def call_gemini_api(prompt: str):
    """
    Performs REST API call to Gemini.
    """
    key = settings.GEMINI_API_KEY
    if not key or key == "YOUR_GEMINI_API_KEY":
        raise ValueError("Gemini API key is not configured.")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    with httpx.Client() as client:
        response = client.post(url, headers=headers, json=payload, timeout=25.0)
        response.raise_for_status()
        res_data = response.json()
        text = res_data["candidates"][0]["content"]["parts"][0]["text"]
        return text

def generate_roadmap(title: str, target_date_str: str):
    """
    Generates a list of tasks for a goal. Attempts Gemini API first, falls back to local.
    """
    prompt = f"""
    You are an expert Chief-of-Staff AI productivity companion.
    The user wants to achieve this goal: "{title}"
    The final target completion date is: {target_date_str}.
    Today's date is: {datetime.now().strftime("%Y-%m-%d")}.

    Generate a step-by-step roadmap consisting of 4 to 6 milestones/tasks to complete this goal on time.
    For each milestone, assign a realistic target completion date distributed between today and the final target date.

    You must output a JSON array of objects. Do not include markdown wraps or explanations.
    The format of the JSON array MUST be:
    [
      {{"text": "Description of milestone 1", "date": "YYYY-MM-DD"}},
      {{"text": "Description of milestone 2", "date": "YYYY-MM-DD"}},
      ...
    ]
    """
    
    try:
        raw_json = call_gemini_api(prompt)
        raw_data = json.loads(raw_json)
        # Parse output and ensure format
        tasks = []
        for item in raw_data:
            tasks.append({
                "text": item.get("text", "").strip(),
                "completed": False,
                "date": item.get("date", target_date_str)
            })
        if tasks:
            return tasks
    except Exception as e:
        print(f"Gemini generation failed, falling back to local: {e}")
        
    return generate_local_roadmap(title, target_date_str)

def reschedule_roadmap(tasks_list: list, target_date_str: str):
    """
    Reschedules uncompleted tasks to fit in timeframe.
    """
    uncompleted = [t for t in tasks_list if not t.get("completed")]
    completed = [t for t in tasks_list if t.get("completed")]
    
    if not uncompleted:
        return tasks_list
        
    prompt = f"""
    You are an expert AI Scheduler. The user is falling behind on their goal deadlines.
    We need to reschedule the remaining uncompleted tasks to fit within the timeframe.
    Final target date is: {target_date_str}.
    Today's date is: {datetime.now().strftime("%Y-%m-%d")}.

    Uncompleted tasks:
    {json.dumps([t['text'] for t in uncompleted], indent=2)}

    Reschedule these uncompleted tasks, redistributing their target dates starting from tomorrow up to the final target date.
    You must output a JSON array of objects matching this exact format:
    [
      {{"text": "Original task description", "date": "YYYY-MM-DD"}},
      ...
    ]
    """
    
    try:
        raw_json = call_gemini_api(prompt)
        raw_data = json.loads(raw_json)
        rescheduled_tasks = []
        # Match back
        for item in raw_data:
            rescheduled_tasks.append({
                "text": item.get("text", "").strip(),
                "completed": False,
                "date": item.get("date", target_date_str)
            })
        if rescheduled_tasks:
            return completed + rescheduled_tasks
    except Exception as e:
        print(f"Gemini reschedule failed, falling back to local: {e}")
        
    # Local fallback: linearly redistribute uncompleted task dates
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
    except Exception:
        target_date = datetime.now() + timedelta(days=60)
        
    today = datetime.now()
    days_diff = (target_date - today).days
    if days_diff <= 0:
        days_diff = 15
        
    rescheduled_tasks = []
    num_tasks = len(uncompleted)
    for idx, t in enumerate(uncompleted):
        task_days = int(days_diff * (idx + 1) / num_tasks)
        task_date = (today + timedelta(days=task_days)).strftime("%Y-%m-%d")
        rescheduled_tasks.append({
            "text": t["text"],
            "completed": False,
            "date": f"Optimized: {task_date}"
        })
        
    return completed + rescheduled_tasks
