from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.resume_parser import parse_resume
from app.schemas.resume import ResumeProfile

router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("/upload", response_model=ResumeProfile)
async def upload_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        profile = parse_resume(file_bytes)
    except Exception:
        raise HTTPException(status_code=422, detail="Could not parse the uploaded PDF")

    return profile