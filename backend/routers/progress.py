from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/progress", tags=["progress"])

class ProgressUpdate(BaseModel):
    user_id: int
    topic_id: int
    status: str # locked, in-progress, completed
    score: int = None

@router.post("/update")
def update_progress(request: ProgressUpdate, db: Session = Depends(get_db)):
    # 1. Update Topic Progress
    progress = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == request.user_id,
        models.UserProgress.topic_id == request.topic_id
    ).first()

    if not progress:
        progress = models.UserProgress(
            user_id=request.user_id, 
            topic_id=request.topic_id, 
            status=request.status,
            score=request.score
        )
        db.add(progress)
    else:
        progress.status = request.status
        if request.score is not None:
            progress.score = request.score
        progress.last_accessed = datetime.utcnow()
    
    # 2. Log Activity
    log = models.ActivityLog(
        user_id=request.user_id,
        action=f"update_topic_{request.topic_id}",
        details={"status": request.status, "score": request.score}
    )
    db.add(log)

    # 3. Update Streak (Only if topic is completed)
    if request.status == "completed":
        streak = db.query(models.UserStreak).filter(models.UserStreak.user_id == request.user_id).first()
        now = datetime.utcnow()
        
        if not streak:
            streak = models.UserStreak(user_id=request.user_id, current_streak=1, last_activity_date=now)
            db.add(streak)
        else:
            last_date = streak.last_activity_date.date()
            today = now.date()
            
            if today > last_date:
                if (today - last_date).days == 1:
                    streak.current_streak += 1
                else:
                    streak.current_streak = 1
                streak.last_activity_date = now
            # If today == last_date, do nothing (already counted)

    # 4. Check & Award Badges
    new_badges = []
    
    # Badge: First Step (Complete 1 topic)
    if request.status == "completed":
        completed_count = db.query(models.UserProgress).filter(
            models.UserProgress.user_id == request.user_id,
            models.UserProgress.status == "completed"
        ).count()
        
        def award_badge(name):
            has_badge = db.query(models.UserBadge).filter(
                models.UserBadge.user_id == request.user_id,
                models.UserBadge.badge_name == name
            ).first()
            if not has_badge:
                badge = models.UserBadge(user_id=request.user_id, badge_name=name)
                db.add(badge)
                new_badges.append(name)

        award_badge("First Step 🚀")
        
        if completed_count >= 4:
             award_badge("Scholar 📚")
            
        if request.score and request.score == 100:
            award_badge("Quiz Whiz 💯")

    db.commit()
    return {"message": "Progress updated", "new_badges": new_badges}

@router.get("/{user_id}")
def get_user_progress(user_id: int, db: Session = Depends(get_db)):
    progress = db.query(models.UserProgress).filter(models.UserProgress.user_id == user_id).all()
    return progress

@router.get("/{user_id}/recommendations")
def get_recommendations(user_id: int, db: Session = Depends(get_db)):
    # Simple recommendation logic
    # 1. Find in-progress topics
    in_progress = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == user_id,
        models.UserProgress.status == "in-progress"
    ).first()
    
    if in_progress:
        topic = db.query(models.Topic).filter(models.Topic.id == in_progress.topic_id).first()
        return {"reason": "Continue where you left off", "topic": topic}

    # 2. Find next unlocked topic (not completed)
    completed_ids = [p.topic_id for p in db.query(models.UserProgress).filter(
        models.UserProgress.user_id == user_id,
        models.UserProgress.status == "completed"
    ).all()]
    
    all_topics = db.query(models.Topic).all()
    for topic in all_topics:
        if topic.id not in completed_ids:
            # Check prerequisites
            prereqs = topic.prerequisites or []
            if all(pid in completed_ids for pid in prereqs):
                return {"reason": "Recommended next step", "topic": topic}
    
    return {"reason": "You've completed everything!", "topic": None}

@router.get("/{user_id}/gamification")
def get_gamification_data(user_id: int, db: Session = Depends(get_db)):
    streak = db.query(models.UserStreak).filter(models.UserStreak.user_id == user_id).first()
    badges = db.query(models.UserBadge).filter(models.UserBadge.user_id == user_id).all()
    
    return {
        "streak": streak.current_streak if streak else 0,
        "badges": [b.badge_name for b in badges]
    }
