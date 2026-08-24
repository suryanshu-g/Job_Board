"""
Phase 3, Part A — Step 7: batch-write keyword-resolved skills to Postgres.
Only updates records where keyword extraction finds >= KEYWORD_THRESHOLD skills.
Commits every BATCH_SIZE records so a crash partway through doesn't lose progress.
Safe to re-run: only touches records still flagged skills_needs_enrichment = True.
"""
from sqlalchemy import select
from app.database import SessionLocal
from app.models import Job
from app.services.resume_parser import extract_skills

KEYWORD_THRESHOLD = 2
BATCH_SIZE = 200


def main():
    db = SessionLocal()
    try:
        jobs = db.execute(
            select(Job).where(Job.skills_needs_enrichment == True)
        ).scalars().all()

        print(f"Records to process: {len(jobs)}")

        updated_count = 0
        skipped_count = 0
        batch_counter = 0

        for job in jobs:
            skills = extract_skills(job.description or "")
            if len(skills) >= KEYWORD_THRESHOLD:
                job.skills = skills
                job.skills_enrichment_method = "keyword"
                job.skills_needs_enrichment = False
                updated_count += 1
                batch_counter += 1

                if batch_counter >= BATCH_SIZE:
                    db.commit()
                    print(f"  committed batch, {updated_count} updated so far")
                    batch_counter = 0
            else:
                skipped_count += 1

        db.commit()  # final partial batch

        print(f"\nDone. Updated (keyword-resolved): {updated_count}")
        print(f"Skipped (left for Gemini fallback): {skipped_count}")
    finally:
        db.close()


if __name__ == "__main__":
    main()