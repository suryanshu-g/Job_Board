from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.orm import load_only

from app.models import Job

# Fallback scores (domain/category-only matches, no real skills data) are
# capped well below the realistic range of genuine skill-based Jaccard
# scores, so a job with zero skill data can never outrank a job with
# actual skill overlap — even a weak one.
FALLBACK_DOMAIN_SCORE = 0.15
FALLBACK_CATEGORY_SCORE = 0.15


def score_job_by_skills(job: Job, resume_skills: set[str]) -> tuple[float, list[str], list[str]]:
    """
    Returns (score, matched_skills, missing_skills) for a job with real skills data.
    Score = Jaccard similarity: matched skills / (union of resume + job skills).
    This rewards broad overlap rather than letting a job with only 1-2 listed
    skills score a perfect 1.0 just by matching one of them.
    """
    job_skills = set(job.skills or [])
    job_skills_lower = {s.lower() for s in job_skills}
    resume_skills_lower = {s.lower() for s in resume_skills}

    matched = resume_skills_lower & job_skills_lower
    missing = job_skills_lower - resume_skills_lower
    union = resume_skills_lower | job_skills_lower

    score = len(matched) / len(union) if union else 0.0

    return score, sorted(matched), sorted(missing)


def recommend_jobs(
    db: Session,
    resume_skills: List[str],
    domain: Optional[str] = None,
    query_category: Optional[str] = None,
    limit: int = 10,
) -> List[dict]:
    resume_skills_set = set(resume_skills)

    stmt = select(Job).options(
        load_only(
            Job.job_id,
            Job.title,
            Job.company_name,
            Job.domain,
            Job.query_category,
            Job.skills,
            Job.skills_needs_enrichment,
        )
    )
    if domain:
        stmt = stmt.where(Job.domain == domain)
    candidates = db.execute(stmt).scalars().all()

    results = []
    for job in candidates:
        if job.skills_needs_enrichment or not job.skills:
            # Degrade gracefully: no real skills data, so fall back to
            # domain/query_category overlap instead of excluding the job.
            # Scored well below any genuine skill match — see constants above.
            reason_parts = []
            fallback_score = 0.0
            if domain and job.domain == domain:
                fallback_score += FALLBACK_DOMAIN_SCORE
                reason_parts.append(f"matches your target domain ({job.domain})")
            if query_category and job.query_category == query_category:
                fallback_score += FALLBACK_CATEGORY_SCORE
                reason_parts.append(f"matches role category ({job.query_category})")

            if fallback_score == 0.0:
                continue  # no signal at all for this job, skip it

            reason = (
                "Domain/category match only, no skill data available for this job. It "
                + " and ".join(reason_parts) + "."
            )
            results.append({
                "job": job,
                "score": fallback_score,
                "matched_skills": [],
                "missing_skills": [],
                "reason": reason,
            })
        else:
            score, matched, missing = score_job_by_skills(job, resume_skills_set)
            if score == 0.0:
                continue  # no overlap at all, not a useful recommendation
            reason = f"Matches {len(matched)} of your skills: {', '.join(matched[:5])}."
            results.append({
                "job": job,
                "score": score,
                "matched_skills": matched,
                "missing_skills": missing,
                "reason": reason,
            })

    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:limit]