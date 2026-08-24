from sqlalchemy import text
from app.database import engine

conn = engine.connect()
# Drop and recreate with new dimension — safe since embedding is currently
# all NULL (no successful commits happened before this run was killed)
conn.execute(text("ALTER TABLE jobs DROP COLUMN embedding;"))
conn.execute(text("ALTER TABLE jobs ADD COLUMN embedding vector(384);"))
conn.commit()
print("embedding column altered to vector(384)")
conn.close()