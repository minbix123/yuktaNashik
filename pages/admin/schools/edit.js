import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]"
import prisma from "../../../lib/prisma"
import { useState } from "react"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import ValidationMessage, { FormValidationSummary } from "../../../components/ValidationMessage"
import { validateSchema, getErrorMessage } from "../../../lib/validation"

export default function SchoolEditPage({ school }) {
  const router = useRouter()
  const [name, setName] = useState(school?.name || "")
  const [address, setAddress] = useState(school?.address || "")
  const [contactEmail, setContactEmail] = useState(school?.contactEmail || "")
  const [contactPhone, setContactPhone] = useState(school?.contactPhone || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    setFieldErrors({})
    const validation = validateSchema({ name, address, contactEmail, contactPhone }, "school")
    if (!validation.valid) {
      setFieldErrors(validation.errors)
      setLoading(false)
      return
    }

    try {
      const isEditing = Boolean(router.query.id)
      const endpoint = isEditing ? `/api/schools?id=${router.query.id}` : "/api/schools"
      const res = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        if (payload?.errors) setFieldErrors(payload.errors)
        throw new Error(getErrorMessage(payload, "Unable to save school. / शाळा जतन करता आली नाही."))
      }

      setSuccess(true)
      // Redirect to schools list after a short delay
      setTimeout(() => {
        router.push("/admin/schools")
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
        <title>{router.query.id ? "Edit School" : "New School"} - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          {router.query.id ? "Edit School" : "New School"}
        </h1>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6">
            <p>{router.query.id ? "School updated successfully!" : "School created successfully!"}</p>
          </div>
        )}
        <FormValidationSummary errors={fieldErrors} />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="school-name" className="block text-sm font-medium text-gray-700 mb-2">
              School Name
            </label>
            <input
              id="school-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "school-name-error" : undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ValidationMessage id="school-name-error" error={fieldErrors.name} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              aria-invalid={Boolean(fieldErrors.address)}
              aria-describedby={fieldErrors.address ? "school-address-error" : undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ValidationMessage id="school-address-error" error={fieldErrors.address} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                aria-invalid={Boolean(fieldErrors.contactEmail)}
                aria-describedby={fieldErrors.contactEmail ? "school-email-error" : undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <ValidationMessage id="school-email-error" error={fieldErrors.contactEmail} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                aria-invalid={Boolean(fieldErrors.contactPhone)}
                aria-describedby={fieldErrors.contactPhone ? "school-phone-error" : undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <ValidationMessage id="school-phone-error" error={fieldErrors.contactPhone} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Link
              href="/admin/schools"
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
              {loading ? "Saving..." : router.query.id ? "Update School" : "Create School"}
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

  let school = null
  const schoolId = context.query.id ? String(context.query.id) : undefined

  if (schoolId) {
    // Editing an existing school
    try {
      school = await prisma.school.findUnique({
        where: { id: schoolId },
      })

      if (!school) {
        return {
          redirect: {
            destination: "/admin/schools",
            permanent: false,
          },
        }
      }

      // Check if school admin is trying to edit a school that is not theirs
      if (session.user.role === "SCHOOL_ADMIN") {
        if (session.user.schoolId !== schoolId) {
          return {
            redirect: {
              destination: "/admin/schools",
              permanent: false,
            },
          }
        }
      }
    } catch (error) {
      console.error("Error fetching school:", error)
      return {
        redirect: {
          destination: "/admin/schools",
          permanent: false,
        },
      }
    }
  } else {
    // Creating a new school or editing own school (for school admin)
    if (session.user.role === "SCHOOL_ADMIN") {
      // School admin with no id: edit their own school
      const adminSchoolId = session.user.schoolId
      if (adminSchoolId) {
        try {
          school = await prisma.school.findUnique({
            where: { id: adminSchoolId },
          })
        } catch (error) {
          console.error("Error fetching school for school admin:", error)
        }
      }
    }
    // If school is still null, we're creating a new school
  }

  return {
    props: {
      school: school ? JSON.parse(JSON.stringify(school)) : null,
    },
  }
}