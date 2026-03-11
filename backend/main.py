from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
import models
from routers import auth, topics, progress, ai_tutor, projects, search

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AIML Pathfinder API")

import os

# CORS
origins = [
    "http://localhost:3000", # Local development
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(topics.router)
app.include_router(progress.router)
app.include_router(ai_tutor.router)
app.include_router(projects.router)
app.include_router(search.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to AIML Pathfinder API"}
 
