import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import Head from "next/head"
import Link from "next/link"

export default function SchoolsPage({ schools }) {
  return (
    <div>
      <Head>
        <title>Manage Schools - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Manage Schools</h1>
        <Link href="/admin/schools/edit" className="btn btn-primary mb-6">
          Add New School
        </Link>
        {schools.length === 0 ? (
          <p className="text-gray-500">No schools found.</p>
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
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schools.map((school) => (
                  <tr key={school.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {school.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {school.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {school.address || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {school.contactEmail || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {school.contactPhone || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link
                        href={`/admin/schools/edit?id=${school.id}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    let schools
    if (session.user.role === "PLATFORM_ADMIN") {
      // Platform admin sees all schools
      schools = await prisma.school.findMany({
        orderBy: { name: 'asc' },
      })
    } else {
      // School admin sees only their school
      const schoolId = session.user.schoolId
      if (!schoolId) {
        return {
          props: {
            schools: [],
          },
        }
      }
      schools = await prisma.school.findMany({
        where: { id: schoolId },
      })
    }

    return {
      props: {
        schools: JSON.parse(JSON.stringify(schools)),
      },
    }
  } catch (error) {
    console.error("Error fetching schools:", error)
    return {
      props: {
        schools: [],
      },
    }
  }
}