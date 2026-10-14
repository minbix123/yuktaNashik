import Link from "next/link"
import { useSession, signIn } from "next-auth/react"
import { useState } from "react"
import Layout from "../../components/layout"
import ValidationMessage, { FormValidationSummary } from "../../components/ValidationMessage"
import { validateSchema, getErrorMessage } from "../../lib/validation"
import { useRouter } from "next/router"

export default function CreateChallengePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [grade, setGrade] = useState("")
  const [subject, setSubject] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  if (status === "loading") {
    return <Layout><p>Loading...</p></Layout>
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600 mb-8">
            Please sign in to access this page
          </p>
          <button
            onClick={() => signIn()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Sign in
          </button>
        </div>
      </Layout>
    )
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600 mb-6">
            Access Denied
          </h1>
          <p className="text-gray-600">
            Only teachers and school administrators can create challenges
          </p>
          <Link
            href="/"
            className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Home
          </Link>
        </div>
      </Layout>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const validation = validateSchema({ title, description, grade, subject }, "challenge")
    if (!validation.valid) {
      setFieldErrors(validation.errors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, grade, subject }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        if (errorData?.errors) setFieldErrors(errorData.errors)
        throw new Error(getErrorMessage(errorData, "Failed to create challenge. / चॅलेंज तयार करता आले नाही."))
      }

      await res.json()
      router.push(`/challenges`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Create New Challenge
        </h1>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}
        <FormValidationSummary errors={fieldErrors} />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="challenge-title" className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              id="challenge-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? "challenge-title-error" : undefined}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <ValidationMessage id="challenge-title-error" error={fieldErrors.title} />
          </div>
          <div>
            <label htmlFor="challenge-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="challenge-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={fieldErrors.description ? "challenge-description-error" : undefined}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
            />
            <ValidationMessage id="challenge-description-error" error={fieldErrors.description} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="challenge-grade" className="block text-sm font-medium text-gray-700 mb-2">
                Grade
              </label>
              <input
                id="challenge-grade"
                type="number"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                min="1"
                max="12"
                aria-invalid={Boolean(fieldErrors.grade)}
                aria-describedby={fieldErrors.grade ? "challenge-grade-error" : undefined}
              />
              <ValidationMessage id="challenge-grade-error" error={fieldErrors.grade} />
            </div>
            <div>
              <label htmlFor="challenge-subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                id="challenge-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                aria-invalid={Boolean(fieldErrors.subject)}
                aria-describedby={fieldErrors.subject ? "challenge-subject-error" : undefined}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
              <ValidationMessage id="challenge-subject-error" error={fieldErrors.subject} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Link href="/challenges" className="text-gray-600 hover:text-gray-800">
              ← Back to Challenges
            </Link>
            <button
              type="submit"
              disabled={loading}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Creating..." : "Create Challenge"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
