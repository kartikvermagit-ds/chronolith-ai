from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from . import schemas, utils
from db.supabase_client import get_supabase_client

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/signup", status_code=201)
def signup(user: schemas.UserCreate, db: Client = Depends(get_supabase_client)):
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


@router.post("/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Client = Depends(get_supabase_client)):
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