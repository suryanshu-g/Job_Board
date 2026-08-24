import type {
  PaginatedJobs,
  Job,
  ResumeProfile,
  RecommendRequest,
  RecommendResponse,
  ChatRequest,
  ChatResponse,
  ApiErrorResponse,
} from "@/types/api"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

// Generic helper: parses FastAPI's { detail: "..." } error shape on failure,
// falls back to a generic message if the body isn't JSON or doesn't match.
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body: ApiErrorResponse = await response.json()
      if (body.detail) message = body.detail
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(response.status, message)
  }
  return response.json()
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// ---- GET /jobs ----

export interface FetchJobsParams {
  page?: number
  page_size?: number
  source_platform?: string
  domain?: string
  query_category?: string
  skills?: string[] // sent as repeated ?skill=X&skill=Y params (OR logic on backend)
}

export async function fetchJobs(params: FetchJobsParams = {}): Promise<PaginatedJobs> {
  const query = new URLSearchParams()
  const { skills, ...rest } = params

  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value))
  })

  if (skills) {
    skills.forEach((s) => query.append("skill", s))
  }

  const response = await fetch(`${BASE_URL}/jobs?${query.toString()}`)
  return handleResponse<PaginatedJobs>(response)
}

// ---- GET /jobs/search ----

export interface SearchJobsParams {
  q: string
  page?: number
  page_size?: number
}

export async function searchJobs(params: SearchJobsParams): Promise<PaginatedJobs> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value))
  })
  const response = await fetch(`${BASE_URL}/jobs/search?${query.toString()}`)
  return handleResponse<PaginatedJobs>(response)
}

// ---- GET /jobs/platforms ----

export async function fetchPlatforms(): Promise<string[]> {
  const response = await fetch(`${BASE_URL}/jobs/platforms`)
  return handleResponse<string[]>(response)
}

// ---- GET /jobs/{job_id} ----

export async function fetchJobById(jobId: string): Promise<Job> {
  const response = await fetch(`${BASE_URL}/jobs/${jobId}`)
  return handleResponse<Job>(response)
}

// ---- POST /resume/upload ----

export async function uploadResume(file: File): Promise<ResumeProfile> {
  const formData = new FormData()
  formData.append("file", file)
  const response = await fetch(`${BASE_URL}/resume/upload`, {
    method: "POST",
    body: formData,
  })
  return handleResponse<ResumeProfile>(response)
}

// ---- POST /recommend ----
// Deliberately takes only `skills` (+ optional filters), never the full
// ResumeProfile — /recommend and /assistant/chat want different shapes.

export async function getRecommendations(
  payload: RecommendRequest
): Promise<RecommendResponse> {
  const response = await fetch(`${BASE_URL}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse<RecommendResponse>(response)
}

// ---- POST /assistant/chat ----
// Takes the user's own Gemini key, entered in the UI, sent only for this
// request — never stored. Wants the FULL resume_profile, unlike /recommend.

export async function sendChatMessage(
  payload: ChatRequest,
  geminiApiKey: string
): Promise<ChatResponse> {
  const response = await fetch(`${BASE_URL}/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gemini-Api-Key": geminiApiKey,
    },
    body: JSON.stringify(payload),
  })
  return handleResponse<ChatResponse>(response)
}

// ---- Gemini-specific error messaging for the assistant chat UI ----
// Mirrors gemini_client.py's GeminiError status codes, plus the 404
// (no matching job IDs) the assistant router itself can raise, plus a
// catch-all for anything else GeminiError's `else` branch might send.

export interface ChatErrorInfo {
  message: string
  shouldPromptForNewKey: boolean
}

export function getChatErrorInfo(error: ApiError): ChatErrorInfo {
  switch (error.status) {
    case 400:
      return {
        message: "Invalid Gemini API key or malformed request.",
        shouldPromptForNewKey: true,
      }
    case 401:
      return {
        message: "Invalid or expired Gemini API key.",
        shouldPromptForNewKey: true,
      }
    case 429:
      return {
        message: "Gemini API rate limit exceeded. Please wait and try again.",
        shouldPromptForNewKey: false,
      }
    case 502:
      return {
        message: "Gemini API is currently unavailable. Please try again later.",
        shouldPromptForNewKey: false,
      }
    case 404:
      return {
        message: "None of the selected jobs could be found. Try selecting again.",
        shouldPromptForNewKey: false,
      }
    default:
      return {
        message: error.message || "Something went wrong talking to the assistant.",
        shouldPromptForNewKey: false,
      }
  }
}