import { getServerSession } from "next-auth"
import { useSession, signIn } from "next-auth/react"
import { authOptions } from "../../api/auth/[...nextauth]"
import prisma from "../../../lib/prisma"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { useState } from "react"
import Layout from "../../../components/layout"
import { useTranslation } from "next-i18next"
import LoadingSkeleton from "../../../components/LoadingSkeleton"

export default function MentorChallengeDetail({ challenge }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [suggested, setSuggested] = useState(false)
  const [studentId, setStudentId] = useState('')

  const handleSuggest = async () => {
    if (!studentId.trim()) {
      alert('Please enter a student ID')
      return
    }

    setSuggesting(true)
    try {
      const res = await fetch(`/api/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': document.cookie,
        },
        body: JSON.stringify({
          challengeId: challenge.id,
          studentId: studentId.trim(),
        }),
      })

      if (res.ok) {
        setSuggested(true)
        alert('Challenge suggested successfully!')
      } else {
        const error = await res.json()
        alert('Failed to suggest challenge: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error suggesting challenge:', error)
      alert('An error occurred while suggesting the challenge.')
    } finally {
      setSuggesting(false)
    }
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

  if (!challenge) {
    return (
      <Layout>
        <p>{t('common.loading')}</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-6">
        <Link
          href="/mentor/challenges"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← {t('challenges.backToList')}
        </Link>
        <h1 className="text-2xl font-bold mt-4">{challenge.title}</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">
            {t('challenges.description')}
          </h2>
          <p className="text-gray-700 mb-4">{challenge.description}</p>
          <div className="flex items-center text-sm text-gray-500">
            <span className="mr-4">{t('challenges.grade')}: {challenge.grade}</span>
            <span>{t('challenges.subject')}: {challenge.subject}</span>
          </div>
        </div>

        {session.user.role === "MENTOR" ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-800">
              {t('mentor.suggestChallenge')}
            </h2>
            {!suggested ? (
              <>
                <p className="text-gray-600 mb-4">
                  {t('mentor.suggestChallengeDescription')}
                </p>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    {t('mentor.studentId')}
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder={t('mentor.enterStudentId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSuggest}
                  disabled={suggesting || !studentId.trim()}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded ${
                    suggesting ? 'opacity-50' : ''
                  }`}
                >
                  {suggesting ? t('common.sending') : t('mentor.suggestButton')}
                </button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-green-600 mb-4">
                  {t('mentor.suggestionSent')}
                </p>
                <button
                  onClick={() => {
                    setSuggested(false)
                    setStudentId('')
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  {t('common.tryAgain')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
            <h2 className="text-red-800 dark:text-red-200 text-lg font-medium mb-2">
              {t('common.error')}
            </h2>
            <p className="text-red-700 dark:text-red-300">
              {t('mentor.onlyMentors')}
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)

  // Check if user is a mentor
  if (!session || session.user.role !== "MENTOR") {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    }
  }

  try {
    const id = context.params.id
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