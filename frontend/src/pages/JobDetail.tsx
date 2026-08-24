import { useEffect, useState } from "react"
import { useParams, useLocation, useNavigate, Link } from "react-router-dom"
import { fetchJobById, ApiError } from "@/lib/api"
import { useJobSelection } from "@/context/JobSelectionContext"
import { useToast } from "@/context/ToastContext"
import { CompanyAvatar } from "@/components/CompanyAvatar"
import { MatchRing } from "@/components/MatchRing"
import type { Job, RecommendedJob } from "@/types/api"

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { isSelected, toggleJob, isFull, selectedJobs } = useJobSelection()
  const { addToast } = useToast()

  const recommendation = (location.state as { recommendation?: RecommendedJob } | null)
    ?.recommendation

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchJobById(jobId)
      .then((data) => {
        if (!cancelled) setJob(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof ApiError && err.status === 404
            ? "This job couldn't be found — it may have been removed."
            : "Could not load this job. Please try again."
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [jobId])

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
          <div className="flex-1">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/2 mt-2" />
          </div>
        </div>
        <div className="h-3 bg-muted rounded w-full mt-6" />
        <div className="h-3 bg-muted rounded w-5/6 mt-2" />
        <div className="h-3 bg-muted rounded w-2/3 mt-2" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to jobs
        </Link>
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground mt-4">
          {error || "Job not found."}
        </div>
      </div>
    )
  }

  const selected = isSelected(job.job_id)

  function handleToggleSelect() {
    if (!job) return
    const wasSelected = selected
    toggleJob({
      job_id: job.job_id,
      title: job.title,
      company_name: job.company_name,
    })
    if (wasSelected) {
      addToast("Removed from selection")
    } else if (!isFull) {
      addToast("Added to selection")
    }
  }

  function handleAskAI() {
    if (!job) return
    if (!isSelected(job.job_id) && !isFull) {
      toggleJob({
        job_id: job.job_id,
        title: job.title,
        company_name: job.company_name,
      })
    }
    navigate("/assistant")
  }

  const askAIDisabled = !selected && isFull

  const salaryText =
    job.salary_from != null && job.salary_to != null
      ? `₹${job.salary_from.toLocaleString()} – ₹${job.salary_to.toLocaleString()}`
      : "Not disclosed"

  const ratingText =
    job.company_rating != null ? job.company_rating.toFixed(1) : "Not rated"

  const remoteText = job.remote_type === null ? "Not stated" : job.remote_type

  const experienceText =
    job.min_experience != null && job.max_experience != null
      ? `${job.min_experience}–${job.max_experience} years`
      : job.min_experience != null
      ? `${job.min_experience}+ years`
      : "Not specified"

  return (
    <div>
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to jobs
      </Link>

      {recommendation && (
        <div className="mt-4 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm font-medium">Why this matches you</p>
            <MatchRing percent={Math.round(recommendation.score * 100)} size={44} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{recommendation.reason}</p>

          {recommendation.matched_skills.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Skills that match</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {recommendation.matched_skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs bg-category text-category-foreground px-2.5 py-1 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {recommendation.missing_skills.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                Skills this role wants that weren't found in your resume
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {recommendation.missing_skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs border border-border text-muted-foreground px-2.5 py-1 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-3">
            <button
              onClick={handleToggleSelect}
              disabled={!selected && isFull}
              title={
                !selected && isFull
                  ? "Remove a selected job to add another"
                  : selected
                  ? "Remove from Assistant selection"
                  : "Select for Assistant"
              }
              className={`shrink-0 mt-1.5 w-5 h-5 rounded border flex items-center justify-center text-xs transition-colors ${
                selected
                  ? "bg-category border-category text-category-foreground"
                  : "border-border disabled:opacity-30"
              }`}
            >
              {selected && "✓"}
            </button>
            <CompanyAvatar name={job.company_name} size={44} />
            <div>
              <h1 className="text-xl font-medium">{job.title || "Untitled role"}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {job.company_name || "Company not disclosed"} ·{" "}
                {job.location || "Location not specified"} · {remoteText}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAskAI}
              disabled={askAIDisabled}
              title={
                askAIDisabled
                  ? `You already have ${selectedJobs.length} jobs selected — remove one first`
                  : undefined
              }
              className="text-sm border border-border px-5 py-2.5 rounded-md font-medium whitespace-nowrap hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Ask AI about this job
            </button>
            {job.apply_link && (
              <a
                href={job.apply_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-medium whitespace-nowrap"
              >
                Apply
              </a>
            )}
          </div>
        </div>

        {job.skills && job.skills.length > 0 && (
          <div className="flex items-center gap-1.5 mt-4 flex-wrap">
            {job.skills.map((skill) => (
              <span
                key={skill}
                className="text-xs bg-category text-category-foreground px-2.5 py-1 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
          <DetailField label="Employment type" value={job.employment_type || "Not specified"} />
          <DetailField label="Experience" value={experienceText} />
          <DetailField label="Salary" value={salaryText} />
          <DetailField label="Company rating" value={ratingText} />
        </div>

        {job.description && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm font-medium mb-2">Description</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {job.description}
            </p>
          </div>
        )}

        {job.cross_posted_platforms && job.cross_posted_platforms.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm font-medium mb-2">Also posted on</p>
            <p className="text-sm text-muted-foreground">
              {job.cross_posted_platforms.join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  )
}