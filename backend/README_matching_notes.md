## Matching Method: Keyword Overlap + Embedding-Based Semantic Search

### `POST /recommend` — Skill-based matching with graceful fallback

`POST /recommend` ranks jobs using **Jaccard similarity on skill sets** —
the size of the intersection between the candidate's resume skills and a
job's listed skills, divided by the size of their union. This gives every
recommendation a natural, explainable breakdown: `matched_skills`,
`missing_skills`, and a plain-language `reason` string showing exactly
which skills matched. This was kept as the primary recommendation
mechanism even after Phase 3's embeddings landed, because explainability
matters more here than raw semantic recall — a candidate wants to know
*why* a job was recommended, not just that it scored high.

### How it degrades for jobs with missing skills data

Skill enrichment (Phase 3) resolved the majority of jobs that originally
had no skills data, via a hybrid keyword-extraction + Gemini LLM pipeline
(see `README_phase3_notes.md` for full numbers). A remaining subset is
still pending enrichment due to free-tier API quota limits, and a small
number of jobs have genuinely thin descriptions with no extractable
skills at all. For any job without real skills data, `recommend_jobs()`
falls back to a coarser signal rather than excluding the job entirely:

- `+0.15` if the job's `domain` matches the candidate's requested domain
- `+0.15` if the job's `query_category` matches the candidate's requested
  category
- If neither matches, the job is dropped from results (no signal at all)

These fallback scores (capped at 0.3 total) are deliberately kept well
below the realistic range of genuine skill-based Jaccard scores, so a job
with zero real skill data can never outrank a job with actual skill
overlap — even a weak one. Fallback-matched jobs are clearly labeled in
their `reason` string ("Domain/category match only, no skill data
available for this job...") so the frontend/user always knows whether a
recommendation is a real skill-based match or a coarser domain-level
guess.

### `GET /jobs/search` — Semantic search via embeddings

Separately from `/recommend`, `GET /jobs/search?q=<query>` supports free-text
natural-language search using embeddings. All 46,189 job descriptions are
embedded via a local `all-MiniLM-L6-v2` model (384-dim, stored in the
`embedding` column as a pgvector `VECTOR(384)`), and search queries are
embedded the same way at request time, then matched via cosine distance.
This is a distinct code path from `/recommend` — search finds jobs matching
a free-text description, while `/recommend` matches a candidate's specific
skill set against job skill data with full explainability.

### Known limitation

Skill extraction (both from resumes and from job postings) uses a fixed
keyword list matched via regex, not semantic/NLP-based matching for the
keyword-resolved portion of jobs. "ML" and "Machine Learning" are treated
as different strings unless both happen to literally appear. Gemini-resolved
records don't have this limitation, since the LLM extracts skills in
natural language rather than exact string matching.