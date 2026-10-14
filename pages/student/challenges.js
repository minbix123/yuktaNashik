import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import Head from "next/head"
import Link from "next/link"

export default function StudentChallengesPage({ challenges }) {
  return (
    <div>
      <Head>
        <title>Browse Challenges - Yukta Nashik</title>
      </Head>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Browse Challenges</h1>
        <p className="text-gray-500 mb-6">
          Explore available challenges and start a project.
        </p>

        {challenges.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {challenges.map((challenge) => (
              <Link
                key={challenge.id}
                href={`/student/challenges/${challenge.id}`}
                className="group"
              >
                <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">{challenge.title}</h2>
                    <p className="text-gray-600 mb-4 line-clamp-3">{challenge.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="mr-4">Grade: {challenge.grade}</span>
                      <span>Subject: {challenge.subject}</span>
                    </div>
                  </div>
                </div>
              </Link>
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