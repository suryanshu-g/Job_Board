from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import jobs, resume, recommend, assistant

app = FastAPI(title="AI-Powered Job Board API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(resume.router)
app.include_router(recommend.router)
app.include_router(assistant.router)


@app.get("/")
def root():
    return {"status": "ok"}