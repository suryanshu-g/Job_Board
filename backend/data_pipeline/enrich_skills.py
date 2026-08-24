"""
Phase 3, Part A — Skill enrichment for jobs with empty/placeholder skills.
Standalone script, run manually. Does not touch the live API.

Step 3: DRY RUN — keyword extraction only, no DB writes yet.
Step 4: cross-reference zero-match records against description_needs_enrichment.
"""
from sqlalchemy import select
from app.database import SessionLocal
from app.models import Job
from app.services.resume_parser import extract_skills

KEYWORD_THRESHOLD = 2  # fewer than this many matches -> flag for Gemini fallback


def dry_run_keyword_extraction():
    db = SessionLocal()
    try:
        jobs = db.execute(
            select(Job.job_id, Job.title, Job.description)
            .where(Job.skills_needs_enrichment == True)
        ).all()

        resolved_by_keyword = 0
        needs_gemini = 0
        zero_matches = 0

        for job_id, title, description in jobs:
            skills = extract_skills(description or "")
            if len(skills) >= KEYWORD_THRESHOLD:
                resolved_by_keyword += 1
            else:
                needs_gemini += 1
                if len(skills) == 0:
                    zero_matches += 1

        print(f"Total needing enrichment: {len(jobs)}")
        print(f"Resolved by keyword pass (>= {KEYWORD_THRESHOLD} matches): {resolved_by_keyword}")
        print(f"Needs Gemini fallback (< {KEYWORD_THRESHOLD} matches): {needs_gemini}")
        print(f"  of which zero matches found: {zero_matches}")
    finally:
        db.close()


def check_zero_match_overlap():
    db = SessionLocal()
    try:
        jobs = db.execute(
            select(Job.job_id, Job.description, Job.description_needs_enrichment)
            .where(Job.skills_needs_enrichment == True)
        ).all()

        zero_match_records = []
        for job_id, description, desc_flag in jobs:
            skills = extract_skills(description or "")
            if len(skills) == 0:
                zero_match_records.append((job_id, desc_flag, len(description or "")))

        flagged_thin = sum(1 for _, flag, _ in zero_match_records if flag)
        lengths = sorted(l for _, _, l in zero_match_records)
        avg_len = sum(lengths) / len(lengths)

        print(f"\nZero keyword-match records: {len(zero_match_records)}")
        print(f"  of which also flagged description_needs_enrichment: {flagged_thin}")
        print(f"  average description length (chars): {avg_len:.0f}")
        print(f"  shortest: {lengths[0]}, longest: {lengths[-1]}, median: {lengths[len(lengths)//2]}")
    finally:
        db.close()


if __name__ == "__main__":
    dry_run_keyword_extraction()
    check_zero_match_overlap()