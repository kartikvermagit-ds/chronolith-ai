import os
import json
import httpx
from datetime import datetime, timedelta
from config import settings

# Pre-defined study plans for high-quality mock fallbacks (15-30 granular steps)
TEMPLATE_ROADMAPS = {
    "gate": [
        "Review Engineering Mathematics syllabus and select textbooks",
        "Solve linear algebra problems (matrices, determinants, eigenvalues)",
        "Study calculus topics (limits, continuity, differentiability, integration)",
        "Study probability and statistics (random variables, distributions, joint probability)",
        "Cover general aptitude (numerical ability, verbal reasoning, spatial aptitude)",
        "Study Theory of Computation (finite automata, regular expressions, context-free grammars)",
        "Master Compiler Design (lexical analysis, parsing, syntax-directed translation)",
        "Study Digital Logic (boolean algebra, combinational and sequential circuits)",
        "Study Computer Organization and Architecture (machine instructions, addressing modes, ALU)",
        "Study CPU control unit design and instruction pipelining",
        "Learn memory hierarchy (cache memory, virtual memory) and I/O interface",
        "Master programming basics and data structures (arrays, stacks, queues, linked lists)",
        "Understand binary trees, BSTs, heaps, and tree traversals",
        "Study search and sorting algorithms (quick sort, merge sort, binary search)",
        "Learn graphs, graph traversals (BFS, DFS), and minimum spanning trees",
        "Understand design analysis of algorithms (asymptotic complexity, divide and conquer)",
        "Learn greedy algorithms, dynamic programming, and complexity classes (P, NP)",
        "Study Operating Systems (processes, threads, CPU scheduling, synchronization)",
        "Understand deadlocks, memory management (paging, segmentation), and file systems",
        "Study Database Systems (ER-model, relational model, normalization, SQL queries)",
        "Master transactions, concurrency control, and file indexing (B/B+ trees)",
        "Study Computer Networks (OSI/TCP-IP model, flow control, routing protocols)",
        "Learn IP addressing, subnetting, TCP/UDP, and application layer protocols (DNS, HTTP)",
        "Solve last 10 years GATE papers under timed exam conditions",
        "Take 5 full-length online mock tests and analyze weak topics",
        "Resolve weak concepts, finalize revisions, and write summary sheets"
    ],
    "python": [
        "Download and install Python, set up VS Code / PyCharm IDE",
        "Learn Python basic syntax, variables, data types, and print formatting",
        "Master Python conditional statements (if, elif, else) and indentation rules",
        "Study loops in Python (while, for loops, range function, break, continue)",
        "Understand Python collections: Lists (creation, indexing, methods, slicing)",
        "Understand Python collections: Tuples (immutability, packing/unpacking)",
        "Understand Python collections: Dictionaries (key-value pairs, nested dicts)",
        "Understand Python collections: Sets (union, intersection, difference, uniqueness)",
        "Study functions (defining, calling, parameters, default arguments, return statements)",
        "Learn lambda functions, map, filter, zip, and list comprehensions",
        "Master scope rules in Python (local, global, nonlocal, LEGB rule)",
        "Study file operations (reading and writing text files, context managers)",
        "Learn exception handling in Python (try, except, finally, raising exceptions)",
        "Learn Object-Oriented Programming (OOP): Classes, objects, and constructor methods",
        "Learn OOP: Inheritance, method overriding, and polymorphism",
        "Learn OOP: Encapsulation, private attributes, and getter/setter properties",
        "Understand Python modules, import statements, and creating custom packages",
        "Study Python built-in libraries (math, random, datetime, collections)",
        "Build a CLI calculator program with history logging",
        "Build a local file-based database manager script",
        "Build a Python web scraper to fetch page title and links using BeautifulSoup",
        "Install and study NumPy: creating arrays, indexing, vector operations",
        "Install and study Pandas: DataFrames, reading CSV, cleaning data",
        "Practice DataFrame filtering, grouping, sorting, and aggregations",
        "Complete 15 basic Python coding challenges on loops, recursion, and collections",
        "Perform a final project: Build an interactive expense manager application"
    ],
    "ds": [
        "Install Anaconda, set up Jupyter Notebooks, and verify Python environment",
        "Learn basic statistics: mean, median, mode, variance, and standard deviation",
        "Study probability distributions (normal, binomial, poisson) and Central Limit Theorem",
        "Master SQL queries: SELECT, WHERE, JOIN, GROUP BY, and aggregates",
        "Learn data cleaning: handling missing values, duplicates, and outliers in Pandas",
        "Study Pandas DataFrames: filtering, sorting, merging, and reshaping data",
        "Learn exploratory data analysis (EDA) using Matplotlib and Seaborn graphs",
        "Understand correlation analysis and feature engineering principles",
        "Learn Linear Regression: cost function, gradient descent, and evaluation metrics",
        "Learn Logistic Regression: binary classification, sigmoid function, and log loss",
        "Study Decision Trees and Random Forest ensemble methods",
        "Understand model evaluation: train-test split, cross-validation, and metrics",
        "Analyze metrics: Accuracy, Precision, Recall, F1-Score, and ROC-AUC curve",
        "Build a classification model project using Scikit-Learn with a public dataset",
        "Learn K-Means clustering and basic unsupervised machine learning",
        "Study dimensional reduction using Principal Component Analysis (PCA)",
        "Understand basic Neural Networks: neurons, activation functions, backpropagation",
        "Build a simple deep learning model (MLP) for digit classification using Keras",
        "Learn to clean and parse unstructured Text Data (basic NLP with NLTK)",
        "Create an interactive dashboard using Streamlit to present model insights",
        "Clean project code, document methodology on GitHub, and build data portfolio"
    ],
    "web": [
        "Study Semantic HTML5 tags, accessibility, and SEO meta headers",
        "Master CSS layout systems: Flexbox properties and grid layouts",
        "Learn responsive web design: media queries and mobile-first styles",
        "Study JavaScript basics: variables, operators, and primitive data types",
        "Learn JS arrays, loops, object literals, and ES6 functions",
        "Master Document Object Model (DOM) selection, manipulation, and event handling",
        "Understand JavaScript Asynchronous programming: Callbacks, Promises, Async/Await",
        "Learn Git workflow: repository setup, staging, committing, and GitHub pushes",
        "Understand package managers: npm initialization and importing libraries",
        "Install React.js, learn JSX syntax, and component architectures",
        "Understand React Props, State, and event handlers",
        "Master React Hooks: useState, useEffect, and custom hooks",
        "Study React routing using React Router and page navigation structures",
        "Learn CSS-in-JS or styling packages (like Vanilla CSS/Tailwind) inside React",
        "Learn backend basics: installing FastAPI/Node, setting up routing structures",
        "Build standard CRUD REST API endpoints in FastAPI with JSON payloads",
        "Establish database connectivity using Supabase/PostgreSQL client layers",
        "Implement user auth: hashing passwords and generating JWT access tokens",
        "Build a React login/signup page and link to FastAPI auth routes",
        "Connect React dashboard to FastAPI goals & tasks database routers",
        "Configure production deployment: Vercel for frontend, Render for backend"
    ],
    "default": [
        "Clarify target objectives, goals, and outline the scope",
        "Conduct thorough research on core subjects and gather textbooks/tools",
        "Set up study schedules, workstation environment, and install dependencies",
        "Learn foundational concepts and principles of the goal area",
        "Practice basic exercises, complete tutorial blocks, and take notes",
        "Implement basic projects/milestones to verify understanding",
        "Explore intermediate topics, advanced strategies, and methodologies",
        "Build structural models or complex workflows to apply knowledge",
        "Review intermediate results, seek feedback, and identify gaps",
        "Resolve weak concepts and re-practice failed milestones",
        "Create advanced components or build a full-scale portfolio project",
        "Perform comprehensive testing, optimization, and document solutions",
        "Deploy the final product, configure production hosting, or review syllabus",
        "Take final mock tests, practice quizzes, or complete final project review",
        "Create future study/maintenance plan and write a final summary report"
    ]
}

