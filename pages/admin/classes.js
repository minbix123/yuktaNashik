import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import { useState, useEffect } from "react"
import Head from "next/head"
import Link from "next/link"

export default function ClassesPage({ classes, initialFilters }) {
  const [filteredClasses, setFilteredClasses] = useState(classes)
  const [filters, setFilters] = useState({
    schoolId: initialFilters.schoolId || '',
    grade: initialFilters.grade || '',
    teacherId: initialFilters.teacherId || '',
    page: initialFilters.page || 1,
    limit: initialFilters.limit || 10,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Apply filters whenever filters change
  useEffect(() => {
    applyFilters()
  }, [filters, classes])

  const applyFilters = () => {
    if (!classes) return

    let result = [...classes]

    // Filter by schoolId
    if (filters.schoolId) {
      result = result.filter(cls => cls.schoolId === filters.schoolId)
    }

    // Filter by grade
    if (filters.grade) {
      result = result.filter(cls => cls.grade === parseInt(filters.grade))
    }

    // Filter by teacherId
    if (filters.teacherId) {
      result = result.filter(cls => cls.teacherId === filters.teacherId)
    }

    // Pagination
    const start = (filters.page - 1) * filters.limit
    const end = start + filters.limit
    setFilteredClasses(result.slice(start, end))
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1, // Reset to first page when changing filters
    }))
  }

  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      page,
    }))
  }

  return (
    <div>
      <Head>
        <title>Manage Classes - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Manage Classes</h1>
        <Link href="/admin/classes/edit" className="btn btn-primary mb-6">
          Add New Class
        </Link>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School
              </label>
              <select
                value={filters.schoolId}
                onChange={(e) => handleFilterChange('schoolId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Schools</option>
                {/* We would need to fetch schools to populate this, but for simplicity we'll leave it empty for now */}
                {/* In a real app, we would fetch schools and map them to options */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade
              </label>
              <input
                type="number"
                value={filters.grade}
                onChange={(e) => handleFilterChange('grade', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teacher ID
              </label>
              <input
                type="text"
                value={filters.teacherId}
                onChange={(e) => handleFilterChange('teacherId', e.target.value)}
                placeholder="Teacher Profile ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Classes Table */}
        {loading ? (
          <p className="text-center py-8">Loading...</p>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4">
            <p>{error}</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No classes found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClasses.map((cls) => (
                  <tr key={cls.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cls.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cls.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cls.grade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cls.school?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cls.teacher?.user?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cls.students?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex space-x-2">
                      <Link
                        href={`/admin/classes/edit?id=${cls.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/classes/edit?id=${cls.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete class ${cls.name}?`)) {
                            // In a real app, we would call the delete API
                            alert("Delete functionality would be implemented here")
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {classes && classes.length > 0 && (
          <div className="flex items-center justify-between pt-6">
            <p className="text-sm text-gray-500">
              Showing {filteredClasses.length} of {classes.length} classes
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (filters.page > 1) {
                    handlePageChange(filters.page - 1)
                  }
                }}
                disabled={filters.page === 1}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  if (filters.page * filters.limit < classes.length) {
                    handlePageChange(filters.page + 1)
                  }
                }}
                disabled={filters.page * filters.limit >= classes.length}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
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

  try {
    // Fetch classes with related data
    const classes = await prisma.class.findMany({
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
        students: {
          include: {
            student: {
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
        },
      },
      orderBy: { name: 'asc' },
    })

    // Initial filters (can be overridden by query parameters in a more advanced implementation)
    const initialFilters = {
      schoolId: '',
      grade: '',
      teacherId: '',
      page: 1,
      limit: 10,
    }

    return {
      props: {
        classes: JSON.parse(JSON.stringify(classes)),
        initialFilters,
      },
    }
  } catch (error) {
    console.error("Error fetching classes:", error)
    return {
      props: {
        classes: [],
        initialFilters: {
          schoolId: '',
          grade: '',
          teacherId: '',
          page: 1,
          limit: 10,
        },
      },
    }
  }
}