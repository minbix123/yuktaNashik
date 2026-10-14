import { useSession, signIn } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/layout"
import { useTranslation } from 'next-i18next/pages'

export default function ChallengesPage() {
  const { t } = useTranslation()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")

  const fetchChallenges = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/challenges?page=1&limit=100")
      if (!res.ok) throw new Error("Failed to fetch challenges")
      const data = await res.json()
      setChallenges(Array.isArray(data) ? data : (data.challenges || []))
    } catch (error) {
      console.error(error)
      setError(error.message || "Failed to fetch challenges")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "authenticated") {
      Promise.resolve().then(() => fetchChallenges())
    } else if (status === "unauthenticated") {
      Promise.resolve().then(() => setLoading(false))
    }
  }, [status, fetchChallenges])

  async function handleStartProject(challengeId) {
    if (!session) {
      return signIn()
    }

    if (session.user.role !== "STUDENT") {
      alert(t('challenges.onlyStudents'))
      return
    }

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          studentId: session.user.id,
        }),
      })
      if (!res.ok) throw new Error("Failed to start project")

      const project = await res.json()
      router.push(`/projects/${project.id}/workflow`)
    } catch (error) {
      console.error(error)
      alert(t('challenges.startFailed'))
    }
  }

  if (status === "loading") {
    return <Layout><p>{t('common.loading')}</p></Layout>
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            {t('challenges.availableChallenges')}
          </h1>
          <p className="text-gray-600 mb-8">
            {t('challenges.signInPrompt')}
          </p>
          <button
            onClick={() => signIn()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {t('auth.signIn')}
          </button>
        </div>
      </Layout>
    )
  }

  const subjects = Array.from(
    new Set([
      "Science",
      "Math",
      "Engineering",
      "Technology",
      "Environment",
      ...challenges.map((c) => c.subject).filter(Boolean),
    ])
  )

  const filteredChallenges = challenges.filter((challenge) => {
    const query = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !query ||
      (challenge.title && challenge.title.toLowerCase().includes(query)) ||
      (challenge.description && challenge.description.toLowerCase().includes(query)) ||
      (challenge.subject && challenge.subject.toLowerCase().includes(query))
    const matchesGrade =
      !selectedGrade || String(challenge.grade) === String(selectedGrade)
    const matchesSubject =
      !selectedSubject ||
      (challenge.subject && challenge.subject.toLowerCase() === selectedSubject.toLowerCase())
    return matchesSearch && matchesGrade && matchesSubject
  })

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {t('challenges.availableChallenges')}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {t('challenges.description')}
            </p>
          </div>
          {(session.user.role === "TEACHER" || session.user.role === "SCHOOL_ADMIN") && (
            <button
              type="button"
              onClick={() => router.push("/challenges/create")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {t('challenges.newChallenge', { defaultValue: 'New Challenge' })}
            </button>
          )}
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="challenge-search" className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.search')}
            </label>
            <input
              id="challenge-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('challenges.search', { defaultValue: 'Search challenges...' })}
              aria-label={t('challenges.search', { defaultValue: 'Search challenges...' })}
              className="border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="subject-filter" className="block text-sm font-medium text-gray-700 mb-1">
              {t('challenges.subject')}
            </label>
            <select
              id="subject-filter"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              aria-label={t('challenges.subject')}
              className="border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('challenges.subjectAll', { defaultValue: 'All Subjects' })}</option>
              {subjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="grade-filter" className="block text-sm font-medium text-gray-700 mb-1">
              {t('challenges.grade')}
            </label>
            <select
              id="grade-filter"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              aria-label={t('challenges.grade')}
              className="border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('challenges.gradeAll', { defaultValue: 'All Grades' })}</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                <option key={g} value={String(g)}>
                  {t('challenges.grade')} {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6 mb-4">
            <h2 className="text-red-800 dark:text-red-200 text-lg font-medium mb-2">
              {t('common.error')}
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-4">
              {error}
            </p>
            <button
              onClick={fetchChallenges}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6">
                <div className="h-8 w-3/4 bg-gray-200 animate-pulse rounded mb-2"></div>
                <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded mb-2"></div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-1/2 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-3 w-1/3 bg-gray-200 animate-pulse rounded ml-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredChallenges.length === 0 ? (
          <p className="text-center text-gray-500">
            {t('common.noData')}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredChallenges.map((challenge) => (
              <div key={challenge.id} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-2">{challenge.title}</h2>
                <p className="text-gray-600 mb-4">{challenge.description}</p>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {t('challenges.grade')}: {challenge.grade} • {t('challenges.subject')}: {challenge.subject}
                  </span>
                  <button
                    onClick={() => handleStartProject(challenge.id)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  >
                    {t('challenges.startProject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}