def generate_local_roadmap(title: str, target_date_str: str):
    """
    Generates a realistic roadmap locally using template mapping if Gemini is unavailable.
    """
    title_lower = title.lower()
    milestones = TEMPLATE_ROADMAPS["default"] # Default
    
    if "gate" in title_lower:
        milestones = TEMPLATE_ROADMAPS["gate"]
    elif "python" in title_lower:
        milestones = TEMPLATE_ROADMAPS["python"]
    elif "data scientist" in title_lower or "ds" in title_lower or "ml" in title_lower or "machine learning" in title_lower:
        milestones = TEMPLATE_ROADMAPS["ds"]
    elif "web" in title_lower or "react" in title_lower or "saas" in title_lower or "app" in title_lower or "software" in title_lower:
        milestones = TEMPLATE_ROADMAPS["web"]

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
        
        # Distribute difficulty based on progress index
        if idx < num_milestones // 3:
            diff = "Easy"
        elif idx < (2 * num_milestones) // 3:
            diff = "Medium"
        else:
            diff = "Hard"
            
        # Distribute hours
        est_hours = 1 if diff == "Easy" else 2 if diff == "Medium" else 3
        
        tasks.append({
            "text": milestone,
            "completed": False,
            "date": task_date,
            "difficulty": diff,
            "estimated_hours": est_hours
        })
    return tasks

