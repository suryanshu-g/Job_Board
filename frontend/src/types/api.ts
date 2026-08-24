// ---- Jobs (schemas/job.py) ----

export interface Job {
  job_id: string
  title: string | null
  company_name: string | null
  location: string | null
  description: string | null
  domain: string | null
  employment_type: string | null
  schedule_type: string | null
  query_category: string | null
  skills: string[] | null
  min_experience: number | null
  max_experience: number | null
  posted_at: string | null
  source_platform: string | null
  cross_posted_platforms: string[] | null
  apply_link: string | null
  salary_from: number | null
  salary_to: number | null
  salary_source: string | null
  company_rating: number | null
  company_rating_source: string | null
  remote_type: "Onsite" | "Remote" | "Hybrid" | null
  company_logo_url: string | null
}

export interface PaginatedJobs {
  total: number
  page: number
  page_size: number
  results: Job[]
}

// ---- Resume / Recommend (schemas/resume.py) ----

export interface ResumeProfile {
  raw_text_length: number
  skills: string[]
}

export interface RecommendRequest {
  skills: string[]
  domain?: string | null
  query_category?: string | null
  limit?: number
}

export interface RecommendedJob {
  job_id: string
  title: string | null
  company_name: string | null
  domain: string | null
  query_category: string | null
  score: number
  matched_skills: string[]
  missing_skills: string[]
  reason: string
}

export interface RecommendResponse {
  results: RecommendedJob[]
}

// ---- Assistant chat (schemas/assistant.py) ----

export interface ChatRequest {
  job_ids: string[]
  resume_profile: ResumeProfile
  message: string
}

export interface ChatResponse {
  reply: string
}

// ---- Gemini error shape, mirrors gemini_client.py's GeminiError ----
// Backend can raise 400, 401, 429, 502, or (via the assistant router) 404,
// or fall through to GeminiError's generic `else` branch with any other
// status code — so the frontend handler should treat this as open-ended,
// not just the four documented cases.

export interface ApiErrorResponse {
  detail: string
}