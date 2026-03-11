import chromadb
import google.generativeai as genai
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

# Initialize ChromaDB (Persistent)
# We'll store it in a 'chroma_db' folder in the backend directory
CHROMA_PATH = Path(__file__).resolve().parent.parent / "chroma_db"
client = chromadb.PersistentClient(path=str(CHROMA_PATH))
collection = client.get_or_create_collection(name="topics")

def get_embedding(text: str):
    if not API_KEY:
        return [0.0] * 768 # Dummy embedding
    try:
        # Use Gemini to get embeddings
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_document",
            title="Topic Embedding"
        )
        return result['embedding']
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return [0.0] * 768

def add_topic_embedding(topic_id: int, title: str, description: str, content: str):
    # Combine text for better semantic representation
    full_text = f"{title}. {description}. {content[:500]}" # Limit content length
    embedding = get_embedding(full_text)
    
    collection.upsert(
        ids=[str(topic_id)],
        embeddings=[embedding],
        metadatas=[{"title": title, "description": description}],
        documents=[full_text]
    )

def search_topics(query: str, n_results: int = 3):
    if not API_KEY:
        return []
        
    try:
        query_embedding = genai.embed_content(
            model="models/embedding-001",
            content=query,
            task_type="retrieval_query"
        )['embedding']
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        
        # Format results
        formatted_results = []
        if results['ids']:
            for i, topic_id in enumerate(results['ids'][0]):
                formatted_results.append({
                    "id": int(topic_id),
                    "title": results['metadatas'][0][i]['title'],
                    "description": results['metadatas'][0][i]['description'],
                    "distance": results['distances'][0][i] if results['distances'] else 0
                })
        return formatted_results
    except Exception as e:
        print(f"Error searching topics: {e}")
        return []
