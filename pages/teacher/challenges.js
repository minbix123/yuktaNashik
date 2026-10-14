import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import Head from "next/head"
import Link from "next/link"
import { useState } from "react"
import ValidationMessage, { FormValidationSummary } from "../../components/ValidationMessage"
import { validateSchema, getErrorMessage } from "../../lib/validation"

export default function TeacherChallengesPage({ challenges, classes }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    grade: '',
    subject: '',
    classId: '',
  })
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

    try {
      const res = await fetch(`/api/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': document.cookie,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          grade: parseInt(formData.grade),
          subject: formData.subject,
          classId: formData.classId || undefined,
        }),
      })
      if (res.ok) {
        // Reset form and close modal
        setFormData({
          title: '',
          description: '',
          grade: '',
          subject: '',
          classId: '',
        })
        setShowCreateModal(false)
        // Refetch challenges by triggering a rerun of getServerSideProps
        // We'll do a simple router push to the same page to refresh
        // Alternatively, we can use SWR or react-query, but for simplicity we'll reload.
        window.location.reload()
      } else {
        const error = await res.json().catch(() => null)
        if (error?.errors) setFieldErrors(error.errors)
        alert(getErrorMessage(error, 'Failed to create challenge. / चॅलेंज तयार करता आले नाही.'))
      }
    } catch (error) {
      console.error('Error creating challenge:', error)
      alert('An error occurred while creating the challenge.')
    }
  }

  return (
    <div>
      <Head>
        <title>Manage Challenges - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-start sm:items-center">
          <h1 className="text-3xl font-bold">Manage Challenges</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Create New Challenge
          </button>
        </div>
        <p className="text-gray-500 mb-6">
          Create and manage challenges for your classes.
        </p>

        {challenges.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-2 text-gray-800">{challenge.title}</h2>
                  <p className="text-gray-600 mb-4 line-clamp-3">{challenge.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-4">Grade: {challenge.grade}</span>
                    <span>Subject: {challenge.subject}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No challenges available at the moment.</p>
        )}
      </main>

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">Create New Challenge</h2>
            <FormValidationSummary errors={fieldErrors} />
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={fieldErrors.title ? "teacher-challenge-title-error" : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <ValidationMessage id="teacher-challenge-title-error" error={fieldErrors.title} />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={fieldErrors.description ? "teacher-challenge-description-error" : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <ValidationMessage id="teacher-challenge-description-error" error={fieldErrors.description} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Grade</label>
                  <input
                    type="number"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    required
                    min="1"
                    max="12"
                    aria-invalid={Boolean(fieldErrors.grade)}
                    aria-describedby={fieldErrors.grade ? "teacher-challenge-grade-error" : undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ValidationMessage id="teacher-challenge-grade-error" error={fieldErrors.grade} />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    aria-invalid={Boolean(fieldErrors.subject)}
                    aria-describedby={fieldErrors.subject ? "teacher-challenge-subject-error" : undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ValidationMessage id="teacher-challenge-subject-error" error={fieldErrors.subject} />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Class (Optional)</label>
                <select
                  name="classId"
                  value={formData.classId}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.classId)}
                  aria-describedby={fieldErrors.classId ? "teacher-challenge-class-error" : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a class (optional)</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Grade {cls.grade})
                  </option>
                  ))}
                </select>
                <ValidationMessage id="teacher-challenge-class-error" error={fieldErrors.classId} />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="mr-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Create Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)

  // Check if user is a teacher or school admin
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    }
  }

  try {
    const challengesPromise = prisma.challenge.findMany({
      orderBy: { createdAt: "desc" },
    })

    let classesPromise = Promise.resolve([])
    if (session.user.role === "TEACHER") {
      classesPromise = prisma.teacherProfile
        .findUnique({
          where: { userId: session.user.id },
          include: {
            classes: {
              orderBy: { name: "asc" },
            },
          },
        })
        .then((profile) => profile?.classes || [])
    } else if (session.user.role === "SCHOOL_ADMIN") {
      const schoolId = session.user.schoolId
      if (schoolId) {
        classesPromise = prisma.class.findMany({
          where: { schoolId },
          orderBy: { name: "asc" },
        })
      }
    }

    const [challenges, classes] = await Promise.all([challengesPromise, classesPromise])

    return {
      props: {
        challenges: JSON.parse(JSON.stringify(challenges)),
        classes: JSON.parse(JSON.stringify(classes)),
      },
    }
  } catch (error) {
    console.error('Error fetching challenges or classes:', error)
    return {
      props: {
        challenges: [],
        classes: [],
      },
    }
  }
}