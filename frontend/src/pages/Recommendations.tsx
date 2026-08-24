import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { uploadResume, getRecommendations, ApiError } from "@/lib/api"
import { useResume } from "@/context/ResumeContext"
import type { RecommendedJob } from "@/types/api"

export default function Recommendations() {
  const { resumeProfile, setResumeProfile } = useResume()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [recommendations, setRecommendations] = useState<RecommendedJob[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [recsError, setRecsError] = useState<string | null>(null)
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false)

  useEffect(() => {
    if (resumeProfile && !hasFetchedOnce) {
      setHasFetchedOnce(true)
      fetchRecommendations(resumeProfile.skills)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeProfile])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    setRecsError(null)

    try {
      const profile = await uploadResume(file)
      setResumeProfile(profile)
      setHasFetchedOnce(true)
      await fetchRecommendations(profile.skills)
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : "Could not process this resume."
      )
    } finally {
      setUploading(false)
    }
  }

  async function fetchRecommendations(skills: string[]) {
    setLoadingRecs(true)
    setRecsError(null)
    try {
      const response = await getRecommendations({ skills })
      setRecommendations(response.results)
    } catch (err) {
      setRecsError(
        err instanceof ApiError ? err.message : "Could not load recommendations."
      )
    } finally {
      setLoadingRecs(false)
    }
  }

  if (!resumeProfile) {
    return (
      <div>
        <h1 className="text-xl font-medium">Recommendations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your resume to see roles matched to your skills.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <label className="cursor-pointer">
            <span className="text-sm bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-medium inline-block">
              {uploading ? "Uploading…" : "Upload resume (PDF)"}
            </span>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <p className="text-xs text-muted-foreground mt-3">
            Used only for this session — nothing is saved.
          </p>
          {uploadError && (
            <p className="text-sm text-muted-foreground mt-4">{uploadError}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-medium">Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Based on {resumeProfile.skills.length} skills detected in your resume
          </p>
        </div>
        <button
          onClick={() => {
            setResumeProfile(null)
            setRecommendations([])
            setHasFetchedOnce(false)
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Upload a different resume
        </button>
      </div>

      {loadingRecs && (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground mb-3">
            Scoring roles against your resume — this can take a few seconds…
          </p>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <RecommendationSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {recsError && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground mt-6">
          {recsError}
        </div>
      )}

      {!loadingRecs && !recsError && (
        <div className="flex flex-col gap-3 mt-6">
          {recommendations.map((rec) => (
            <RecommendationCard key={rec.job_id} rec={rec} />
          ))}
          {recommendations.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              No matching roles found.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RecommendationSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-1/4 mt-2" />
        </div>
        <div className="h-5 bg-muted rounded-full w-16 shrink-0" />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-5 bg-muted rounded-full w-14" />
        <div className="h-5 bg-muted rounded-full w-16" />
        <div className="h-5 bg-muted rounded-full w-12" />
      </div>
      <div className="h-3 bg-muted rounded w-4/5" />
    </div>
  )
}

function RecommendationCard({ rec }: { rec: RecommendedJob }) {
  return (
    <Link
      to={`/jobs/${rec.job_id}`}
      state={{ recommendation: rec }}
      className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-foreground/20 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium truncate">
            {rec.title || "Untitled role"}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rec.company_name || "Company not disclosed"}
          </p>
        </div>
        <span className="text-xs bg-success text-success-foreground px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
          {Math.round(rec.score * 100)}% match
        </span>
      </div>

      {rec.matched_skills.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {rec.matched_skills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="text-xs bg-category text-category-foreground px-2.5 py-1 rounded-full"
            >
              {skill}
            </span>
          ))}
          {rec.matched_skills.length > 5 && (
            <span className="text-xs text-muted-foreground px-1">
              +{rec.matched_skills.length - 5}
            </span>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">{rec.reason}</p>
    </Link>
  )
}