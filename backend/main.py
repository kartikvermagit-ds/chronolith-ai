from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from router import router as auth_router

# Create a FastAPI app instance
app = FastAPI(
    title="Chronolith AI API",
    description="Backend API for the Chronolith AI productivity companion.",
    version="0.1.0"
)

# --- CORS Middleware ---
origins = [
    "http://localhost:5173",  # The default address for Vite dev server
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include Routers ---
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Chronolith AI Backend is running!"}