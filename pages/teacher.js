import { useSession, signIn, signOut } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import { useTranslationHook } from "../lib/use-translation"
import Layout from "../components/layout"
import LoadingSkeleton from "../components/LoadingSkeleton"

export default function TeacherDashboard() {
  const { data: session, status } = useSession()
  const { t } = useTranslationHook()
  const [teacherData, setTeacherData] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTeacherData = useCallback(async () => {
    if (!session) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get teacher profile (which already includes classes)
      const teacherRes = await fetch(`/api/teachers/me`)
      if (!teacherRes.ok) {
        throw new Error("Failed to fetch teacher profile")
      }
      const teacher = await teacherRes.json()
      setTeacherData(teacher)

      if (Array.isArray(teacher.classes)) {
        setClasses(teacher.classes)
      } else {
        const classesRes = await fetch(`/api/classes?teacherId=${teacher.teacherProfile?.id || teacher.id}`)
        if (!classesRes.ok) {
          throw new Error("Failed to fetch classes")
        }
        const classesData = await classesRes.json()
        setClasses(classesData.classes || [])
      }
    } catch (err) {
      console.error(err)
      setError("Failed to load teacher data")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (status === "loading") return
    Promise.resolve().then(() => fetchTeacherData())
  }, [fetchTeacherData, status])

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
          <p className="text-gray-600 mb-8">{t('profile.pleaseSignInToView', { defaultValue: 'Please sign in to view teacher dashboard' })}</p>
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
            onClick={() => fetchTeacherData()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </Layout>
    )
  }

  // Check if user is actually a teacher
  if (session.user.role !== "TEACHER") {
    return (
      <Layout>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-red-800 font-bold mb-4">{t('common.error')}</h2>
          <p className="text-red-600">
            {t('teacher.accessDenied', { defaultValue: 'Access denied: Teacher role required' })}
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {t('dashboard.welcome')}, {teacherData?.name || teacherData?.user?.name || session.user.name || 'Teacher'}!
            </h1>
            <p className="text-gray-600">{t('dashboard.overview')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => signOut()} className="text-gray-500 hover:text-gray-700">
              {t('auth.signOut')}
            </button>
          </div>
        </div>

        {/* Classes overview */}
        <div>
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.myClasses')}</h2>
          {classes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {t('dashboard.noClassesFound', { defaultValue: 'No classes found. Contact school administrator to be assigned to a class.' })}
            </p>
          ) : (
            <div className="space-y-4">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{cls.name}</h3>
                      <p className="text-sm text-gray-500">
                        Grade {cls.grade} • {cls.school?.name || teacherData?.school?.name || 'School'}
                      </p>
                    </div>
                    <div className="text-sm">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Class stats */}
                  <div className="mt-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-1">{t('dashboard.students')}</h4>
                        <p className="text-2xl font-bold text-gray-800">{cls.students?.length || 0}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-1">{t('dashboard.projects')}</h4>
                        <p className="text-2xl font-bold text-gray-800">
                          0
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-1">{t('dashboard.skillEvidence')}</h4>
                        <p className="text-2xl font-bold text-gray-800">
                          0
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recent activity */}
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-700 mb-2">{t('dashboard.recentActivity')}</h4>
                    <div className="space-y-2">
                      {[1, 2, 3].map((_, index) => (
                        <div key={index} className="flex items-start mb-2">
                          <div className="flex-shrink-0 mt-0.5 h-2.5 w-2.5 bg-blue-100 rounded"></div>
                          <div className="ml-2">
                            <span className="text-sm text-blue-600">
                              Student submitted project: &quot;Water Filtration System&quot;
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              2 hours ago
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          alert(`Viewing details for class: ${cls.name}`)
                        }}
                        className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded"
                      >
                        {t('common.viewDetails')}
                      </button>
                      <button
                        onClick={() => {
                          alert(`Creating new challenge for class: ${cls.name}`)
                        }}
                        className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded"
                      >
                        {t('dashboard.createChallenge')}
                      </button>
                      <button
                        onClick={() => {
                          alert(`Viewing submissions for class: ${cls.name}`)
                        }}
                        className="w-full text-left px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded"
                      >
                        {t('dashboard.viewSubmissions')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending evaluations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.pendingEvaluations')}</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Student Name {index + 1}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Grade 5 • Example School
                    </p>
                  </div>
                  <div className="text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Pending Review</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <h4 className="font-medium text-gray-700 mb-2">{t('dashboard.projectTitle')}</h4>
                  <p className="text-gray-600">Water Conservation Project</p>
                </div>

                <div className="mt-3">
                  <h4 className="font-medium text-gray-700 mb-2">{t('dashboard.submissionDate')}</h4>
                  <p className="text-gray-600">
                    Jan 15, 2024
                  </p>
                </div>

                {/* Action buttons */}
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        alert(`Evaluating submission for Student Name ${index + 1}`)
                      }}
                      className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded"
                    >
                      {t('dashboard.evaluateSubmission')}
                    </button>
                    <button
                      onClick={() => {
                        alert(`Viewing details for Student Name ${index + 1}`)
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
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.quickActions')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => alert('View all classes')}
              className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center mb-2">
                <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{t('common.viewAll')}</h3>
                  <p className="text-sm text-gray-500">{t('dashboard.classes')}</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => alert('Create challenge')}
              className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center mb-2">
                <div className="flex-shrink-0 h-8 w-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{t('dashboard.createChallenge')}</h3>
                  <p className="text-sm text-gray-500">{t('common.new')}</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3-2-1.343-2-3-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{t('challenges.title')}</h3>
                  <p className="text-sm text-gray-500">{t('common.browse')}</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => alert('View skill evidence')}
              className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center mb-2">
                <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-md flex items-center justify-center">
                  <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19l-6-6 6-6 6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{t('common.skillEvidence')}</h3>
                  <p className="text-sm text-gray-500">{t('common.view')}</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => alert('Enter grades')}
              className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center mb-2">
                <div className="flex-shrink-0 h-8 w-8 bg-orange-100 rounded-md flex items-center justify-center">
                  <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22s8-4 8-12V5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{t('dashboard.enterGrades')}</h3>
                  <p className="text-sm text-gray-500">{t('common.action')}</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}