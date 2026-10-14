import { getServerSession } from "next-auth"
import { authOptions } from "../../../api/auth/[...nextauth]"
import prisma from "../../../../lib/prisma"
import Head from "next/head"
import Link from "next/link"
import { useState, useEffect } from "react"
import ValidationMessage, { FormValidationSummary } from "../../../../components/ValidationMessage"
import { validateSchema, getErrorMessage } from "../../../../lib/validation"

export default function AdminChallengesEditPage({ challenge }) {
  const [formData, setFormData] = useState({
    title: challenge?.title || '',
    description: challenge?.description || '',
    grade: challenge?.grade?.toString() || '',
    subject: challenge?.subject || '',
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': document.cookie,
        },
        body: JSON.stringify({
          id: challenge.id,
          title: formData.title,
          description: formData.description,
          grade: parseInt(formData.grade),
          subject: formData.subject,
        }),
      })
      if (res.ok) {
        // Redirect to the challenges list
        window.location.href = '/admin/challenges'
      } else {
        const error = await res.json().catch(() => null)
        if (error?.errors) setFieldErrors(error.errors)
        // TODO: Replace with accessible error display
        console.error(getErrorMessage(error, 'Failed to update challenge. / चॅलेंज अपडेट करता आले नाही.'))
      }
    } catch (error) {
      console.error('Error updating challenge:', error)
      // TODO: Replace with accessible error display
        console.error('An error occurred while updating the challenge.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // If challenge is not found, redirect back
    if (!challenge) {
      window.location.href = '/admin/challenges'
    }
  }, [challenge])

  return (
    <div>
      <Head>
        <title>Edit Challenge - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin/challenges"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Challenges
          </Link>
          <h1 className="text-2xl font-bold mt-4">Edit Challenge</h1>
        </div>
        {!challenge ? (
          <p>Loading...</p>
        ) : (
          <>
          <FormValidationSummary errors={fieldErrors} />
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="edit-challenge-title" className="block text-gray-700 font-medium mb-2">Title</label>
              <input
                id="edit-challenge-title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? "edit-challenge-title-error" : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <ValidationMessage id="edit-challenge-title-error" error={fieldErrors.title} />
            </div>
            <div>
              <label htmlFor="edit-challenge-description" className="block text-gray-700 font-medium mb-2">Description</label>
              <textarea
                id="edit-challenge-description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={fieldErrors.description ? "edit-challenge-description-error" : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <ValidationMessage id="edit-challenge-description-error" error={fieldErrors.description} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-challenge-grade" className="block text-gray-700 font-medium mb-2">Grade</label>
                <input
                  id="edit-challenge-grade"
                  type="number"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  required
                  min="1"
                  max="12"
                  aria-invalid={Boolean(fieldErrors.grade)}
                  aria-describedby={fieldErrors.grade ? "edit-challenge-grade-error" : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <ValidationMessage id="edit-challenge-grade-error" error={fieldErrors.grade} />
              </div>
              <div>
                <label htmlFor="edit-challenge-subject" className="block text-gray-700 font-medium mb-2">Subject</label>
                <input
                  id="edit-challenge-subject"
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  aria-invalid={Boolean(fieldErrors.subject)}
                  aria-describedby={fieldErrors.subject ? "edit-challenge-subject-error" : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <ValidationMessage id="edit-challenge-subject-error" error={fieldErrors.subject} />
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
                {loading ? 'Updating...' : 'Update Challenge'}
              </button>
            </div>
          </form>
          </>
        )}
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

  const id = context.params.id

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id },
    })

    return {
      props: {
        challenge: challenge ? JSON.parse(JSON.stringify(challenge)) : null,
      },
    }
  } catch (error) {
    console.error('Error fetching challenge:', error)
    return {
      props: {
        challenge: null,
      },
    }
  }
}