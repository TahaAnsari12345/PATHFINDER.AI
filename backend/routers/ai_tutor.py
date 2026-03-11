from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

router = APIRouter(prefix="/ai_tutor", tags=["ai_tutor"])

# Configure Gemini
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

class ExplainRequest(BaseModel):
    topic: str
    concept: str
    difficulty: str # beginner, intermediate, advanced, 5yo

class DiagramRequest(BaseModel):
    concept: str

class ChatRequest(BaseModel):
    history: list[dict]
    message: str
    socratic_mode: bool = False
    user_id: int
    topic_id: int | None = None
    project_id: int | None = None

class EditMessageRequest(BaseModel):
    message_id: int
    new_content: str
    user_id: int
    topic_id: int | None = None
    project_id: int | None = None
    socratic_mode: bool = False

@router.post("/explain")
async def explain_concept(request: ExplainRequest):
    if not API_KEY:
        return {"content": "Gemini API Key is missing. Please set GEMINI_API_KEY environment variable."}
    
    model = genai.GenerativeModel('gemini-2.5-flash-lite')
    
    prompt = f"""
    You are an expert AI tutor. Explain the concept of '{request.concept}' 
    in the context of the topic '{request.topic}'.
    
    Target Audience: {request.difficulty}
    
    Style:
    - If 'beginner', use simple analogies.
    - If 'intermediate', use standard technical terms.
    - If 'advanced', include mathematical formulations and edge cases.
    - If '5yo', use very simple language and fun examples.
    
    Format: Markdown. Keep it concise (under 300 words).
    """
    
    try:
        response = model.generate_content(prompt)
        return {"content": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/diagram")
async def generate_diagram(request: DiagramRequest):
    if not API_KEY:
        return {"mermaid_code": "graph TD; A[API Key Missing] --> B[Set GEMINI_API_KEY];"}

    model = genai.GenerativeModel('gemini-2.5-flash-lite')
    
    prompt = f"""
    Generate a Mermaid.js diagram code for the concept: '{request.concept}'.
    
    Return ONLY the Mermaid code. No markdown code blocks, no explanations.
    Start with 'graph TD' or 'sequenceDiagram' etc.
    """
    
    try:
        response = model.generate_content(prompt)
        code = response.text.replace("```mermaid", "").replace("```", "").strip()
        return {"mermaid_code": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{topic_id}/{user_id}")
async def get_chat_history(topic_id: int, user_id: int, project_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(models.ChatHistory).filter(models.ChatHistory.user_id == user_id)
    
    if project_id:
        query = query.filter(models.ChatHistory.project_id == project_id)
    else:
        query = query.filter(models.ChatHistory.topic_id == topic_id)
        
    history = query.order_by(models.ChatHistory.timestamp).all()
    
    parsed_history = []
    for h in history:
        if h.role == "model":
            parsed = parse_ai_response(h.content)
            parsed_history.append({"id": h.id, "role": "model", "parts": [h.content], "parsed": parsed})
        else:
            parsed_history.append({"id": h.id, "role": "user", "parts": [h.content]})

    return parsed_history

def parse_ai_response(text: str):
    """
    Parses the AI response to extract special tags and structured data.
    Returns a dict with 'content', 'type', and 'data'.
    """
    import re
    import json

    response_data = {"content": text, "type": "text", "data": None}

    # Check for Flashcards
    if "[SHOW_FLASHCARDS]" in text:
        try:
            # Extract JSON block for flashcards
            json_match = re.search(r'```json\s*(\[.*?\])\s*```', text, re.DOTALL)
            if json_match:
                flashcards_data = json.loads(json_match.group(1))
                response_data["type"] = "flashcard"
                response_data["data"] = flashcards_data
                # Remove the JSON block and tag from the visible content
                clean_text = text.replace("[SHOW_FLASHCARDS]", "").replace(json_match.group(0), "").strip()
                response_data["content"] = clean_text
        except Exception as e:
            print(f"Error parsing flashcards: {e}")

    # Check for Quiz
    elif "[SHOW_QUIZ]" in text:
        try:
            # Extract JSON block for quiz
            json_match = re.search(r'```json\s*(\[.*?\])\s*```', text, re.DOTALL)
            if json_match:
                quiz_data = json.loads(json_match.group(1))
                response_data["type"] = "quiz"
                response_data["data"] = quiz_data
                # Remove the JSON block and tag from the visible content
                clean_text = text.replace("[SHOW_QUIZ]", "").replace(json_match.group(0), "").strip()
                response_data["content"] = clean_text
            else:
                # Fallback if no JSON found
                response_data["type"] = "quiz"
                response_data["content"] = text.replace("[SHOW_QUIZ]", "").strip()
        except Exception as e:
            print(f"Error parsing quiz: {e}")
            response_data["type"] = "quiz"
            response_data["content"] = text.replace("[SHOW_QUIZ]", "").strip()

    # Check for Mermaid Diagram
    elif "```mermaid" in text:
        # We can keep it as text, but maybe frontend wants to know it's a diagram
        # For now, ReactMarkdown handles mermaid if configured, or we can parse it out.
        pass

    return response_data

from fastapi.responses import StreamingResponse
from database import SessionLocal

@router.post("/chat")
async def chat_tutor(request: ChatRequest):
    if not API_KEY:
        return {"error": "API Key missing"}
    
    model = genai.GenerativeModel('gemini-2.5-flash-lite')
    
    system_instruction = "You are a helpful and encouraging AI Tutor."
    if request.socratic_mode:
        system_instruction += " Use the Socratic method: ask guiding questions to help the student discover the answer themselves. Do not give the direct answer unless they are completely stuck."
    else:
        system_instruction += " Explain concepts clearly and concisely. Use analogies where appropriate."
    
    system_instruction += """
    INTERACTIVE TOOLS:
    - If you think the user is ready for a quiz, output exactly: [SHOW_QUIZ] followed immediately by a JSON block.
      Format:
      [SHOW_QUIZ]
      ```json
      [
        {
          "title": "Quiz Title",
          "questions": [
            {
              "question": "Question text?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct_answer": "Option A"
            }
          ]
        }
      ]
      ```
    - If you think the user is ready for a coding challenge, output exactly: [SHOW_CHALLENGE]
    - If the user asks for flashcards or you want to review key terms, output exactly: [SHOW_FLASHCARDS] followed immediately by a JSON block with the flashcards.
      Format:
      [SHOW_FLASHCARDS]
      ```json
      [
        {"front": "Term 1", "back": "Definition 1"},
        {"front": "Term 2", "back": "Definition 2"}
      ]
      ```
    - If you want to show a diagram, output a Mermaid code block (start with ```mermaid).
    - IMPORTANT FOR DIAGRAMS:
      - Use simple node IDs like A, B, C (no special characters or spaces in IDs).
      - ALWAYS enclose node labels in double quotes. Example: A["Login Process"] --> B{"Is Valid?"}
      - CRITICAL: If a label contains parentheses like (text), it MUST be quoted.
        - BAD: A[Object Oriented Programming (OOP)]
        - GOOD: A["Object Oriented Programming (OOP)"]
      - Do not use parentheses inside node IDs. Bad: A(Text). Good: A["Text"]
      - Avoid using special characters like braces or brackets inside the label text if possible, or ensure they are properly quoted.
    - Do not output these tags unless you are sure.
    """
        
    # Fetch Topic or Project Context
    db = SessionLocal()
    context_instruction = ""
    try:
        if request.project_id:
            project = db.query(models.UserProject).filter(models.UserProject.id == request.project_id).first()
            if project:
                context_instruction = f"\n\nCONTEXT:\nYou are helping the user with the project: '{project.title}'.\nDescription: {project.description}\n"
                # Add current step context
                if project.steps and len(project.steps) > project.current_step:
                    current_step = project.steps[project.current_step]
                    context_instruction += f"\nCurrent Step ({project.current_step + 1} of {len(project.steps)}): {current_step.get('title', 'N/A')}\nInstruction: {current_step.get('instruction', 'N/A')}\n"
                    context_instruction += f"\nProject Status: {project.status}\n"
                context_instruction += "\nHelp the user complete this step. Answer their questions about the code or concepts involved.\n"
        elif request.topic_id:
            topic = db.query(models.Topic).filter(models.Topic.id == request.topic_id).first()
            if topic:
                context_instruction = f"\n\nCONTEXT:\nYou are teaching the topic: '{topic.title}'.\nDescription: {topic.description}\nContent Summary: {topic.content[:1000]}...\n" # Truncate content to avoid token limits if necessary, but 1000 chars is safe.
    except Exception as e:
        print(f"Error fetching context: {e}")
    finally:
        db.close()

    system_instruction += context_instruction
        
    prompt = f"{system_instruction}\n\nConversation History:\n"
    for msg in request.history:
        role = msg.get("role", "user").upper()
        parts = msg.get("parts", [""])
        content = parts[0] if parts else ""
        prompt += f"{role}: {content}\n"
    
    prompt += f"USER: {request.message}\nMODEL:"
    
    async def generate():
        full_response = ""
        try:
            # Save User Message immediately
            db = SessionLocal()
            user_msg = models.ChatHistory(
                user_id=request.user_id,
                topic_id=request.topic_id,
                project_id=request.project_id,
                role="user",
                content=request.message
            )
            db.add(user_msg)
            db.commit()
            db.close()

            response = model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text
                    yield chunk.text
            
            # Save AI Message after full generation
            db = SessionLocal()
            ai_msg = models.ChatHistory(
                user_id=request.user_id,
                topic_id=request.topic_id,
                project_id=request.project_id,
                role="model",
                content=full_response
            )
            db.add(ai_msg)
            db.commit()
            db.close()
            
        except Exception as e:
            yield f"Error: {str(e)}"

    return StreamingResponse(generate(), media_type="text/plain")

@router.post("/edit_message")
async def edit_message(request: EditMessageRequest):
    db = SessionLocal()
    # 1. Find the message
    target_msg = db.query(models.ChatHistory).filter(
        models.ChatHistory.id == request.message_id,
        models.ChatHistory.user_id == request.user_id
    ).first()
    
    if not target_msg:
        db.close()
        raise HTTPException(status_code=404, detail="Message not found")
        
    # 2. Update content
    target_msg.content = request.new_content
    
    # 3. Delete subsequent messages
    query = db.query(models.ChatHistory).filter(
        models.ChatHistory.user_id == request.user_id,
        models.ChatHistory.timestamp > target_msg.timestamp
    )
    
    if request.project_id:
        query = query.filter(models.ChatHistory.project_id == request.project_id)
    else:
        query = query.filter(models.ChatHistory.topic_id == request.topic_id)

    query.delete()
    db.commit()
    
    # 4. Regenerate response
    # Re-fetch history up to this message
    history_query = db.query(models.ChatHistory).filter(
        models.ChatHistory.user_id == request.user_id
    )
    
    if request.project_id:
        history_query = history_query.filter(models.ChatHistory.project_id == request.project_id)
    else:
        history_query = history_query.filter(models.ChatHistory.topic_id == request.topic_id)
        
    history = history_query.order_by(models.ChatHistory.timestamp).all()
    
    # Close session before streaming to avoid threading issues, we'll open a new one to save
    history_content = [{"role": msg.role, "content": msg.content} for msg in history]
    db.close()
    
    async def generate():
        full_response = ""
        try:
            model = genai.GenerativeModel('gemini-2.5-flash-lite')
            system_instruction = "You are a helpful and encouraging AI Tutor."
            if request.socratic_mode:
                system_instruction += " Use the Socratic method."
            else:
                system_instruction += " Explain concepts clearly."
                
            system_instruction += """
            INTERACTIVE TOOLS:
            - If you think the user is ready for a quiz, output exactly: [SHOW_QUIZ] followed immediately by a JSON block.
              Format:
              [SHOW_QUIZ]
              ```json
              [
                {
                  "title": "Quiz Title",
                  "questions": [
                    {
                      "question": "Question text?",
                      "options": ["Option A", "Option B", "Option C", "Option D"],
                      "correct_answer": "Option A"
                    }
                  ]
                }
              ]
              ```
            - If you think the user is ready for a coding challenge, output exactly: [SHOW_CHALLENGE]
            - If the user asks for flashcards or you want to review key terms, output exactly: [SHOW_FLASHCARDS] followed immediately by a JSON block with the flashcards.
              Format:
              [SHOW_FLASHCARDS]
              ```json
              [
                {"front": "Term 1", "back": "Definition 1"},
                {"front": "Term 2", "back": "Definition 2"}
              ]
              ```
            - If you want to show a diagram, output a Mermaid code block (start with ```mermaid).
            - IMPORTANT FOR DIAGRAMS:
              - Use simple node IDs like A, B, C (no special characters or spaces in IDs).
              - ALWAYS enclose node labels in double quotes. Example: A["Login Process"] --> B{"Is Valid?"}
              - CRITICAL: If a label contains parentheses like (text), it MUST be quoted.
                - BAD: A[Object Oriented Programming (OOP)]
                - GOOD: A["Object Oriented Programming (OOP)"]
              - Do not use parentheses inside node IDs. Bad: A(Text). Good: A["Text"]
              - Avoid using special characters like braces or brackets inside the label text if possible, or ensure they are properly quoted.
            - Do not output these tags unless you are sure.
            """
            
            # Fetch Topic or Project Context
            db_context = SessionLocal()
            context_instruction = ""
            try:
                if request.project_id:
                    project = db_context.query(models.UserProject).filter(models.UserProject.id == request.project_id).first()
                    if project:
                        context_instruction = f"\n\nCONTEXT:\nYou are helping the user with the project: '{project.title}'.\nDescription: {project.description}\n"
                        # Add current step context
                        if project.steps and len(project.steps) > project.current_step:
                            current_step = project.steps[project.current_step]
                            context_instruction += f"\nCurrent Step ({project.current_step + 1} of {len(project.steps)}): {current_step.get('title', 'N/A')}\nInstruction: {current_step.get('instruction', 'N/A')}\n"
                            context_instruction += f"\nProject Status: {project.status}\n"
                        context_instruction += "\nHelp the user complete this step. Answer their questions about the code or concepts involved.\n"
                elif request.topic_id:
                    topic = db_context.query(models.Topic).filter(models.Topic.id == request.topic_id).first()
                    if topic:
                        context_instruction = f"\n\nCONTEXT:\nYou are teaching the topic: '{topic.title}'.\nDescription: {topic.description}\nContent Summary: {topic.content[:1000]}...\n"
            except Exception as e:
                print(f"Error fetching context: {e}")
            finally:
                db_context.close()

            system_instruction += context_instruction
            
            prompt = f"{system_instruction}\n\nConversation History:\n"
            
            # The 'history' list contains the edited message at the end.
            for msg in history_content[:-1]:
                role = "user" if msg["role"] == "user" else "model"
                prompt += f"{role.upper()}: {msg['content']}\n"
                
            prompt += f"USER: {request.new_content}\nMODEL:"
            
            response = model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text
                    yield chunk.text
            
            # Save New AI Message
            db = SessionLocal()
            ai_msg = models.ChatHistory(
                user_id=request.user_id,
                topic_id=request.topic_id,
                project_id=request.project_id,
                role="model",
                content=full_response
            )
            db.add(ai_msg)
            db.commit()
            db.close()
            
        except Exception as e:
            yield f"Error: {str(e)}"

    return StreamingResponse(generate(), media_type="text/plain")
