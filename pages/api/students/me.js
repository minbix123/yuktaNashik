import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]"
import prisma from "../../../lib/prisma"
import { validateSchema, sendValidationError } from "../../../lib/validation"

function sanitizeStudentProfile(profile) {
  if (!profile || typeof profile !== "object") return profile
  const copy = { ...profile }
  if (copy.user && typeof copy.user === "object") {
    copy.user = { ...copy.user }
    delete copy.user.passwordHash
  }
  return copy
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  if (req.method === "GET") {
    try {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        include: { user: true, school: true },
      })

      if (!studentProfile) {
        return res.status(404).json({ error: "Student profile not found" })
      }

      return res.status(200).json(sanitizeStudentProfile(studentProfile))
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const validation = validateSchema(req.body, "studentProfile", { partial: true })
      if (!validation.valid) return sendValidationError(res, validation.errors)
      const { name, email, grade } = validation.data
      if (name === undefined && email === undefined && grade === undefined) {
        return sendValidationError(res, {
          form: {
            en: "Provide at least one field to update.",
            mr: "अपडेट करण्यासाठी किमान एक क्षेत्र द्या.",
          },
        })
      }

      const profile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      })
      if (!profile) return res.status(404).json({ error: "Student profile not found" })

      if (name !== undefined || email !== undefined) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            name: name === undefined ? undefined : name,
            email: email === undefined ? undefined : email,
          },
        })
      }

      const updatedProfile = await prisma.studentProfile.update({
        where: { userId: session.user.id },
        data: { grade: grade === undefined ? undefined : grade },
        include: { user: true, school: true },
      })

      return res.status(200).json(sanitizeStudentProfile(updatedProfile))
    } catch (error) {
      if (error?.code === "P2002") {
        return res.status(400).json({ error: "Email is already in use" })
      }
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  return res.status(405).json({ error: "Method not allowed" })
}