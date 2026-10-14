import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]"
import prisma from "../../../lib/prisma"
import { useState, useEffect } from "react"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import ValidationMessage, { FormValidationSummary } from "../../../components/ValidationMessage"
import { validateSchema, getErrorMessage } from "../../../lib/validation"

export default function ClassEditPage({ classData, schools, teachers, initialSchoolId }) {
  const router = useRouter()
  const [name, setName] = useState(classData?.name || "")
  const [grade, setGrade] = useState(classData?.grade ? String(classData.grade) : "")
  const [schoolId, setSchoolId] = useState(classData?.schoolId || initialSchoolId || "")
  const [teacherId, setTeacherId] = useState(classData?.teacherId || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (classData) {
      setName(classData.name)
      setGrade(String(classData.grade))
      setSchoolId(classData.schoolId || "")
      setTeacherId(classData.teacherId || "")
    }
  }, [classData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    setFieldErrors({})

    const validation = validateSchema({ name, grade, schoolId, teacherId }, "class")
    if (!validation.valid) {
      setFieldErrors(validation.errors)
      setLoading(false)
      return
    }

    try {
      const isEditing = Boolean(router.query.id)
      const endpoint = isEditing ? `/api/classes?id=${router.query.id}` : "/api/classes"
      const body = isEditing
        ? { name: validation.data.name, grade: validation.data.grade, teacherId: validation.data.teacherId }
        : validation.data
      const res = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        if (payload?.errors) setFieldErrors(payload.errors)
        throw new Error(getErrorMessage(payload, "Unable to save class. वर्ग जतन करता आला नाही."))
      }

      setSuccess(true)
      // Redirect to classes list after a short delay
      setTimeout(() => {
        router.push("/admin/classes")
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
        <title>{router.query.id ? "Edit Class" : "New Class"} - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          {router.query.id ? "Edit Class" : "New Class"}
        </h1>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6">
            <p>{router.query.id ? "Class updated successfully!" : "Class created successfully!"}</p>
          </div>
        )}
        <FormValidationSummary errors={fieldErrors} />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="class-name" className="block text-sm font-medium text-gray-700 mb-2">
              Class Name
            </label>
            <input
              id="class-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "class-name-error" : undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ValidationMessage id="class-name-error" error={fieldErrors.name} />
          </div>
          <div>
            <label htmlFor="class-grade" className="block text-sm font-medium text-gray-700 mb-2">
              Grade
            </label>
            <input
              id="class-grade"
              type="number"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
              min="1"
              max="12"
              aria-invalid={Boolean(fieldErrors.grade)}
              aria-describedby={fieldErrors.grade ? "class-grade-error" : undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ValidationMessage id="class-grade-error" error={fieldErrors.grade} />
          </div>
          <div>
            <label htmlFor="class-school" className="block text-sm font-medium text-gray-700 mb-2">
              School
            </label>
            <select
              id="class-school"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.schoolId)}
              aria-describedby={fieldErrors.schoolId ? "class-school-error" : undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <ValidationMessage id="class-school-error" error={fieldErrors.schoolId} />
          </div>
          <div>
            <label htmlFor="class-teacher" className="block text-sm font-medium text-gray-700 mb-2">
              Teacher (optional)
            </label>
            <select
              id="class-teacher"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              aria-invalid={Boolean(fieldErrors.teacherId)}
              aria-describedby={fieldErrors.teacherId ? "class-teacher-error" : undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No teacher assigned</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.user?.name || "Unnamed"}
                </option>
              ))}
            </select>
            <ValidationMessage id="class-teacher-error" error={fieldErrors.teacherId} />
          </div>
          <div className="flex items-center justify-between">
            <Link
              href="/admin/classes"
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
              {loading ? "Saving..." : router.query.id ? "Update Class" : "Create Class"}
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

  let classData = null
  let schools = []
  let teachers = []

  const classId = context.query.id ? String(context.query.id) : undefined

  try {
    const [fetchedSchools, fetchedTeachers, fetchedClass] = await Promise.all([
      prisma.school.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.teacherProfile.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      }),
      classId
        ? prisma.class.findUnique({
            where: { id: classId },
            include: {
              school: true,
              teacher: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      role: true,
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve(null),
    ])

    schools = fetchedSchools
    teachers = fetchedTeachers
    classData = fetchedClass

    if (classId) {
      if (!classData) {
        return {
          redirect: {
            destination: "/admin/classes",
            permanent: false,
          },
        }
      }

      // Check if school admin is trying to edit a class that is not in their school
      if (isSchoolAdmin && classData.schoolId !== adminSchoolId) {
        return {
          redirect: {
            destination: "/admin/classes",
            permanent: false,
          },
        }
      }
    }
  } catch (error) {
    console.error("Error fetching data for class edit page:", error)
    return {
      redirect: {
        destination: isSchoolAdmin ? "/admin/school-admin" : "/admin/platform-admin",
        permanent: false,
      },
    }
  }

  return {
    props: {
      classData: classData ? JSON.parse(JSON.stringify(classData)) : null,
      schools: JSON.parse(JSON.stringify(schools)),
      teachers: JSON.parse(JSON.stringify(teachers)),
      initialSchoolId: adminSchoolId || null,
    },
  }
}