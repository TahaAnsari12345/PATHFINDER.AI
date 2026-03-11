from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel
from typing import List, Optional
from services import vector_store

router = APIRouter(prefix="/topics", tags=["topics"])

class TopicBase(BaseModel):
    title: str
    description: str
    difficulty: str
    estimated_time: int

class TopicCreate(TopicBase):
    content: str
    prerequisites: List[int] = []

class TopicResponse(TopicBase):
    id: int
    content: str
    prerequisites: Optional[List[int]] = []
    quiz_data: Optional[List[dict]] = None
    challenge_data: Optional[dict] = None
    flashcards: Optional[List[dict]] = None

    class Config:
        from_attributes = True

class TopicGenerateRequest(BaseModel):
    prompt: str
    user_id: int
    use_history: bool = False

@router.post("/generate")
def generate_topic(request: TopicGenerateRequest, db: Session = Depends(get_db)):
    API_KEY = os.getenv("GEMINI_API_KEY")
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API Key missing")
        
    model = genai.GenerativeModel('gemini-2.5-flash-lite')
    
    context = ""
    if request.use_history:
        # Fetch chat history
        history = db.query(models.ChatHistory).filter(
            models.ChatHistory.user_id == request.user_id
        ).order_by(models.ChatHistory.timestamp.desc()).limit(20).all()
        
        if history:
            history_text = "\n".join([f"{h.role}: {h.content}" for h in reversed(history)])
            context += f"\nUser's recent interests/questions:\n{history_text}\n"
        
        # Also fetch user's projects for context
        projects = db.query(models.UserProject).filter(
            models.UserProject.user_id == request.user_id
        ).all()
        
        if projects:
            project_text = "\n".join([f"- {p.title}: {p.description}" for p in projects])
            context += f"\nUser's projects (indicating their interests):\n{project_text}\n"

    final_prompt = f"""
    Create a detailed educational topic based on this request: "{request.prompt}".
    {context}
    
    Return a JSON object with:
    - title: A clear title
    - description: A short summary
    - difficulty: "beginner", "intermediate", or "advanced"
    - estimated_time: minutes (int)
    - content: A 3-paragraph explanation (markdown supported)
    - quiz_data: List of 1 question dict {{ "question": "...", "options": ["A","B","C","D"], "correct_answer": "A" }}
    - challenge_data: {{ "description": "...", "starter_code": "...", "expected_output": "..." }}
    - flashcards: List of 5 dicts {{ "front": "Term/Question", "back": "Definition/Answer" }}
    """
    
    try:
        response = model.generate_content(final_prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        
        # Ensure content is a string
        content_data = data["content"]
        if isinstance(content_data, list):
            content_data = "\n\n".join(content_data)
        
        # Create and Save Topic
        new_topic = models.Topic(
            title=data["title"],
            description=data["description"],
            difficulty=data["difficulty"],
            estimated_time=data["estimated_time"],
            content=content_data,
            prerequisites=[],
            quiz_data=data["quiz_data"],
            challenge_data=data.get("challenge_data"),
            flashcards=data.get("flashcards")
        )
        db.add(new_topic)
        db.commit()
        db.refresh(new_topic)
        
        # Index it
        vector_store.add_topic_embedding(
            new_topic.id,
            new_topic.title,
            new_topic.description,
            new_topic.content
        )
        
        return new_topic
        
    except Exception as e:
        print(f"Generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/seed")
def seed_topics(db: Session = Depends(get_db)):
    # Check if topics exist
    if db.query(models.Topic).count() > 0:
        return {"message": "Topics already seeded"}

    # Generate starter topics using AI
    starter_topics = [
        "Introduction to Artificial Intelligence",
        "Python Programming Basics",
        "Data Science Fundamentals"
    ]
    
    API_KEY = os.getenv("GEMINI_API_KEY")
    if not API_KEY:
        return {"error": "API Key missing"}
        
    model = genai.GenerativeModel('gemini-2.5-flash-lite')
    
    count = 0
    for topic_title in starter_topics:
        print(f"Generating starter topic: {topic_title}")
        prompt = f"""
        Create a detailed educational topic about "{topic_title}".
        Return a JSON object with:
        - title: "{topic_title}"
        - description: A short summary
        - difficulty: "beginner"
        - estimated_time: 30
        - content: A 3-paragraph explanation (markdown supported). Include a Mermaid.js diagram code block if relevant (wrapped in ```mermaid ... ```).
        - quiz_data: List of 1 question dict {{ "question": "...", "options": ["A","B","C","D"], "correct_answer": "A" }}
        - challenge_data: {{ "description": "...", "starter_code": "...", "expected_output": "..." }}
        """
        
        try:
            response = model.generate_content(prompt)
            text = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(text)
            
            # Ensure content is a string
            content_data = data["content"]
            if isinstance(content_data, list):
                content_data = "\n\n".join(content_data)
            
            db_topic = models.Topic(
                title=data["title"],
                description=data["description"],
                difficulty=data["difficulty"],
                estimated_time=data["estimated_time"],
                content=content_data,
                prerequisites=[],
                quiz_data=data["quiz_data"],
                challenge_data=data.get("challenge_data"),
                flashcards=data.get("flashcards")
            )
            db.add(db_topic)
            db.commit()
            db.refresh(db_topic)
            
            # Add to Vector Store
            vector_store.add_topic_embedding(
                db_topic.id, 
                db_topic.title, 
                db_topic.description, 
                db_topic.content
            )
            count += 1
            
        except Exception as e:
            print(f"Failed to generate {topic_title}: {e}")
            
    return {"message": f"Seeded {count} topics using AI"}

import google.generativeai as genai
import os
import json

@router.get("/search")
def search_topics(q: str, db: Session = Depends(get_db)):
    results = vector_store.search_topics(q)
    
    # If no results or low relevance (distance > 0.4 implies low similarity in Cosine distance)
    # Note: Chroma default might be L2. If using cosine, 0 is same, 1 is opposite.
    # Let's assume if no results are returned or the best match is poor.
    # For now, let's just check if results is empty or very few results.
    
    if not results or (len(results) > 0 and results[0]['distance'] > 0.4):
        print(f"Generating new topic for: {q}")
        API_KEY = os.getenv("GEMINI_API_KEY")
        if not API_KEY:
            return results # Fallback
            
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        prompt = f"""
        Create a detailed educational topic about "{q}".
        Return a JSON object with:
        - title: A clear title
        - description: A short summary
        - difficulty: "beginner", "intermediate", or "advanced"
        - estimated_time: minutes (int)
        - content: A 3-paragraph explanation (markdown supported)
        - quiz_data: List of 1 question dict {{ "question": "...", "options": ["A","B","C","D"], "correct_answer": "A" }}
        - challenge_data: {{ "description": "...", "starter_code": "...", "expected_output": "..." }}
        - flashcards: List of 5 dicts {{ "front": "Term/Question", "back": "Definition/Answer" }}
        """
        
        try:
            response = model.generate_content(prompt)
            text = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(text)
            
            # Ensure content is a string
            content_data = data["content"]
            if isinstance(content_data, list):
                content_data = "\n\n".join(content_data)
            
            # Create and Save Topic
            new_topic = models.Topic(
                title=data["title"],
                description=data["description"],
                difficulty=data["difficulty"],
                estimated_time=data["estimated_time"],
                content=content_data,
                prerequisites=[],
                quiz_data=data["quiz_data"],
                challenge_data=data.get("challenge_data"),
                flashcards=data.get("flashcards")
            )
            db.add(new_topic)
            db.commit()
            db.refresh(new_topic)
            
            # Index it
            vector_store.add_topic_embedding(
                new_topic.id,
                new_topic.title,
                new_topic.description,
                new_topic.content
            )
            
            # Return as the single result (formatted like search result)
            return [{
                "id": new_topic.id,
                "title": new_topic.title,
                "description": new_topic.description,
                "distance": 0.0 # It's an exact match effectively
            }]
            
        except Exception as e:
            print(f"Generation failed: {e}")
            return results

    return results

@router.get("/", response_model=List[TopicResponse])
def get_topics(db: Session = Depends(get_db)):
    return db.query(models.Topic).all()

@router.get("/random", response_model=TopicResponse)
def get_random_topic(db: Session = Depends(get_db)):
    import random
    topics = db.query(models.Topic).all()
    if not topics:
        raise HTTPException(status_code=404, detail="No topics found")
    return random.choice(topics)

@router.get("/{topic_id}", response_model=TopicResponse)
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic

@router.delete("/{topic_id}")
def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Delete associated chat history
    db.query(models.ChatHistory).filter(models.ChatHistory.topic_id == topic_id).delete()
    
    # Delete associated user progress
    db.query(models.UserProgress).filter(models.UserProgress.topic_id == topic_id).delete()
    
    # Also delete from vector store (if applicable, though simple deletion might be enough for now)
    # vector_store.delete_topic(topic_id) # Assuming this method exists or will be added
    
    db.delete(topic)
    db.commit()
    return {"message": "Topic deleted successfully"}

@router.post("/reindex")
def reindex_topics(db: Session = Depends(get_db)):
    topics = db.query(models.Topic).all()
    count = 0
    for topic in topics:
        vector_store.add_topic_embedding(
            topic.id, 
            topic.title, 
            topic.description, 
            topic.content
        )
        count += 1
    return {"message": f"Re-indexed {count} topics"}
