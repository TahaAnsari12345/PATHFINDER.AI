from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel
import google.generativeai as genai
import os
import json

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/check-memory/{user_id}")
def check_user_memory(user_id: int, db: Session = Depends(get_db)):
    """Check if a user has any memory (chat history OR projects) for personalized generation."""
    # Check chat history
    chat_count = db.query(models.ChatHistory).filter(
        models.ChatHistory.user_id == user_id
    ).count()
    
    # Also check if user has any projects (projects represent learning context too)
    project_count = db.query(models.UserProject).filter(
        models.UserProject.user_id == user_id
    ).count()
    
    return {"hasMemory": chat_count > 0 or project_count > 0}


class ProjectGenerateRequest(BaseModel):
    user_id: int
    topic_ids: list[int]
    custom_prompt: str = None
    use_history: bool = False

class ProjectCreateRequest(BaseModel):
    user_id: int
    title: str
    description: str
    steps: list[dict]

class VerifyStepRequest(BaseModel):
    code: str
    step_instruction: str

@router.post("/generate")
async def generate_project(request: ProjectGenerateRequest, db: Session = Depends(get_db)):
    API_KEY = os.getenv("GEMINI_API_KEY")
    if not API_KEY:
        return {"error": "API Key missing"}
    
    model = genai.GenerativeModel('gemini-2.5-flash-lite')
    
    # Context building
    context = ""
    if request.use_history:
        # Fetch last 20 chat messages
        history = db.query(models.ChatHistory).filter(
            models.ChatHistory.user_id == request.user_id
        ).order_by(models.ChatHistory.timestamp.desc()).limit(20).all()
        
        if history:
            history_text = "\n".join([f"{h.role}: {h.content}" for h in reversed(history)])
            context += f"\nUser's recent learning history:\n{history_text}\n"

    # Fetch topic details if provided
    if request.topic_ids:
        topics = db.query(models.Topic).filter(models.Topic.id.in_(request.topic_ids)).all()
        topic_names = ", ".join([t.title for t in topics])
        context += f"\nTopics learned: {topic_names}\n"

    # Construct Prompt
    if request.custom_prompt:
        base_prompt = f"Generate a coding project based on this idea: '{request.custom_prompt}'."
    else:
        base_prompt = f"Generate a coding project for a student who has learned: {context}."

    final_prompt = f"""
    {base_prompt}
    {context}
    
    The project should be a small, self-contained application (CLI or script).
    
    Return a JSON object with:
    - title: Project Title
    - description: Short description
    - steps: A list of 3-5 steps. Each step has:
        - title: Step Title
        - instruction: Detailed instruction on what code to write.
    
    Example JSON structure:
    {{
        "title": "Matrix Calculator",
        "description": "...",
        "steps": [
            {{"title": "Setup", "instruction": "Create a class..."}}
        ]
    }}
    """
    
    try:
        response = model.generate_content(final_prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        project_data = json.loads(text)
        return project_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.post("/create")
def create_project(project: ProjectCreateRequest, db: Session = Depends(get_db)):
    db_project = models.UserProject(
        user_id=project.user_id,
        title=project.title,
        description=project.description,
        steps=project.steps,
        current_step=0,
        code_files={"main.py": "# Start coding here\n"}
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("/{user_id}")
def get_user_projects(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.UserProject).filter(models.UserProject.user_id == user_id).all()

@router.get("/detail/{project_id}")
def get_project_detail(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.UserProject).filter(models.UserProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.UserProject).filter(models.UserProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete associated chat history
    db.query(models.ChatHistory).filter(models.ChatHistory.project_id == project_id).delete()

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}

@router.post("/{project_id}/verify")
async def verify_step(project_id: int, request: VerifyStepRequest, db: Session = Depends(get_db)):
    API_KEY = os.getenv("GEMINI_API_KEY")
    if not API_KEY:
        return {"passed": False, "feedback": "API Key missing"}

    model = genai.GenerativeModel('gemini-2.5-flash-lite')
    
    prompt = f"""
    Review this code against the instruction.
    
    Instruction: {request.step_instruction}
    
    Code:
    {request.code}
    
    Does the code fulfill the instruction?
    Return JSON:
    {{
        "passed": true/false,
        "feedback": "Short feedback explaining why it passed or failed."
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
        
        if result["passed"]:
            # Advance step if passed
            project = db.query(models.UserProject).filter(models.UserProject.id == project_id).first()
            if project:
                # Update code
                files = dict(project.code_files) if project.code_files else {}
                files["main.py"] = request.code
                project.code_files = files
                
                if project.current_step < len(project.steps) - 1:
                    project.current_step += 1
                else:
                    project.status = "completed"
                db.commit()
                
        return result
    except Exception as e:
        return {"passed": False, "feedback": f"Error: {str(e)}"}

class HintRequest(BaseModel):
    code: str
    step_instruction: str

@router.post("/{project_id}/hint")
async def get_hint(project_id: int, request: HintRequest):
    API_KEY = os.getenv("GEMINI_API_KEY")
    if not API_KEY:
        return {"hint": "API Key missing"}

    model = genai.GenerativeModel('gemini-2.5-flash-lite')
    
    prompt = f"""
    The student is stuck on this step. Provide a helpful hint, but do not write the full solution.
    
    Instruction: {request.step_instruction}
    
    Current Code:
    {request.code}
    
    Hint:
    """
    
    try:
        response = model.generate_content(prompt)
        return {"hint": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
