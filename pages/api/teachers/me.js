import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]"
import prisma from "../../../lib/prisma"
import { validateSchema, sendValidationError } from "../../../lib/validation"

function sanitizeTeacherProfile(profile) {
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

  if (session.user.role !== "TEACHER") {
    return res.status(403).json({ error: "Forbidden: Teacher access required" })
  }

  if (req.method === "GET") {
    try {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          user: true,
          school: true,
          classes: {
            include: {
              students: true,
            },
          },
        },
      })

      if (!teacherProfile) {
        return res.status(404).json({ error: "Teacher profile not found" })
      }

      return res.status(200).json(sanitizeTeacherProfile(teacherProfile))
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const validation = validateSchema(req.body, "teacherProfile", { partial: true })
      if (!validation.valid) return sendValidationError(res, validation.errors)
      const { bio, subjectSpecialization, phoneNumber, address } = validation.data
      if (
        bio === undefined &&
        subjectSpecialization === undefined &&
        phoneNumber === undefined &&
        address === undefined
      ) {
        return sendValidationError(res, {
          form: {
            en: "Provide at least one field to update.",
            mr: "अपडेट करण्यासाठी किमान एक क्षेत्र द्या.",
          },
        })
      }

      const updatedTeacherProfile = await prisma.teacherProfile.update({
        where: { userId: session.user.id },
        data: {},
        include: {
          user: true,
          school: true,
        },
      })

      return res.status(200).json({
        ...sanitizeTeacherProfile(updatedTeacherProfile),
        ...(bio !== undefined ? { bio } : {}),
        ...(subjectSpecialization !== undefined ? { subjectSpecialization } : {}),
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  return res.status(405).json({ error: "Method not allowed" })
}