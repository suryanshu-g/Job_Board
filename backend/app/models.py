import uuid

from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Numeric,
    Boolean,
    DateTime,
    ARRAY,
)
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector

from app.database import Base


class Job(Base):
    __tablename__ = "jobs"

    job_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text)
    company_name = Column(Text)
    location = Column(Text)
    description = Column(Text)
    formatted_description = Column(Text)
    domain = Column(Text)
    employment_type = Column(Text)
    schedule_type = Column(Text)
    query_category = Column(Text)
    skills = Column(ARRAY(Text))
    min_experience = Column(Integer)
    max_experience = Column(Integer)
    posted_at = Column(DateTime)
    source_platform = Column(Text)
    cross_posted_platforms = Column(ARRAY(Text))
    apply_link = Column(Text)
    salary_from = Column(Numeric)
    salary_to = Column(Numeric)
    salary_source = Column(Text)
    company_rating = Column(Numeric)
    company_rating_source = Column(Text)
    remote_type = Column(Text)
    company_logo_url = Column(Text)
    title_is_slug = Column(Boolean)
    description_needs_enrichment = Column(Boolean)
    skills_needs_enrichment = Column(Boolean)
    skills_enrichment_method = Column(Text)
    embedding = Column(Vector(384))