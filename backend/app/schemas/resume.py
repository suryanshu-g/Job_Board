from pydantic import BaseModel
from typing import List, Optional
import uuid


class ResumeProfile(BaseModel):
    raw_text_length: int
    skills: List[str]


class RecommendRequest(BaseModel):
    skills: List[str]
    domain: Optional[str] = None
    query_category: Optional[str] = None
    limit: int = 10


class RecommendedJob(BaseModel):
    job_id: uuid.UUID
    title: Optional[str] = None
    company_name: Optional[str] = None
    domain: Optional[str] = None
    query_category: Optional[str] = None
    score: float
    matched_skills: List[str]
    missing_skills: List[str]
    reason: str


class RecommendResponse(BaseModel):
    results: List[RecommendedJob]
