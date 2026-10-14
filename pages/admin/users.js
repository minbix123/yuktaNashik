import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import { useState, useEffect } from "react"
import Head from "next/head"
import Link from "next/link"

export default function UsersPage({ users, initialFilters }) {
  const [filteredUsers, setFilteredUsers] = useState(users)
  const [filters, setFilters] = useState({
    role: initialFilters.role || '',
    status: initialFilters.status || '',
    search: initialFilters.search || '',
    page: initialFilters.page || 1,
    limit: initialFilters.limit || 10,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Apply filters whenever filters change
  useEffect(() => {
    applyFilters()
  }, [filters, users])

  const applyFilters = () => {
    if (!users) return

    let result = [...users]

    // Filter by role
    if (filters.role) {
      result = result.filter(user => user.role === filters.role)
    }

    // Filter by status (we don't have a status field, so skip for now)
    // In a real app, we would filter by a status field on the user or profile

    // Filter by search
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      result = result.filter(user =>
        (user.name || '').toLowerCase().includes(searchTerm) ||
        (user.email || '').toLowerCase().includes(searchTerm)
      )
    }

    // Pagination
    const start = (filters.page - 1) * filters.limit
    const end = start + filters.limit
    setFilteredUsers(result.slice(start, end))
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
        <title>Manage Users - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Manage Users</h1>
        <Link href="/admin/users/edit" className="btn btn-primary mb-6">
          Add New User
        </Link>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="user-role-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                id="user-role-filter"
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="SCHOOL_ADMIN">School Admin</option>
                <option value="PLATFORM_ADMIN">Platform Admin</option>
                <option value="MENTOR">Mentor</option>
                <option value="PARENT">Parent</option>
              </select>
            </div>
            <div>
              <label htmlFor="user-status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="user-status-filter"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label htmlFor="user-search-input" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                id="user-search-input"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by name or email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <p className="text-center py-8">Loading...</p>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4">
            <p>{error}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No users found.</p>
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
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(user.studentProfile?.school?.name || user.teacherProfile?.school?.name) || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex space-x-2">
                      <Link
                        href={`/admin/users/edit?id=${user.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/users/edit?id=${user.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          // TODO: Replace with accessible modal dialog
                          console.log(`Delete user ${user.name}`);
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
        {users && users.length > 0 && (
          <div className="flex items-center justify-between pt-6">
            <p className="text-sm text-gray-500">
              Showing {filteredUsers.length} of {users.length} users
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
                  if (filters.page * filters.limit < users.length) {
                    handlePageChange(filters.page + 1)
                  }
                }}
                disabled={filters.page * filters.limit >= users.length}
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

  try {
    // Build where clause for fetching users
    const where = {}

    // For school admins, filter users by their school
    if (isSchoolAdmin) {
      // We need to filter users who are either students or teachers in the admin's school
      // Since schoolId is on the profiles, we check both studentProfile and teacherProfile
      where.OR = [
        { studentProfile: { schoolId: adminSchoolId } },
        { teacherProfile: { schoolId: adminSchoolId } }
      ]
    }

    // Fetch users with profiles
    const rawUsers = await prisma.user.findMany({
      where,
      include: {
        studentProfile: {
          include: {
            school: true
          }
        },
        teacherProfile: {
          include: {
            school: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    const users = rawUsers.map(({ passwordHash, ...rest }) => rest)

    // Initial filters (can be overridden by query parameters in a more advanced implementation)
    const initialFilters = {
      role: '',
      status: '',
      search: '',
      page: 1,
      limit: 10,
    }

    return {
      props: {
        users: JSON.parse(JSON.stringify(users)),
        initialFilters,
      },
    }
  } catch (error) {
    console.error("Error fetching users:", error)
    return {
      props: {
        users: [],
        initialFilters: {
          role: '',
          status: '',
          search: '',
          page: 1,
          limit: 10,
        },
      },
    }
  }
}