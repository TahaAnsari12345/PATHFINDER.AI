from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel
from passlib.context import CryptContext

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "email": new_user.email}

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    # Check for Lost Mode (last login > 7 days ago)
    last_login = db.query(models.ActivityLog).filter(
        models.ActivityLog.user_id == db_user.id,
        models.ActivityLog.action == "login"
    ).order_by(models.ActivityLog.timestamp.desc()).first()
    
    is_lost_mode = False
    if last_login:
        from datetime import datetime, timedelta
        if datetime.utcnow() - last_login.timestamp > timedelta(days=7):
            is_lost_mode = True
            
    # Log this login
    log = models.ActivityLog(user_id=db_user.id, action="login")
    db.add(log)
    db.commit()
    
    return {"message": "Login successful", "user_id": db_user.id, "is_lost_mode": is_lost_mode}
