import { createContext, useContext, useState, type ReactNode } from "react"
import type { ResumeProfile } from "@/types/api"

interface ResumeContextValue {
  resumeProfile: ResumeProfile | null
  setResumeProfile: (profile: ResumeProfile | null) => void
}

const ResumeContext = createContext<ResumeContextValue | undefined>(undefined)

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null)

  return (
    <ResumeContext.Provider value={{ resumeProfile, setResumeProfile }}>
      {children}
    </ResumeContext.Provider>
  )
}

export function useResume() {
  const context = useContext(ResumeContext)
  if (!context) {
    throw new Error("useResume must be used within a ResumeProvider")
  }
  return context
}