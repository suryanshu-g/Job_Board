import uuid as uuid_lib
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.models import Job
from app.schemas.job import PaginatedJobs, JobOut

router = APIRouter(prefix="/jobs", tags=["jobs"])

_search_model = None

def get_search_model():
    global _search_model
    if _search_model is None:
        from sentence_transformers import SentenceTransformer
        _search_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _search_model


@router.get("", response_model=PaginatedJobs)
def list_jobs(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source_platform: Optional[str] = None,
    domain: Optional[str] = None,
    query_category: Optional[str] = None,
    skill: Optional[List[str]] = Query(None, description="Filter jobs that contain ANY of these skills"),
):
    stmt = select(Job)

    if source_platform:
        stmt = stmt.where(Job.source_platform == source_platform)
    if domain:
        stmt = stmt.where(Job.domain == domain)
    if query_category:
        stmt = stmt.where(Job.query_category == query_category)
    if skill:
        # Postgres array-overlap operator (&&): matches if Job.skills shares
        # at least one element with the selected list. Job.skills is a generic
        # SQLAlchemy ARRAY column (not the postgresql-dialect ARRAY), so we use
        # .op("&&") to inject the raw Postgres operator directly rather than
        # relying on a comparator method that only exists on the dialect-specific type.
        stmt = stmt.where(Job.skills.op("&&")(skill))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar_one()

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    results = db.execute(stmt).scalars().all()

    return PaginatedJobs(total=total, page=page, page_size=page_size, results=results)


@router.get("/search", response_model=PaginatedJobs)
def search_jobs(
    q: str = Query(..., min_length=1, description="Natural language search query"),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query_embedding = get_search_model().encode(q).tolist()

    stmt = (
        select(Job)
        .where(Job.embedding.isnot(None))
        .order_by(Job.embedding.cosine_distance(query_embedding))
    )

    count_stmt = select(func.count()).select_from(
        select(Job).where(Job.embedding.isnot(None)).subquery()
    )
    total = db.execute(count_stmt).scalar_one()

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    results = db.execute(stmt).scalars().all()

    return PaginatedJobs(total=total, page=page, page_size=page_size, results=results)


@router.get("/platforms", response_model=list[str])
def list_platforms(db: Session = Depends(get_db)):
    stmt = (
        select(Job.source_platform)
        .where(Job.source_platform.isnot(None))
        .distinct()
        .order_by(Job.source_platform)
    )
    return db.execute(stmt).scalars().all()


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: uuid_lib.UUID, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job