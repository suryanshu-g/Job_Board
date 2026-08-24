import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { sendChatMessage, getChatErrorInfo, ApiError } from "@/lib/api"
import { useResume } from "@/context/ResumeContext"
import { useJobSelection } from "@/context/JobSelectionContext"

interface ChatMessage {
  role: "user" | "assistant"
  text: string
}

export default function Assistant() {
  const { resumeProfile } = useResume()
  const { selectedJobs, removeJob, clearSelection } = useJobSelection()
  const location = useLocation()

  const [apiKey, setApiKey] = useState("")
  const [manualJobIdsInput, setManualJobIdsInput] = useState("")
  const [message, setMessage] = useState("")
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsNewKey, setNeedsNewKey] = useState(false)

  const hasSelectedJobs = selectedJobs.length > 0

  useEffect(() => {
    if (hasSelectedJobs) return
    const passedJobId = (location.state as { jobId?: string } | null)?.jobId
    if (passedJobId) {
      setManualJobIdsInput(passedJobId)
    }
  }, [location.state, hasSelectedJobs])

  if (!resumeProfile) {
    return (
      <div>
        <h1 className="text-xl font-medium">Assistant</h1>
        <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Upload your resume on the Recommendations tab first — the assistant uses
          it to answer questions about how you fit specific roles.
        </div>
      </div>
    )
  }

  async function handleSend() {
    const jobIds = hasSelectedJobs
      ? selectedJobs.map((j) => j.job_id)
      : manualJobIdsInput
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)

    if (!apiKey.trim() || jobIds.length === 0 || !message.trim()) return

    const userMessage = message
    setHistory((h) => [...h, { role: "user", text: userMessage }])
    setMessage("")
    setSending(true)
    setError(null)
    setNeedsNewKey(false)

    try {
      const response = await sendChatMessage(
        { job_ids: jobIds, resume_profile: resumeProfile!, message: userMessage },
        apiKey
      )
      setHistory((h) => [...h, { role: "assistant", text: response.reply }])
    } catch (err) {
      if (err instanceof ApiError) {
        const info = getChatErrorInfo(err)
        setError(info.message)
        setNeedsNewKey(info.shouldPromptForNewKey)
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setSending(false)
    }
  }

  const canSend =
    apiKey.trim() !== "" &&
    message.trim() !== "" &&
    (hasSelectedJobs || manualJobIdsInput.trim() !== "")

  return (
    <div>
      <h1 className="text-xl font-medium">Assistant</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Ask questions about specific roles using your own Gemini API key.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
        <div>
          <label className="text-xs text-muted-foreground">
            Gemini API key — used only for this request, never stored
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            className="w-full mt-1 text-sm border border-border rounded-md px-3 py-2 bg-background"
          />
        </div>

        {hasSelectedJobs ? (
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">
                Jobs selected ({selectedJobs.length})
              </label>
              <button
                onClick={clearSelection}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-col gap-1.5 mt-1.5">
              {selectedJobs.map((job) => (
                <div
                  key={job.job_id}
                  className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2 bg-background"
                >
                  <span className="truncate">
                    {job.title || "Untitled role"}
                    {job.company_name ? ` · ${job.company_name}` : ""}
                  </span>
                  <button
                    onClick={() => removeJob(job.job_id)}
                    className="text-muted-foreground hover:text-foreground ml-2 shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs text-muted-foreground">
              Job ID(s) — comma-separated, copy from a job's URL
            </label>
            <input
              type="text"
              value={manualJobIdsInput}
              onChange={(e) => setManualJobIdsInput(e.target.value)}
              placeholder="e.g. 6f03169b-30f3-4ca8-86e0-a167b14588dc"
              className="w-full mt-1 text-sm border border-border rounded-md px-3 py-2 bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tip: select jobs using the checkboxes on the Jobs page instead of
              pasting IDs manually.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 max-h-96 overflow-y-auto">
        {history.map((msg, i) => (
          <div
            key={i}
            className={`text-sm rounded-lg px-4 py-2.5 max-w-[80%] ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground self-end"
                : "bg-card border border-border self-start"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {error}
          {needsNewKey && " Please re-enter your API key above."}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask something about this role…"
          disabled={sending}
          className="flex-1 text-sm border border-border rounded-md px-3 py-2 bg-background disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={sending || !canSend}
          className="text-sm bg-primary text-primary-foreground px-5 py-2 rounded-md font-medium disabled:opacity-40"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  )
}