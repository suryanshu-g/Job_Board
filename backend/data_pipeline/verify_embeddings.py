from sqlalchemy import select, func
from app.database import SessionLocal
from app.models import Job

db = SessionLocal()
try:
    total = db.execute(select(func.count()).select_from(Job)).scalar_one()
    non_null = db.execute(
        select(func.count()).select_from(Job).where(Job.embedding.isnot(None))
    ).scalar_one()
    print(f"Total records: {total}")
    print(f"Records with embedding populated: {non_null}")

    # Pick a real job, find its nearest neighbors by embedding similarity
    sample = db.execute(select(Job).limit(1)).scalar_one()
    print(f"\nQuery job: {sample.title}")
    print(f"Description snippet: {(sample.description or '')[:150]}")

    neighbors = db.execute(
        select(Job.title, Job.embedding.cosine_distance(sample.embedding).label("distance"))
        .where(Job.job_id != sample.job_id)
        .order_by("distance")
        .limit(5)
    ).all()

    print("\n--- 5 nearest neighbors by embedding similarity ---")
    for title, distance in neighbors:
        print(f"  {distance:.4f}  {title}")
finally:
    db.close()