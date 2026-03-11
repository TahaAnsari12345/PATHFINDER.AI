import sqlite3

conn = sqlite3.connect('pathfinder.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE chat_history ADD COLUMN project_id INTEGER REFERENCES user_projects(id)")
    print("Column project_id added successfully.")
except sqlite3.OperationalError as e:
    print(f"Error (column might already exist): {e}")

conn.commit()
conn.close()