def call_gemini_api(prompt: str, is_json: bool = False):
    """
    Performs REST API call to Gemini.
    """
    key = settings.GEMINI_API_KEY
    if not key or key == "YOUR_GEMINI_API_KEY":
        raise ValueError("Gemini API key is not configured.")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {}
    }
    if is_json:
        payload["generationConfig"]["responseMimeType"] = "application/json"

    
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

    Generate a highly detailed, step-by-step roadmap consisting of 15 to 30 granular daily tasks/milestones to complete this goal on time.
    For each daily milestone, assign a realistic target completion date distributed between tomorrow and the final target date.
    Also specify a difficulty level ("Easy", "Medium", or "Hard") and an estimated hour count (an integer between 1 and 4) for each task.

    You must output a JSON array of objects. Do not include markdown wraps or explanations.
    The format of the JSON array MUST be:
    [
      {{"text": "Daily task description 1", "date": "YYYY-MM-DD", "difficulty": "Easy", "estimated_hours": 2}},
      {{"text": "Daily task description 2", "date": "YYYY-MM-DD", "difficulty": "Medium", "estimated_hours": 3}},
      ...
    ]
    """
    
    try:
        raw_json = call_gemini_api(prompt, is_json=True)
        raw_data = json.loads(raw_json)
        tasks = []
        for item in raw_data:
            tasks.append({
                "text": item.get("text", "").strip(),
                "completed": False,
                "date": item.get("date", target_date_str),
                "difficulty": item.get("difficulty", "Medium"),
                "estimated_hours": int(item.get("estimated_hours", 2))
            })
        if tasks:
            return tasks
    except Exception as e:
        print(f"Gemini generation failed, falling back to local: {e}")
        
    return generate_local_roadmap(title, target_date_str)

def reschedule_roadmap(tasks_list: list, target_date_str: str):
    """
    Reschedules uncompleted tasks to fit in timeframe. Preserves the task IDs.
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
    {json.dumps([{"id": t.get("id"), "text": t["text"]} for t in uncompleted], indent=2)}

    Reschedule these uncompleted tasks, redistributing their target dates starting from tomorrow up to the final target date.
    You must output a JSON array of objects matching this exact format:
    [
      {{"id": "original_id_here", "text": "Original task description", "date": "YYYY-MM-DD"}},
      ...
    ]
    Do NOT edit, rephrase, or change the task text. It must match the input task text exactly.
    """
    
    try:
        raw_json = call_gemini_api(prompt, is_json=True)
        raw_data = json.loads(raw_json)
        rescheduled_tasks = []
        for idx, item in enumerate(raw_data):
            orig_task = None
            item_id = item.get("id")
            if item_id is not None:
                orig_task = next((t for t in uncompleted if str(t.get("id")) == str(item_id)), None)
            if not orig_task:
                orig_task = next((t for t in uncompleted if t["text"].lower() == item.get("text", "").lower()), None)
            if not orig_task and idx < len(uncompleted):
                orig_task = uncompleted[idx]
                
            if orig_task:
                rescheduled_tasks.append({
                    "id": orig_task.get("id"),
                    "text": orig_task["text"],
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
            "id": t.get("id"),
            "text": t["text"],
            "completed": False,
            "date": f"Optimized: {task_date}"
        })
        
    return completed + rescheduled_tasks

def generate_future_self(title: str):
    """
    Generates a 30-day, 90-day, 180-day, and 365-day projection of the user's life/skills if they stick to their goal.
    """
    prompt = f"""
    You are Chronolith AI, an advanced predictive Future Self Simulator.
    The user is pursuing this goal: "{title}"
    
    Predict and write a highly motivating, specific, and futuristic projection of what their skills, life, or status will look like if they successfully stick to this goal:
    - Day 30 (Quick wins, initial habits established)
    - Day 90 (Solid competency, real progress visible)
    - Day 180 (Advanced capabilities, mastery beginning)
    - Day 365 (Transformed state, complete goal integration)
    
    You must output a JSON array of objects. Do not include markdown wraps or explanations.
    The format of the JSON array MUST be:
    [
      {{"day": "Day 30", "title": "Title here", "description": "Short description of accomplishments"}},
      {{"day": "Day 90", "title": "Title here", "description": "Short description of accomplishments"}},
      {{"day": "Day 180", "title": "Title here", "description": "Short description of accomplishments"}},
      {{"day": "Day 365", "title": "Title here", "description": "Short description of accomplishments"}}
    ]
    """
    try:
        raw_json = call_gemini_api(prompt, is_json=True)
        raw_data = json.loads(raw_json)
        return raw_data
    except Exception as e:
        print(f"Future self generation failed, falling back to local: {e}")
        return [
            {"day": "Day 30", "title": "Foundational Momentum", "description": f"Successfully integrated core routines for '{title}'. You have built consistency and completed early milestones."},
            {"day": "Day 90", "title": "Visible Mastery", "description": f"Real-world application of '{title}'. You can build complex features, solve hard problems, and work independently."},
            {"day": "Day 180", "title": "Advanced Synergy", "description": f"Deep competence achieved. You are teaching others or deploying solutions, operating with high self-confidence."},
            {"day": "Day 365", "title": "Complete Evolution", "description": f"The goal '{title}' is now second nature. You have unlocked new career paths, higher income, or absolute mastery."}
        ]

def handle_smart_interruption(tasks_list: list, interruption_text: str, target_date_str: str):
    """
    Reschedules tasks to clear the schedule for the day(s) impacted by the interruption.
    """
    uncompleted = [t for t in tasks_list if not t.get("completed")]
    completed = [t for t in tasks_list if t.get("completed")]
    
    if not uncompleted:
        return tasks_list
        
    prompt = f"""
    You are an expert AI Scheduler. The user has reported an interruption: "{interruption_text}".
    We need to adjust their study roadmap to clear tasks on the days affected by the interruption, and redistribute them across other days up to the final target date.
    Final target date is: {target_date_str}.
    Today's date is: {datetime.now().strftime("%Y-%m-%d")}.

    Uncompleted tasks:
    {json.dumps([{"id": t.get("id"), "text": t["text"], "date": t.get("date")} for t in uncompleted], indent=2)}

    Adjust the target dates for these tasks to avoid the conflict.
    You must output a JSON array of objects matching this exact format:
    [
      {{"id": "original_id_here", "text": "Original task description", "date": "YYYY-MM-DD"}},
      ...
    ]
    Do NOT edit, rephrase, or change the task text. It must match the input task text exactly.
    """
    try:
        raw_json = call_gemini_api(prompt, is_json=True)
        raw_data = json.loads(raw_json)
        adjusted_tasks = []
        for idx, item in enumerate(raw_data):
            orig_task = None
            item_id = item.get("id")
            if item_id is not None:
                orig_task = next((t for t in uncompleted if str(t.get("id")) == str(item_id)), None)
            if not orig_task:
                orig_task = next((t for t in uncompleted if t["text"].lower() == item.get("text", "").lower()), None)
            if not orig_task and idx < len(uncompleted):
                orig_task = uncompleted[idx]
                
            if orig_task:
                adjusted_tasks.append({
                    "id": orig_task.get("id"),
                    "text": orig_task["text"],
                    "completed": False,
                    "date": item.get("date", target_date_str)
                })
        if adjusted_tasks:
            return completed + adjusted_tasks
    except Exception as e:
        print(f"Smart interruption failed, falling back to local: {e}")
        
    return reschedule_roadmap(tasks_list, target_date_str)


