import { Link } from "react-router-dom"

export default function NotFound() {
  return (
    <div>
      <h1 className="text-xl font-medium">Page not found</h1>
      <p className="text-sm text-muted-foreground mt-1">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link
        to="/"
        className="text-sm bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-medium inline-block mt-6"
      >
        Back to jobs
      </Link>
    </div>
  )
}