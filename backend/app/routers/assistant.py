from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models import Job
from app.schemas.assistant import ChatRequest, ChatResponse
from app.services.gemini_client import call_gemini, GeminiError

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    x_gemini_api_key: str = Header(..., alias="X-Gemini-Api-Key"),
):
    stmt = select(Job).where(Job.job_id.in_(payload.job_ids))
    jobs = db.execute(stmt).scalars().all()

    if not jobs:
        raise HTTPException(status_code=404, detail="None of the provided job IDs were found")

    job_context = "\n\n".join(
        f"Job: {j.title} at {j.company_name}\n"
        f"Description: {(j.description or '')[:1000]}"
        for j in jobs
    )

    resume_skills = payload.resume_profile.get("skills", [])
    resume_summary = f"Candidate skills: {', '.join(resume_skills)}"

    prompt = (
        f"You are a helpful job-matching assistant.\n\n"
        f"{resume_summary}\n\n"
        f"Relevant job(s):\n{job_context}\n\n"
        f"User question: {payload.message}\n\n"
        f"Answer clearly and concisely based on the job details and candidate profile above."
    )

    try:
        reply = await call_gemini(x_gemini_api_key, prompt)
    except GeminiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    return ChatResponse(reply=reply)
