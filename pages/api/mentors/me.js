import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]"
import prisma from "../../../lib/prisma"
import { validateSchema, sendValidationError } from "../../../lib/validation"

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Check if user is a mentor
  if (session.user.role !== "MENTOR") {
    return res.status(403).json({ error: "Forbidden: Mentor access required" })
  }

  if (req.method === "GET") {
    try {
      // Get mentor profile
      const mentorProfile = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        }
      })

      // In a full implementation, there would be a MentorProfile model
      // For now, we'll return basic user info with mentor role

      return res.status(200).json({
        ...mentorProfile,
        role: "MENTOR",
        expertiseAreas: [], // Would come from MentorProfile
        availability: {}    // Would come from MentorProfile
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const validation = validateSchema(req.body, "mentorProfile", { partial: true })
      if (!validation.valid) return sendValidationError(res, validation.errors)
      const { expertiseAreas, availability, bio } = validation.data
      if (expertiseAreas === undefined && availability === undefined && bio === undefined) {
        return sendValidationError(res, {
          form: {
            en: "Provide at least one field to update.",
            mr: "अपडेट करण्यासाठी किमान एक क्षेत्र द्या.",
          },
        })
      }

      // Update mentor profile
      // In a full implementation, this would update a MentorProfile model
      // For now, we'll update basic user fields

      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          // bio would be in MentorProfile, name would be updated here
          // For demo, we'll just update what we can
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
        role: "MENTOR",
        expertiseAreas: expertiseAreas || [],
        availability: availability || {}
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle other methods
  return res.status(405).json({ error: "Method not allowed" })
}