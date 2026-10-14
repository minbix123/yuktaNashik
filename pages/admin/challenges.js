import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import Head from "next/head"
import Link from "next/link"
import { useState } from "react"

export default function AdminChallengesPage({ challenges }) {
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/challenges`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': document.cookie,
        },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        // Remove the deleted challenge from the list
        // We'll refetch by updating the state via getServerSideProps, but for simplicity we'll filter locally
        // In a real app, we might use SWR or react-query
        window.location.reload()
      } else {
        const error = await res.json()
        alert('Failed to delete challenge: ' + (error.error || res.statusText))
      }
    } catch (error) {
      console.error('Error deleting challenge:', error)
      alert('An error occurred while deleting the challenge.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <Head>
        <title>Manage Challenges - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-start sm:items-center">
          <h1 className="text-3xl font-bold">Manage Challenges</h1>
          <Link
            href="/admin/challenges/create"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Create New Challenge
          </Link>
        </div>
        <p className="text-gray-500 mb-6">
          Platform-wide challenge management.
        </p>

        {challenges.length > 0 ? (
          <div className="space-y-6">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="p-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">{challenge.title}</h2>
                    <p className="text-gray-600 mb-4 line-clamp-3">{challenge.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="mr-4">Grade: {challenge.grade}</span>
                      <span>Subject: {challenge.subject}</span>
                    </div>
                  </div>
                  <div className="space-x-3">
                    <Link
                      href={`/admin/challenges/${challenge.id}/edit`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </Link>
                    {deletingId === challenge.id ? (
                      <button
                        disabled
                        className="px-3 py-1 bg-gray-300 text-gray-600 rounded"
                      >
                        Deleting...
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(challenge.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No challenges available at the moment.</p>
        )}
      </main>
    </div>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)

  // Check if user is a platform admin
  if (!session || session.user.role !== "PLATFORM_ADMIN") {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    }
  }

  try {
    const challenges = await prisma.challenge.findMany({
      orderBy: { createdAt: "desc" },
    })

    return {
      props: {
        challenges: JSON.parse(JSON.stringify(challenges)),
      },
    }
  } catch (error) {
    console.error('Error fetching challenges:', error)
    return {
      props: {
        challenges: [],
      },
    }
  }
}