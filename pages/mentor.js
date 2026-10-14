import { useSession, signIn, signOut } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import { useTranslationHook } from "../lib/use-translation"
import Layout from "../components/layout"
import ErrorBoundary from "../components/ErrorBoundary"
import LoadingSkeleton from "../components/LoadingSkeleton"

export default function MentorDashboard() {
  const { data: session, status } = useSession()
  const { t } = useTranslationHook()
  const [mentorData, setMentorData] = useState(null)
  const [assignedStudents, setAssignedStudents] = useState([])
  const [pendingEvidence, setPendingEvidence] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMentorData = useCallback(async () => {
    if (!session) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get mentor profile
      const mentorRes = await fetch(`/api/mentors/me`)
      if (!mentorRes.ok) {
        throw new Error("Failed to fetch mentor profile")
      }
      const mentor = await mentorRes.json()
      setMentorData(mentor)

      // Fallback sample data for assigned students
      const mockAssignedStudents = [
        {
          id: "1",
          name: "Student A",
          grade: 6,
          school: { name: "Example School" },
          recentProjects: [
            { name: "Bridge Building Challenge", date: "2024-01-10" }
          ]
        },
        {
          id: "2",
          name: "Student B",
          grade: 4,
          school: { name: "Example School" },
          recentProjects: [
            { name: "Garden Design Project", date: "2024-01-12" }
          ]
        }
      ]
      const realStudents = mentor.assignedStudents || mentor.students || []
      setAssignedStudents(realStudents.length > 0 ? realStudents : mockAssignedStudents)

      // Fallback sample data for pending evidence review
      const mockPendingEvidence = [
        {
          id: "1",
          student: { name: "Student A", grade: 6 },
          skill: { name: "Problem Solving", description: "Ability to analyze and solve complex problems" },
          details: "Student designed an innovative bridge structure that could withstand simulated earthquake conditions.",
          project: { name: "Bridge Building Challenge" },
          date: "2024-01-14"
        },
        {
          id: "2",
          student: { name: "Student B", grade: 4 },
          skill: { name: "Creativity", description: "Ability to think outside the box and generate innovative ideas" },
          details: "Student created a unique vertical garden design using recycled materials.",
          project: { name: "Garden Design Project" },
          date: "2024-01-13"
        }
      ]
      const realEvidence = mentor.pendingEvidence || []
      setPendingEvidence(realEvidence.length > 0 ? realEvidence : mockPendingEvidence)
    } catch (err) {
      console.error(err)
      setError("Failed to load mentor data")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (status === "loading") return
    Promise.resolve().then(() => fetchMentorData())
  }, [fetchMentorData, status])

  async function handleReviewEvidence(evidenceId, verificationStatus) {
    try {
      await fetch(`/api/skill-evidence?id=${encodeURIComponent(evidenceId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: evidenceId, verificationStatus }),
      })
    } catch (err) {
      console.error(err)
    } finally {
      setPendingEvidence((prev) => prev.filter((item) => item.id !== evidenceId))
    }
  }

  if (status === "loading") {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div role="status" aria-label="Loading">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600 mb-8">{t('profile.pleaseSignInToView', { defaultValue: 'Please sign in to view mentor dashboard' })}</p>
          <button onClick={() => signIn()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            {t('auth.signIn')}
          </button>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((_, index) => (
              <LoadingSkeleton loading={true} isLoading={true} key={index} className="h-16" />
            ))}
          </div>
          <LoadingSkeleton loading={true} isLoading={true} className="h-20 w-full" />
          <LoadingSkeleton loading={true} isLoading={true} className="h-24 w-full" />
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-red-800 font-bold mb-4">{t('common.error')}</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => fetchMentorData()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </Layout>
    )
  }

  // Check if user is actually a mentor
  if (session.user.role !== "MENTOR") {
    return (
      <Layout>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-red-800 font-bold mb-4">{t('common.error')}</h2>
          <p className="text-red-600">
            {t('mentor.accessDenied', { defaultValue: 'Access denied: Mentor role required' })}
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <ErrorBoundary>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {t('dashboard.welcome')}, {mentorData?.name || session.user.name || 'Mentor'}!
              </h1>
              <p className="text-gray-600">{t('dashboard.overview')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => signOut()} className="text-gray-500 hover:text-gray-700">
                {t('auth.signOut')}
              </button>
            </div>
          </div>

          {/* Assigned students overview */}
          <div>
            <h2 className="text-xl font-semibold mb-4">{t('dashboard.assignedStudents')}</h2>
            {assignedStudents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t('dashboard.noStudentsAssigned', { defaultValue: 'No students assigned to you. Contact program administrator.' })}
              </p>
            ) : (
              <div className="space-y-4">
                {assignedStudents.map((student) => (
                  <div key={student.id} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">{student.name || student.user?.name}</h3>
                        <p className="text-sm text-gray-500">
                          Grade {student.grade} • {student.school?.name || 'School'}
                        </p>
                      </div>
                      <div className="text-sm">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Active</span>
                        </div>
                      </div>
                    </div>

                    {/* Recent projects */}
                    <div className="mt-3">
                      <h4 className="font-medium text-gray-700 mb-2">{t('dashboard.recentProjects')}</h4>
                      {(student.recentProjects || student.projects || []).map((project, index) => (
                        <div key={index} className="flex items-start mb-2">
                          <div className="flex-shrink-0 mt-0.5 h-2.5 w-2.5 bg-blue-100 rounded"></div>
                          <div className="ml-2">
                            <span className="text-sm text-blue-600">
                              {project.name || project.title}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              {new Date(project.date || project.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            console.log(`Viewing details for ${student.name || student.user?.name}`)
                          }}
                          className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded"
                        >
                          {t('common.viewDetails')}
                        </button>
                        <button
                          onClick={() => {
                            console.log(`Viewing skill evidence for ${student.name || student.user?.name}`)
                          }}
                          className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded"
                        >
                          {t('skillPassport.title')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending evidence for review */}
          <div>
            <h2 className="text-xl font-semibold mb-4">{t('dashboard.pendingEvidenceReview')}</h2>
            {pendingEvidence.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t('dashboard.noPendingEvidence', { defaultValue: 'No pending evidence for review.' })}
              </p>
            ) : (
              <div className="space-y-4">
                {pendingEvidence.map((evidence) => (
                  <div key={evidence.id} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {evidence.student?.name || evidence.student?.user?.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Grade {evidence.student?.grade} • {evidence.student?.school?.name || 'School'}
                        </p>
                      </div>
                      <div className="text-sm">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>{t('dashboard.pendingReview')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <h4 className="font-medium text-gray-700 mb-2">{t('skillPassport.title')}</h4>
                      <p className="text-gray-600">{evidence.skill?.name}</p>
                    </div>

                    <div className="mt-3">
                      <h4 className="font-medium text-gray-700 mb-2">{t('common.details')}</h4>
                      <p className="text-gray-600">{evidence.details}</p>
                    </div>

                    <div className="mt-3">
                      <h4 className="font-medium text-gray-700 mb-2">{t('dashboard.project')}</h4>
                      <p className="text-gray-600">{evidence.project?.name || evidence.project?.title}</p>
                    </div>

                    <div className="mt-3">
                      <h4 className="font-medium text-gray-700 mb-2">{t('dashboard.submittedDate')}</h4>
                      <p className="text-gray-600">
                        {new Date(evidence.date || evidence.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="space-y-2">
                        <button
                          onClick={() => handleReviewEvidence(evidence.id, "APPROVED")}
                          className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded"
                        >
                          {t('dashboard.approveEvidence')}
                        </button>
                        <button
                          onClick={() => handleReviewEvidence(evidence.id, "REJECTED")}
                          className="w-full text-left px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded"
                        >
                          {t('dashboard.requestRevisions')}
                        </button>
                        <button
                          onClick={() => {
                            console.log(`Viewing details for evidence from ${evidence.student?.name || evidence.student?.user?.name}`)
                          }}
                          className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded"
                        >
                          {t('common.viewDetails')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-xl font-semibold mb-4">{t('dashboard.quickActions')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button
                onClick={() => {
                  console.log('View all assigned students')
                }}
                className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20l-5-5m0 0l-5 5m5-5v6" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-800">{t('common.viewAll')}</h3>
                    <p className="text-sm text-gray-500">{t('dashboard.students')}</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  console.log('Review pending evidence')
                }}
                className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-shrink-0 h-8 w-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l3 3m0 0l-3 3M3 3l3.536 3.536L12 4.293zM12 4.293l3.536 3.536" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-800">{t('dashboard.evidenceReview')}</h3>
                    <p className="text-sm text-gray-500">{t('common.action')}</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  console.log('Browse challenges')
                }}
                className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-shrink-0 h-8 w-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3-2-1.343-2-3-2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-800">{t('challenges.title')}</h3>
                    <p className="text-sm text-gray-500">{t('common.browse')}</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  console.log('Update availability')
                }}
                className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-md flex items-center justify-center">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22s8-4 8-12V5" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-800">{t('dashboard.availability', { defaultValue: 'Availability' })}</h3>
                    <p className="text-sm text-gray-500">{t('common.update')}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </Layout>
    </ErrorBoundary>
  )
}