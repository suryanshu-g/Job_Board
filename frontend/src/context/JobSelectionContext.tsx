import { createContext, useContext, useState, type ReactNode } from "react"

export interface SelectedJob {
  job_id: string
  title: string | null
  company_name: string | null
}

const MAX_SELECTED_JOBS = 3

interface JobSelectionContextValue {
  selectedJobs: SelectedJob[]
  isSelected: (jobId: string) => boolean
  toggleJob: (job: SelectedJob) => void
  removeJob: (jobId: string) => void
  clearSelection: () => void
  isFull: boolean
  maxJobs: number
}

const JobSelectionContext = createContext<JobSelectionContextValue | undefined>(
  undefined
)

export function JobSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedJobs, setSelectedJobs] = useState<SelectedJob[]>([])

  function isSelected(jobId: string) {
    return selectedJobs.some((j) => j.job_id === jobId)
  }

  function toggleJob(job: SelectedJob) {
    setSelectedJobs((prev) => {
      const alreadyIn = prev.some((j) => j.job_id === job.job_id)
      if (alreadyIn) {
        return prev.filter((j) => j.job_id !== job.job_id)
      }
      if (prev.length >= MAX_SELECTED_JOBS) {
        return prev
      }
      return [...prev, job]
    })
  }

  function removeJob(jobId: string) {
    setSelectedJobs((prev) => prev.filter((j) => j.job_id !== jobId))
  }

  function clearSelection() {
    setSelectedJobs([])
  }

  return (
    <JobSelectionContext.Provider
      value={{
        selectedJobs,
        isSelected,
        toggleJob,
        removeJob,
        clearSelection,
        isFull: selectedJobs.length >= MAX_SELECTED_JOBS,
        maxJobs: MAX_SELECTED_JOBS,
      }}
    >
      {children}
    </JobSelectionContext.Provider>
  )
}

export function useJobSelection() {
  const context = useContext(JobSelectionContext)
  if (!context) {
    throw new Error("useJobSelection must be used within a JobSelectionProvider")
  }
  return context
}