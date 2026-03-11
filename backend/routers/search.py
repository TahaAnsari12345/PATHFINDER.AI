from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
import models

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/")
async def search(q: str, db: Session = Depends(get_db)):
    if not q:
        return {"topics": [], "projects": []}
    
    # Search Topics
    topics = db.query(models.Topic).filter(
        or_(
            models.Topic.title.ilike(f"%{q}%"),
            models.Topic.description.ilike(f"%{q}%")
        )
    ).all()
    
    # Search Projects
    projects = db.query(models.UserProject).filter(
        or_(
            models.UserProject.title.ilike(f"%{q}%"),
            models.UserProject.description.ilike(f"%{q}%")
        )
    ).all()
    
    return {
        "topics": topics,
        "projects": projects
    }
