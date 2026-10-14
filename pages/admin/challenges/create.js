import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]"
import Head from "next/head"
import Link from "next/link"
import { useState } from "react"
import ValidationMessage, { FormValidationSummary } from "../../../components/ValidationMessage"
import { validateSchema, getErrorMessage } from "../../../lib/validation"

export default function AdminChallengesCreatePage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    grade: '',
    subject: '',
  })
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldErrors({})
    const validation = validateSchema(formData, "challenge")
    if (!validation.valid) {
      setFieldErrors(validation.errors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': document.cookie,
        },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        // Reset form and redirect to list
        setFormData({
          title: '',
          description: '',
          grade: '',
          subject: '',
        })
        // Redirect to the challenges list
        window.location.href = '/admin/challenges'
      } else {
        const error = await res.json().catch(() => null)
        if (error?.errors) setFieldErrors(error.errors)
        // TODO: Replace with accessible error display
        console.error(getErrorMessage(error, 'Failed to create challenge. / चॅलेंज तयार करता आले नाही.'))
      }
    } catch (error) {
      console.error('Error creating challenge:', error)
      // TODO: Replace with accessible error display
        console.error('An error occurred while creating the challenge.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Head>
        <title>Create Challenge - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin/challenges"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Challenges
          </Link>
          <h1 className="text-2xl font-bold mt-4">Create New Challenge</h1>
        </div>
        <FormValidationSummary errors={fieldErrors} />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="admin-challenge-title" className="block text-gray-700 font-medium mb-2">Title</label>
            <input
              id="admin-challenge-title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? "admin-challenge-title-error" : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <ValidationMessage id="admin-challenge-title-error" error={fieldErrors.title} />
          </div>
          <div>
            <label htmlFor="admin-challenge-description" className="block text-gray-700 font-medium mb-2">Description</label>
            <textarea
              id="admin-challenge-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={fieldErrors.description ? "admin-challenge-description-error" : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <ValidationMessage id="admin-challenge-description-error" error={fieldErrors.description} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="admin-challenge-grade" className="block text-gray-700 font-medium mb-2">Grade</label>
              <input
                id="admin-challenge-grade"
                type="number"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                required
                min="1"
                max="12"
                aria-invalid={Boolean(fieldErrors.grade)}
                aria-describedby={fieldErrors.grade ? "admin-challenge-grade-error" : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <ValidationMessage id="admin-challenge-grade-error" error={fieldErrors.grade} />
            </div>
            <div>
              <label htmlFor="admin-challenge-subject" className="block text-gray-700 font-medium mb-2">Subject</label>
              <input
                id="admin-challenge-subject"
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                aria-invalid={Boolean(fieldErrors.subject)}
                aria-describedby={fieldErrors.subject ? "admin-challenge-subject-error" : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <ValidationMessage id="admin-challenge-subject-error" error={fieldErrors.subject} />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => window.location.href = '/admin/challenges'}
              className="mr-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${loading && 'opacity-50'}`}
            >
              {loading ? 'Creating...' : 'Create Challenge'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)

  // Check if user is a platform admin
  if (!session || session.user.role !== "PLATFORM_ADMIN") {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    }
  }

  return {
    props: {},
  }
}