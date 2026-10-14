import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import Head from "next/head"
import Link from "next/link"
import { useState } from "react"

export default function MentorChallengesPage({ challenges }) {
  const [suggesting, setSuggesting] = useState({}) // challengeId -> boolean
  const [suggestedTo, setSuggestedTo] = useState({}) // challengeId -> studentId

  const handleSuggest = async (challengeId) => {
    setSuggesting(prev => ({ ...prev, [challengeId]: true }))
    try {
      // For now, we'll just show a prompt to enter student ID
      // In a full implementation, this would open a modal to select/search for students
      const studentId = window.prompt("Enter student ID to suggest this challenge to:")
      if (!studentId) {
        setSuggesting(prev => ({ ...prev, [challengeId]: false }))
        return
      }

      const res = await fetch(`/api/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': document.cookie,
        },
        body: JSON.stringify({
          challengeId,
          studentId,
        }),
      })

      if (res.ok) {
        setSuggestedTo(prev => ({ ...prev, [challengeId]: studentId }))
        alert('Challenge suggested successfully!')
      } else {
        const error = await res.json()
        alert('Failed to suggest challenge: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error suggesting challenge:', error)
      alert('An error occurred while suggesting the challenge.')
    } finally {
      setSuggesting(prev => ({ ...prev, [challengeId]: false }))
    }
  }

  return (
    <div>
      <Head>
        <title>Browse Challenges - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Browse Challenges</h1>
        <p className="text-gray-500 mb-6">
          Explore available challenges to suggest to students.
        </p>

        {challenges.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between"
              >
                <Link
                  href={`/mentor/challenges/${challenge.id}`}
                  className="group block p-6"
                >
                  <h2 className="text-xl font-semibold mb-2 text-gray-800 group-hover:text-blue-600">{challenge.title}</h2>
                  <p className="text-gray-600 mb-4 line-clamp-3">{challenge.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-4">Grade: {challenge.grade}</span>
                    <span>Subject: {challenge.subject}</span>
                  </div>
                </Link>
                <div className="px-6 pb-6 pt-4 border-t border-gray-200">
                  {suggesting[challenge.id] ? (
                    <button
                      disabled
                      className="w-full px-3 py-2 bg-gray-300 text-gray-600 rounded"
                    >
                      Suggesting...
                    </button>
                  ) : suggestedTo[challenge.id] ? (
                    <button
                      onClick={() => handleSuggest(challenge.id)}
                      className="w-full px-3 py-2 bg-gray-300 text-gray-600 rounded"
                    >
                      Suggested to Student
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSuggest(challenge.id)}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded"
                    >
                      Suggest to Student
                    </button>
                  )}
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