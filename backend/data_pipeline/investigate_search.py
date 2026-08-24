"""
Diagnostic script — Investigate semantic search relevance for the
"remote entry level sql job" query. Read-only, no DB writes.
"""
from sqlalchemy import select
from sentence_transformers import SentenceTransformer
from app.database import SessionLocal
from app.models import Job

model = SentenceTransformer("all-MiniLM-L6-v2")

QUERIES = [
    "remote entry-level python roles",
    "senior data science jobs with machine learning",
    "remote entry level sql job",
]


def run_query(query, db, limit=10):
    query_embedding = model.encode(query).tolist()
    stmt = (
        select(Job.title, Job.skills, Job.description, Job.embedding.cosine_distance(query_embedding).label("distance"))
        .where(Job.embedding.isnot(None))
        .order_by("distance")
        .limit(limit)
    )
    return db.execute(stmt).all()


def main():
    db = SessionLocal()
    try:
        for query in QUERIES:
            print(f"\n{'='*70}\nQUERY: {query!r}\n{'='*70}")
            results = run_query(query, db)
            for i, (title, skills, description, distance) in enumerate(results):
                print(f"{i+1}. dist={distance:.4f}  {title}")
                print(f"   skills: {skills}")
                if i == 0 and "sql" in query.lower():
                    # Print full description for the top result of the SQL query specifically
                    print(f"\n   --- FULL DESCRIPTION (top result) ---\n{description}\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()