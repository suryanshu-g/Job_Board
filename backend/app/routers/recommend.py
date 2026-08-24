from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.resume import RecommendRequest, RecommendResponse, RecommendedJob
from app.services.recommender import recommend_jobs

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.post("", response_model=RecommendResponse)
def recommend(payload: RecommendRequest, db: Session = Depends(get_db)):
    raw_results = recommend_jobs(
        db=db,
        resume_skills=payload.skills,
        domain=payload.domain,
        query_category=payload.query_category,
        limit=payload.limit,
    )

    results = [
        RecommendedJob(
            job_id=r["job"].job_id,
            title=r["job"].title,
            company_name=r["job"].company_name,
            domain=r["job"].domain,
            query_category=r["job"].query_category,
            score=r["score"],
            matched_skills=r["matched_skills"],
            missing_skills=r["missing_skills"],
            reason=r["reason"],
        )
        for r in raw_results
    ]

    return RecommendResponse(results=results)