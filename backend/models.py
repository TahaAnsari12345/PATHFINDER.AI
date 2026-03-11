from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    progress = relationship("UserProgress", back_populates="user")
    activity_logs = relationship("ActivityLog", back_populates="user")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    content = Column(Text) # Markdown content or JSON structure
    difficulty = Column(String) # beginner, intermediate, advanced
    prerequisites = Column(JSON) # List of topic IDs
    estimated_time = Column(Integer) # Minutes
    quiz_data = Column(JSON, nullable=True) # List of questions
    challenge_data = Column(JSON, nullable=True) # Coding challenge details
    flashcards = Column(JSON, nullable=True) # List of {front: str, back: str}

class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"))
    status = Column(String, default="locked") # locked, unlocked, in-progress, completed
    score = Column(Integer, default=0)
    last_accessed = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="progress")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String) # login, complete_topic, quiz_attempt
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(JSON, nullable=True)

    user = relationship("User", back_populates="activity_logs")

class UserProject(Base):
    __tablename__ = "user_projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    steps = Column(JSON) # List of steps: {"title": "...", "instruction": "..."}
    current_step = Column(Integer, default=0)
    code_files = Column(JSON, default={}) # {"main.py": "print('hello')"}
    status = Column(String, default="in-progress") # in-progress, completed

    user = relationship("User", back_populates="projects")

    user = relationship("User", back_populates="projects")

class UserStreak(Base):
    __tablename__ = "user_streaks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    current_streak = Column(Integer, default=0)
    last_activity_date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="streak")

class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    badge_name = Column(String)
    awarded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="badges")

User.projects = relationship("UserProject", back_populates="user")
User.streak = relationship("UserStreak", uselist=False, back_populates="user")
User.badges = relationship("UserBadge", back_populates="user")

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("user_projects.id"), nullable=True)
    role = Column(String) # user, model
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chat_history")
    topic = relationship("Topic")
    project = relationship("UserProject")

User.chat_history = relationship("ChatHistory", back_populates="user")
