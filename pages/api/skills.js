import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"
import prisma from "../../lib/prisma"

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  if (req.method === "GET") {
    try {
      const skills = await prisma.skill.findMany({
        orderBy: { name: "asc" },
      })
      return res.status(200).json(skills)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle other methods
  return res.status(405).json({ error: "Method not allowed" })
}
