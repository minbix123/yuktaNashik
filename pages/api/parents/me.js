import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]"
import prisma from "../../../lib/prisma"
import { validateSchema, sendValidationError } from "../../../lib/validation"

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Check if user is a parent
  if (session.user.role !== "PARENT") {
    return res.status(403).json({ error: "Forbidden: Parent access required" })
  }

  if (req.method === "GET") {
    try {
      // Get parent profile with linked students
      // First, we need to find the parent profile linked to the user
      // For now, we'll return the user info and any linked students
      // In a full implementation, there would be a ParentProfile model

      // Get the user's information
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        }
      })

      // Get students linked to this parent (through some relationship)
      // For now, we'll return an empty array - this would be implemented
      // with a ParentProfile model that links to students
      const students = []

      return res.status(200).json({
        ...user,
        students,
        role: "PARENT"
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const validation = validateSchema(req.body, "profile", { partial: true })
      if (!validation.valid) return sendValidationError(res, validation.errors)
      const { name, email, phoneNumber, address } = validation.data
      if (name === undefined && email === undefined && phoneNumber === undefined && address === undefined) {
        return sendValidationError(res, {
          form: {
            en: "Provide at least one field to update.",
            mr: "अपडेट करण्यासाठी किमान एक क्षेत्र द्या.",
          },
        })
      }

      // Update parent profile information
      // In a full implementation, this would update a ParentProfile model
      // For now, we'll update the User model

      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          name: name || undefined,
          email: email || undefined,
          // Additional fields would be in ParentProfile
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        }
      })

      return res.status(200).json({
        ...updatedUser,
        role: "PARENT"
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle other methods
  return res.status(405).json({ error: "Method not allowed" })
}