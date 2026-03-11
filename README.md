# PATHFINDER.AI
AI Powered Personalized Learning Platform

Setup Instructions
Prerequisites
Node.js and npm
Python 3.8+
Google Gemini API Key
Backend Setup
Navigate to the backend directory:

cd backend
Create a virtual environment:

python -m venv venv
Activate the virtual environment:

Windows: venv\Scripts\activate
Unix/MacOS: source venv/bin/activate
Install dependencies:

pip install -r requirements.txt
Create a .env file in the root directory (parent of backend) and add your API key:

GEMINI_API_KEY=your_api_key_here
Run the server:

uvicorn main:app --reload
The backend will be available at http://localhost:8000.

Frontend Setup
Navigate to the frontend directory:

cd frontend
Install dependencies:

npm install
Run the development server:

npm run dev
The application will be available at http://localhost:3000.
