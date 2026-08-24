import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchJobs, searchJobs, fetchPlatforms, ApiError } from "@/lib/api"
import { useJobSelection } from "@/context/JobSelectionContext"
import { useToast } from "@/context/ToastContext"
import { CompanyAvatar } from "@/components/CompanyAvatar"
import type { Job } from "@/types/api"

const DOMAINS = ["Data Science", "Web Development"]

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [domain, setDomain] = useState("")
  const [platform, setPlatform] = useState("")
  const [platforms, setPlatforms] = useState<string[]>([])

  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [skillDraft, setSkillDraft] = useState("")

  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")

  const isSearching = searchQuery !== ""

  useEffect(() => {
    fetchPlatforms()
      .then(setPlatforms)
      .catch(() => {
        // Non-critical — dropdown just stays empty if this fails
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const request = isSearching
      ? searchJobs({ q: searchQuery, page, page_size: 10 })
      : fetchJobs({
          page,
          page_size: 10,
          domain: domain || undefined,
          source_platform: platform || undefined,
          skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        })

    request
      .then((data) => {
        if (cancelled) return
        setJobs(data.results)
        setTotal(data.total)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : "Could not load jobs.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, domain, platform, selectedSkills, searchQuery, isSearching])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearchQuery(searchInput.trim())
  }

  function clearSearch() {
    setSearchQuery("")
    setSearchInput("")
    setPage(1)
  }

  function handleAddSkill(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = skillDraft.trim()
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setPage(1)
      setSelectedSkills((s) => [...s, trimmed])
    }
    setSkillDraft("")
  }

  function removeSkill(skill: string) {
    setPage(1)
    setSelectedSkills((s) => s.filter((s2) => s2 !== skill))
  }

  function clearFilters() {
    setDomain("")
    setPlatform("")
    setSelectedSkills([])
    setSkillDraft("")
    setPage(1)
  }

  const hasActiveFilters = domain !== "" || platform !== "" || selectedSkills.length > 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium">Jobs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading
            ? "Loading roles…"
            : isSearching
            ? `Top matches for "${searchQuery}"`
            : `${total.toLocaleString()} roles available`}
        </p>
      </div>

      <div className="sticky top-16 z-10 bg-background pt-1 pb-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search naturally — e.g. 'remote entry-level python roles'"
            className="flex-1 text-sm border border-border rounded-md px-3 py-2 bg-card"
          />
          <button
            type="submit"
            className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
          >
            Search
          </button>
          {isSearching && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear search
            </button>
          )}
        </form>

        {!isSearching && (
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={domain}
                onChange={(e) => {
                  setPage(1)
                  setDomain(e.target.value)
                }}
                className="text-sm border border-border rounded-md px-3 py-2 bg-card"
              >
                <option value="">All domains</option>
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={platform}
                onChange={(e) => {
                  setPage(1)
                  setPlatform(e.target.value)
                }}
                className="text-sm border border-border rounded-md px-3 py-2 bg-card"
              >
                <option value="">All sources</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <form onSubmit={handleAddSkill} className="flex items-center gap-2">
                <input
                  type="text"
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  placeholder="Add a skill…"
                  className="text-sm border border-border rounded-md px-3 py-2 bg-card w-40"
                />
                <button
                  type="submit"
                  className="text-sm border border-border px-3 py-2 rounded-md hover:bg-accent"
                >
                  Add
                </button>
              </form>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear filters
                </button>
              )}
            </div>

            {selectedSkills.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1.5">
                  Showing jobs matching any of:
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedSkills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => removeSkill(skill)}
                      className="text-xs bg-category text-category-foreground pl-2.5 pr-1.5 py-1 rounded-full flex items-center gap-1"
                    >
                      {skill}
                      <span className="text-category-foreground/60">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isSearching && (
          <p className="text-xs text-muted-foreground">
            Semantic search is active — domain, source, and skill filters are
            unavailable while searching.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {error}
        </div>
      )}

      {!error && loading && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!error && !loading && (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <JobCard key={job.job_id} job={job} />
          ))}
        </div>
      )}

      {!error && !loading && jobs.length === 0 && (
        <EmptyState
          message={
            isSearching
              ? "No results for this search."
              : `No jobs found${hasActiveFilters ? " for these filters." : "."}`
          }
        />
      )}

      {!error && total > 10 && (
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="text-sm text-muted-foreground disabled:opacity-40 hover:text-foreground"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 10 >= total || loading}
            className="text-sm text-muted-foreground disabled:opacity-40 hover:text-foreground"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center flex flex-col items-center gap-3">
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-muted-foreground"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function JobCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-4 animate-pulse">
      <div className="w-5 h-5 rounded bg-muted shrink-0 mt-0.5" />
      <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-3 bg-muted rounded w-1/2 mt-2" />
        <div className="flex gap-1.5 mt-3">
          <div className="h-5 bg-muted rounded-full w-16" />
          <div className="h-5 bg-muted rounded-full w-14" />
        </div>
      </div>
      <div className="h-9 bg-muted rounded-md w-24 shrink-0" />
    </div>
  )
}

function JobCard({ job }: { job: Job }) {
  const { isSelected, toggleJob, isFull } = useJobSelection()
  const { addToast } = useToast()
  const selected = isSelected(job.job_id)
  const location = job.location || "Location not specified"
  const remote = job.remote_type === null ? "Not stated" : job.remote_type

  function handleCheckboxClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
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

  return (
    <Link
      to={`/jobs/${job.job_id}`}
      className="rounded-xl border border-border bg-card p-4 flex items-start gap-4 hover:border-foreground/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <button
        onClick={handleCheckboxClick}
        disabled={!selected && isFull}
        title={
          !selected && isFull
            ? "Remove a selected job to add another"
            : selected
            ? "Remove from Assistant selection"
            : "Select for Assistant"
        }
        className={`shrink-0 mt-0.5 w-5 h-5 rounded border flex items-center justify-center text-xs transition-colors ${
          selected
            ? "bg-category border-category text-category-foreground"
            : "border-border disabled:opacity-30"
        }`}
      >
        {selected && "✓"}
      </button>

      <CompanyAvatar name={job.company_name} size={40} />

      <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium truncate">
            {job.title || "Untitled role"}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {job.company_name || "Company not disclosed"} · {location} · {remote}
          </p>
          {job.skills && job.skills.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              {job.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="text-xs bg-category text-category-foreground px-2.5 py-1 rounded-full"
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 3 && (
                <span className="text-xs text-muted-foreground px-1">
                  +{job.skills.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium whitespace-nowrap self-end">
          View details
        </span>
      </div>
    </Link>
  )
}