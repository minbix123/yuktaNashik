import { useSession, signIn, signOut } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import { useTranslationHook } from "../lib/use-translation"
import Layout from "../components/layout"
import ErrorBoundary from "../components/ErrorBoundary"
import LoadingSkeleton from "../components/LoadingSkeleton"

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  indigo: 'bg-indigo-500'
}

export default function ParentDashboard() {
  const { data: session, status } = useSession()
  const { t } = useTranslationHook()
  const [parentData, setParentData] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchParentData = useCallback(async () => {
    if (!session) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get parent profile
      const parentRes = await fetch(`/api/parents/me`)
      if (!parentRes.ok) {
        throw new Error("Failed to fetch parent profile")
      }
      const parent = await parentRes.json()
      setParentData(parent)

      // Fallback sample data for linked students
      const mockStudents = [
        {
          id: "1",
          name: "Student 1",
          grade: 5,
          school: { name: "Example School" },
          recentActivity: [
            { type: "project", title: "Water Conservation Project", date: "2024-01-15" },
            { type: "skillEvidence", skill: "Problem Solving", date: "2024-01-10" }
          ]
        },
        {
          id: "2",
          name: "Student 2",
          grade: 3,
          school: { name: "Example School" },
          recentActivity: [
            { type: "project", title: "Garden Design Project", date: "2024-01-12" },
            { type: "skillEvidence", skill: "Creativity", date: "2024-01-08" }
          ]
        }
      ]
      setStudents(parent.students?.length > 0 ? parent.students : mockStudents)
    } catch (err) {
      console.error(err)
      setError("Failed to load parent data")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (status === "loading") return
    Promise.resolve().then(() => fetchParentData())
  }, [fetchParentData, status])

  if (status === "loading") {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600 mb-8">{t('profile.pleaseSignInToView', { defaultValue: 'Please sign in to view parent dashboard' })}</p>
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
              <LoadingSkeleton isLoading={true} key={index} className="h-16" />
            ))}
          </div>
          <LoadingSkeleton isLoading={true} className="h-20 w-full" />
          <LoadingSkeleton isLoading={true} className="h-24 w-full" />
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
            onClick={() => fetchParentData()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('common.tryAgain')}
          </button>
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
                {t('dashboard.welcome')}, {parentData?.name || session.user.name || 'Parent'}!
              </h1>
              <p className="text-gray-600">{t('dashboard.overview')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => signOut()} className="text-gray-500 hover:text-gray-700">
                {t('auth.signOut')}
              </button>
            </div>
          </div>

          {/* Students overview */}
          <div>
            <h2 className="text-xl font-semibold mb-4">{t('dashboard.studentsOverview')}</h2>
            {students.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t('dashboard.noStudentsLinked', { defaultValue: 'No students linked to your account. Please contact school administration.' })}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((student) => (
                  <div key={student.id} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">{student.name}</h3>
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

                    {/* Recent activity */}
                    <div className="mt-3">
                      <h4 className="font-medium text-gray-700 mb-2">{t('dashboard.recentActivity')}</h4>
                      {(student.recentActivity || []).map((activity, index) => (
                        <div key={index} className="flex items-start mb-2">
                          <div className="flex-shrink-0 mt-0.5 h-2.5 w-2.5 bg-blue-100 rounded"></div>
                          <div className="ml-2">
                            {activity.type === 'project' && (
                              <span className="text-sm text-blue-600">
                                Project: {activity.title}
                              </span>
                            )}
                            {activity.type === 'skillEvidence' && (
                              <span className="text-sm text-green-600">
                                Skill Evidence: {activity.skill}
                              </span>
                            )}
                            <span className="ml-2 text-xs text-gray-500">
                              {new Date(activity.date).toLocaleDateString()}
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
                            alert(`Viewing skill passport for ${student.name}`)
                          }}
                          className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded"
                        >
                          {t('skillPassport.title')}
                        </button>
                        <button
                          onClick={() => {
                            alert(`Viewing projects for ${student.name}`)
                          }}
                          className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded"
                        >
                          {t('projects.title')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skill progress overview */}
          <div>
            <h2 className="text-xl font-semibold mb-4">{t('dashboard.skillProgress')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { name: "Problem Solving", progress: 75, color: "blue" },
                { name: "Creativity", progress: 60, color: "purple" },
                { name: "Communication", progress: 45, color: "green" },
                { name: "Critical Thinking", progress: 30, color: "orange" },
                { name: "Collaboration", progress: 55, color: "red" },
                { name: "Research", progress: 40, color: "indigo" }
              ].map((skill, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{skill.name}</h3>
                    <span className="text-sm font-medium">{skill.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div
                      className={`${colorMap[skill.color] || 'bg-blue-500'} h-2.5 rounded-full`}
                      style={{ width: `${skill.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {t('common.estimatedTimeToNextLevel', { defaultValue: '~2 months to next level' })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-xl font-semibold mb-4">{t('dashboard.quickActions')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button
                onClick={() => alert('View all students')}
                className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{t('common.viewAll')}</h3>
                    <p className="text-sm text-gray-500">{t('dashboard.students')}</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => alert('View skill passport')}
                className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-shrink-0 h-8 w-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7 20l10-10M5 5l10 10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{t('skillPassport.title')}</h3>
                    <p className="text-sm text-gray-500">{t('common.view')}</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => alert('Browse challenges')}
                className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-shrink-0 h-8 w-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3-2-1.343-2-3-2zm0 10c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3-2-1.343-2-3-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{t('challenges.title')}</h3>
                    <p className="text-sm text-gray-500">{t('common.browse')}</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => alert('View portfolio')}
                className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-md flex items-center justify-center">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19l-6-6 6-6 6 6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{t('common.portfolio')}</h3>
                    <p className="text-sm text-gray-500">{t('common.view')}</p>
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