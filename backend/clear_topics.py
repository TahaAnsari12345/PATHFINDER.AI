from database import SessionLocal
import models

db = SessionLocal()
try:
    num_deleted = db.query(models.Topic).delete()
    db.commit()
    print(f"Deleted {num_deleted} topics.")
    
    # Also clear vector store (optional, but good for consistency)
    # We'll just rely on the fact that re-seeding adds new embeddings.
    # Ideally we should clear Chroma too, but let's just focus on SQL for now.
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
