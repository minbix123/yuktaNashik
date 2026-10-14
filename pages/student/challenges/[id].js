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

export default function StudentChallengeDetail({ challenge, studentProfileId }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  const handleStartProject = async () => {
    if (!session) {
      return signIn()
    }

    if (session.user.role !== "STUDENT") {
      alert(t('challenges.onlyStudents'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          studentId: studentProfileId || session.user.id,
        }),
      })
      if (!res.ok) throw new Error("Failed to start project")

      const project = await res.json()
      router.push(`/projects/${project.id}/workflow`)
    } catch (error) {
      console.error(error)
      alert(t('challenges.startFailed'))
    } finally {
      setLoading(false)
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
          href="/student/challenges"
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

        {session.user.role === "STUDENT" ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-800">
              {t('challenges.startProject')}
            </h2>
            <p className="text-gray-600 mb-4">
              {t('challenges.startProjectDescription')}
            </p>
            <button
              onClick={handleStartProject}
              disabled={loading}
              className={`bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded ${
                loading ? 'opacity-50' : ''
              }`}
            >
              {loading ? t('common.creating') : t('challenges.startProjectButton')}
            </button>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
            <h2 className="text-red-800 dark:text-red-200 text-lg font-medium mb-2">
              {t('common.error')}
            </h2>
            <p className="text-red-700 dark:text-red-300">
              {t('challenges.onlyStudents')}
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)

  // Check if user is a student
  if (!session || session.user.role !== "STUDENT") {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    }
  }

  try {
    const id = context.params.id
    const [challenge, studentProfile] = await Promise.all([
      prisma.challenge.findUnique({
        where: { id },
      }),
      prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      }),
    ])

    return {
      props: {
        challenge: challenge ? JSON.parse(JSON.stringify(challenge)) : null,
        studentProfileId: studentProfile?.id || null,
      },
    }
  } catch (error) {
    console.error('Error fetching challenge:', error)
    return {
      props: {
        challenge: null,
        studentProfileId: null,
      },
    }
  }
}