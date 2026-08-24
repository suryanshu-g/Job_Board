from sqlalchemy import select, func
from app.database import SessionLocal
from app.models import Job

db = SessionLocal()
try:
    counts = {}
    for method in ["keyword", "gemini", "unresolved"]:
        counts[method] = db.execute(
            select(func.count()).select_from(Job).where(Job.skills_enrichment_method == method)
        ).scalar_one()

    still_needs = db.execute(
        select(func.count()).select_from(Job).where(Job.skills_needs_enrichment == True)
    ).scalar_one()

    print(f"keyword: {counts['keyword']}")
    print(f"gemini: {counts['gemini']}")
    print(f"unresolved: {counts['unresolved']}")
    print(f"still needs enrichment (remaining for future runs): {still_needs}")

    print("\n--- 3 sample gemini-resolved records ---")
    samples = db.execute(
        select(Job.title, Job.skills)
        .where(Job.skills_enrichment_method == "gemini")
        .limit(3)
    ).all()
    for title, skills in samples:
        print(f"\n{title}\n  -> {skills}")
finally:
    db.close()