import Link from "next/link"
import { useSession, signIn, signOut } from "next-auth/react"
import { useTranslation } from 'next-i18next/pages'
import Layout from "../components/layout"

const DEMO_ACCOUNTS = [
  { role: "Student", email: "student@yuktanashik.org" },
  { role: "Teacher", email: "teacher@yuktanashik.org" },
  { role: "Mentor", email: "mentor@yuktanashik.org" },
  { role: "Parent", email: "parent@yuktanashik.org" },
  { role: "School Admin", email: "schooladmin@yuktanashik.org" },
  { role: "Platform Admin", email: "admin@yuktanashik.org" },
]

export default function Home() {
  const { t } = useTranslation()
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <p>{t('common.loading')}</p>
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-12 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('appName')}</h1>
            <p className="text-gray-600 mb-8">
              {t('challenges.description')}
            </p>
            <button
              onClick={() => signIn()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {t('auth.signIn')}
            </button>
          </div>

          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-left">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Demo Accounts (Local Dev)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Password for all demo accounts: <code className="bg-gray-100 px-1.5 py-0.5 rounded">password123</code>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_ACCOUNTS.map((account) => (
                <div
                  key={account.email}
                  className="flex items-center justify-between border border-gray-100 bg-gray-50 rounded p-3"
                >
                  <div>
                    <div className="font-medium text-sm text-gray-800">{account.role}</div>
                    <div className="text-xs text-gray-500">{account.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      signIn('credentials', {
                        email: account.email,
                        password: 'password123',
                        callbackUrl: '/',
                      })
                    }
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded"
                  >
                    Demo {account.role}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            {t('nav.home')} , {session.user.name}!
          </h1>
          <button
            type="button"
            onClick={() => signOut()}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
          >
            {t('auth.signOut')}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">
            {t('nav.home')}: {session.user.role}
          </h2>

          {session.user.role === "STUDENT" && (
            <div className="space-y-4">
              <p className="text-gray-600">
                {t('dashboard.welcome')}, {session.user.name}! {t('challenges.description')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/challenges"
                  className="block p-4 border rounded-lg hover:bg-blue-50 transition"
                >
                  <h3 className="font-semibold text-blue-700">{t('nav.challenges')}</h3>
                  <p className="text-sm text-gray-600">Browse and start learning challenges</p>
                </Link>
                <Link
                  href="/skill-passport"
                  className="block p-4 border rounded-lg hover:bg-green-50 transition"
                >
                  <h3 className="font-semibold text-green-700">{t('nav.skillPassport')}</h3>
                  <p className="text-sm text-gray-600">Track your verified skills and evidence</p>
                </Link>
              </div>
            </div>
          )}

          {session.user.role === "TEACHER" && (
            <div className="space-y-4">
              <p className="text-gray-600">
                {t('auth.signIn')} as {t('roles.teacher')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/teacher"
                  className="block p-4 border rounded-lg hover:bg-blue-50 transition"
                >
                  <h3 className="font-semibold text-blue-700">Teacher Dashboard</h3>
                  <p className="text-sm text-gray-600">Manage classes and student evaluations</p>
                </Link>
                <Link
                  href="/challenges/create"
                  className="block p-4 border rounded-lg hover:bg-green-50 transition"
                >
                  <h3 className="font-semibold text-green-700">Create Challenge</h3>
                  <p className="text-sm text-gray-600">Design a new challenge for students</p>
                </Link>
              </div>
            </div>
          )}

          {session.user.role === "MENTOR" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/mentor"
                  className="block p-4 border rounded-lg hover:bg-blue-50 transition"
                >
                  <h3 className="font-semibold text-blue-700">Mentor Dashboard</h3>
                  <p className="text-sm text-gray-600">Review student projects and skill evidence</p>
                </Link>
                <Link
                  href="/challenges"
                  className="block p-4 border rounded-lg hover:bg-purple-50 transition"
                >
                  <h3 className="font-semibold text-purple-700">{t('nav.challenges')}</h3>
                  <p className="text-sm text-gray-600">Explore student challenges</p>
                </Link>
              </div>
            </div>
          )}

          {session.user.role === "PARENT" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/parent"
                  className="block p-4 border rounded-lg hover:bg-blue-50 transition"
                >
                  <h3 className="font-semibold text-blue-700">Parent Dashboard</h3>
                  <p className="text-sm text-gray-600">View your child&apos;s progress and activities</p>
                </Link>
              </div>
            </div>
          )}

          {session.user.role === "SCHOOL_ADMIN" && (
            <div className="space-y-4">
              <p className="text-gray-600">
                {t('auth.signIn')} as {t('roles.schoolAdmin')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/admin/school-admin"
                  className="block p-4 border rounded-lg hover:bg-blue-50 transition"
                >
                  <h3 className="font-semibold text-blue-700">School Admin Dashboard</h3>
                  <p className="text-sm text-gray-600">Manage school classes, teachers, and students</p>
                </Link>
                <Link
                  href="/challenges/create"
                  className="block p-4 border rounded-lg hover:bg-green-50 transition"
                >
                  <h3 className="font-semibold text-green-700">Create Challenge</h3>
                  <p className="text-sm text-gray-600">Create a new challenge</p>
                </Link>
              </div>
            </div>
          )}

          {session.user.role === "PLATFORM_ADMIN" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/admin/platform-admin"
                  className="block p-4 border rounded-lg hover:bg-blue-50 transition"
                >
                  <h3 className="font-semibold text-blue-700">Platform Admin Dashboard</h3>
                  <p className="text-sm text-gray-600">Manage schools, users, and platform settings</p>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}