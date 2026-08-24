from pydantic import BaseModel
from typing import List, Optional
import uuid


class ChatRequest(BaseModel):
    job_ids: List[uuid.UUID]
    resume_profile: dict
    message: str


class ChatResponse(BaseModel):
    reply: str
