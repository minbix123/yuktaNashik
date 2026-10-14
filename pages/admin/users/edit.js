import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]"
import prisma from "../../../lib/prisma"
import { useState } from "react"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import ValidationMessage, { FormValidationSummary } from "../../../components/ValidationMessage"
import { validateSchema, getErrorMessage } from "../../../lib/validation"

export default function UserEditPage({ user }) {
  const router = useRouter()
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [role, setRole] = useState(user?.role || "")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  // For school admins, we might want to show school association, but we'll keep it simple

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    setFieldErrors({})

    const isEditing = Boolean(router.query.id)
    const payload = { name, email, role, password: password || undefined }
    const validation = validateSchema(payload, isEditing ? "user" : "userCreate")
    if (!validation.valid) {
      setFieldErrors(validation.errors)
      setLoading(false)
      return
    }

    try {
      const endpoint = isEditing ? `/api/admin/users?id=${router.query.id}` : "/api/admin/users"
      const res = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        if (payload?.errors) setFieldErrors(payload.errors)
        throw new Error(getErrorMessage(payload, "Unable to save user. / वापरकर्ता जतन करता आला नाही."))
      }

      setSuccess(true)
      // Redirect to users list after a short delay
      setTimeout(() => {
        router.push("/admin/users")
      }, 1500)
    } catch (err) {
      console.error(err)
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Head>
        <title>{router.query.id ? "Edit User" : "New User"} - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          {router.query.id ? "Edit User" : "New User"}
        </h1>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6">
            <p>{router.query.id ? "User updated successfully!" : "User created successfully!"}</p>
          </div>
        )}
        <FormValidationSummary errors={fieldErrors} />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="user-name" className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              id="user-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "user-name-error" : undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ValidationMessage id="user-name-error" error={fieldErrors.name} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "user-email-error" : undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ValidationMessage id="user-email-error" error={fieldErrors.email} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.role)}
              aria-describedby={fieldErrors.role ? "user-role-error" : undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a role</option>
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="SCHOOL_ADMIN">School Admin</option>
              <option value="PLATFORM_ADMIN">Platform Admin</option>
              <option value="MENTOR">Mentor</option>
              <option value="PARENT">Parent</option>
            </select>
            <ValidationMessage id="user-role-error" error={fieldErrors.role} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password (leave blank to keep current)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "user-password-error" : undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ValidationMessage id="user-password-error" error={fieldErrors.password} />
          </div>
          <div className="flex items-center justify-between">
            <Link
              href="/admin/users"
              className="text-indigo-600 hover:text-indigo-900"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className={`btn btn-primary ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-indigo-700"
              }`}
            >
              {loading ? "Saving..." : router.query.id ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)

  // Check if user is platform admin or school admin
  if (!session || (session.user.role !== "PLATFORM_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    }
  }

  // Determine if user is school admin and get their schoolId
  const isSchoolAdmin = session.user.role === "SCHOOL_ADMIN"
  const adminSchoolId = isSchoolAdmin ? session.user.schoolId : null

  // If school admin but no schoolId associated, forbid access
  if (isSchoolAdmin && !adminSchoolId) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    }
  }

  let user = null
  const userId = context.query.id ? String(context.query.id) : undefined

  if (userId) {
    // Editing an existing user
    try {
      const rawUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          studentProfile: true,
          teacherProfile: true
        }
      })

      if (!rawUser) {
        return {
          redirect: {
            destination: "/admin/users",
            permanent: false,
          },
        }
      }

      // Check if school admin is trying to edit a user that is not in their school
      if (isSchoolAdmin) {
        const userSchoolId =
          rawUser.studentProfile?.schoolId ??
          rawUser.teacherProfile?.schoolId ??
          null

        if (userSchoolId !== adminSchoolId) {
          return {
            redirect: {
              destination: "/admin/users",
              permanent: false,
            },
          }
        }
      }

      const { passwordHash, ...safeUser } = rawUser
      user = safeUser
    } catch (error) {
      console.error("Error fetching user:", error)
      return {
        redirect: {
          destination: "/admin/users",
          permanent: false,
        },
      }
    }
  } else {
    // Creating a new user
    // We'll leave user as null for the form to be empty
  }

  return {
    props: {
      user: user ? JSON.parse(JSON.stringify(user)) : null,
    },
  }
}