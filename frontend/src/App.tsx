import { useEffect, useState } from "react"
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation } from "react-router-dom"
import { ResumeProvider } from "@/context/ResumeContext"
import { JobSelectionProvider, useJobSelection } from "@/context/JobSelectionContext"
import { ToastProvider } from "@/context/ToastContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import Jobs from "./pages/Jobs"
import JobDetail from "./pages/JobDetail"
import Recommendations from "./pages/Recommendations"
import Assistant from "./pages/Assistant"
import NotFound from "./pages/NotFound"

function SelectionBar() {
  const { selectedJobs, maxJobs } = useJobSelection()

  if (selectedJobs.length === 0) return null

  return (
    <div className="sticky bottom-0 border-t border-border bg-card">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedJobs.length} of {maxJobs} jobs selected for the Assistant
        </p>
        <NavLink
          to="/assistant"
          className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
        >
          Go to Assistant
        </NavLink>
      </div>
    </div>
  )
}

function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
  }, [isDark])

  return (
    <button
      onClick={() => setIsDark((d) => !d)}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="text-muted-foreground hover:text-foreground w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}

function AppShell() {
  const location = useLocation()

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm pb-3 border-b-2 transition-colors ${
      isActive
        ? "border-primary text-primary font-medium"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-8 h-16">
            <Link to="/" className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="7" width="18" height="13" rx="2" fill="var(--primary)" />
                <path
                  d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  fill="none"
                />
                <rect x="3" y="11" width="18" height="2.5" fill="white" fillOpacity="0.3" />
              </svg>
              <span className="text-lg font-bold tracking-tight">JobBoard</span>
            </Link>
            <nav className="flex items-center gap-6 h-16">
              <NavLink to="/" end className={navLinkClass}>
                Jobs
              </NavLink>
              <NavLink to="/recommendations" className={navLinkClass}>
                Recommendations
              </NavLink>
              <NavLink to="/assistant" className={navLinkClass}>
                Assistant
              </NavLink>
            </nav>
          </div>
          <DarkModeToggle />
        </div>
      </header>

      <main
        key={location.pathname}
        className="max-w-5xl mx-auto px-6 py-8 flex-1 w-full animate-in fade-in duration-300"
      >
        <Routes>
          <Route path="/" element={<Jobs />} />
          <Route path="/jobs/:jobId" element={<JobDetail />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <SelectionBar />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ResumeProvider>
          <JobSelectionProvider>
            <BrowserRouter>
              <AppShell />
            </BrowserRouter>
          </JobSelectionProvider>
        </ResumeProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App