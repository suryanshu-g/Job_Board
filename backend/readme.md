# AI-Powered Job Board — Backend

FastAPI backend for the AI-Powered Job Board: job aggregation, AI-driven skill
tagging, resume-based recommendations, semantic search, and a conversational
job-fit assistant, built on a real dataset of 46,189 deduplicated job postings.

## Tech Stack

- **Framework:** FastAPI + Uvicorn
- **Database:** PostgreSQL with the pgvector extension (via SQLAlchemy)
- **Resume parsing:** pdfplumber (PDF only)
- **Skill extraction:** keyword/regex matching, with Gemini API (free tier)
  as a fallback for records the keyword pass can't resolve
- **Semantic search:** local `all-MiniLM-L6-v2` embedding model
  (sentence-transformers), 384-dim vectors, pgvector cosine distance
- **Conversational assistant:** Gemini API, called with the end user's own
  API key (never logged or persisted)

## Project Structure

```
backend/
├── app/                    # Live application
│   ├── main.py              # FastAPI app, CORS middleware
│   ├── config.py            # Environment/settings (pydantic-settings)
│   ├── database.py          # SQLAlchemy engine/session
│   ├── models.py            # Job ORM model
│   ├── routers/              # jobs, resume, recommend, assistant
│   ├── schemas/               # Pydantic response/request models
│   └── services/               # resume_parser, recommender, gemini_client
├── data_pipeline/           # One-time data ingestion & enrichment scripts
│   ├── ingest.py               # Phase 1: clean, dedupe, load raw dataset
│   ├── enrich_skills.py         # Skill enrichment dry-run/testing
│   ├── enrich_skills_gemini.py   # Gemini fallback batch enrichment
│   ├── enrich_skills_write.py     # Keyword-pass batch write
│   ├── generate_embeddings.py      # Populate embedding column
│   ├── alter_embedding_dim.py       # Schema migration for embedding dims
│   ├── verify_embeddings.py          # pgvector similarity spot-checks
│   ├── verify_gemini_batch.py         # Enrichment progress verification
│   └── investigate_search.py           # Semantic search relevance diagnostics
├── requirements.txt
├── schema.sql               # Full Postgres schema
├── sanity_check.py          # Automated smoke tests against a live server
├── docker-compose.yml       # Local Postgres + pgvector container
├── .env.example
└── README_matching_notes.md # Design notes: matching, search, known limitations
```

## Setup

### 1. Database

Run Postgres with pgvector locally via Docker:

```bash
docker-compose up -d
```

Or point `DATABASE_URL` at any Postgres instance with the pgvector extension
enabled (e.g. Supabase in production).

Load the schema and data using the scripts in `data_pipeline/` — see
`README_matching_notes.md` for the full ingestion/enrichment pipeline
description, or run `data_pipeline/ingest.py` directly against the raw
dataset.

### 2. Environment

```bash
cp .env.example .env
```

Fill in real values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string, e.g. `postgresql+psycopg2://user:pass@localhost:5433/jobboard` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins for CORS (defaults to `http://localhost:5173`) |
| `GEMINI_DEV_API_KEYS` | Optional — comma-separated Gemini API keys, only used by the `data_pipeline/` scripts for skill enrichment, not by the live app |

### 3. Install & run

```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Server runs at `http://127.0.0.1:8000`. Interactive docs at `/docs`.

### 4. Verify

```bash
python sanity_check.py
```

Runs automated checks against the live server and real database
(`GET /jobs`, `GET /jobs/{id}`, `POST /recommend`, `GET /jobs/search`).
`POST /resume/upload` and `POST /assistant/chat` require manual testing via
`/docs` (a real PDF, and a real Gemini API key, respectively).

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/jobs` | Paginated job listing, filterable by `domain`, `source_platform`, `query_category`, and `skill` (repeatable, OR-matched) |
| `GET` | `/jobs/search` | Semantic search — embeds a free-text query and returns nearest jobs by pgvector cosine distance |
| `GET` | `/jobs/platforms` | Distinct list of real `source_platform` values, for populating a filter dropdown |
| `GET` | `/jobs/{job_id}` | Full detail for a single job |
| `POST` | `/resume/upload` | Upload a PDF resume; extracts text and matches skills (session-only, no DB write) |
| `POST` | `/recommend` | Skill-based job recommendations from a resume's skill list, with explainable `matched_skills`/`missing_skills`/`reason` per result |
| `POST` | `/assistant/chat` | Conversational job-fit analysis via Gemini, using the caller's own API key (sent via `X-Gemini-Api-Key` header) |

## Data Pipeline Summary

The `jobs` table was built from a raw 56,769-record dataset, cleaned and
deduplicated down to 46,189 records. Skill data was enriched in two stages —
free keyword extraction first (resolves ~36% of previously-empty records at
no cost), with Gemini API used only as a fallback for what the keyword pass
missed. Job description embeddings (for semantic search) were generated
locally via `all-MiniLM-L6-v2`, chosen over a larger model for CPU-inference
speed. Full details, real numbers, and known trade-offs are documented in
`README_matching_notes.md`.

## Known Limitations

See `README_matching_notes.md` for:
- Current skill-enrichment coverage (some records remain enrichment-pending
  due to Gemini free-tier daily quota — documented, not hidden)
- Semantic search relevance trade-offs with the 384-dim local embedding model