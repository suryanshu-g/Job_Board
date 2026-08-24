import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: uuid.UUID
    title: Optional[str] = None
    company_name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    employment_type: Optional[str] = None
    schedule_type: Optional[str] = None
    query_category: Optional[str] = None
    skills: Optional[List[str]] = None
    min_experience: Optional[int] = None
    max_experience: Optional[int] = None
    posted_at: Optional[datetime] = None
    source_platform: Optional[str] = None
    cross_posted_platforms: Optional[List[str]] = None
    apply_link: Optional[str] = None
    salary_from: Optional[float] = None
    salary_to: Optional[float] = None
    salary_source: Optional[str] = None
    company_rating: Optional[float] = None
    company_rating_source: Optional[str] = None
    remote_type: Optional[str] = None
    company_logo_url: Optional[str] = None


class PaginatedJobs(BaseModel):
    total: int
    page: int
    page_size: int
    results: List[JobOut]