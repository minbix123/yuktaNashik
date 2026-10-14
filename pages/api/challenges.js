import { getServerSession } from "next-auth"
import { authOptions } from "./auth/[...nextauth]"
import prisma from "../../lib/prisma"
import { validateSchema, sendValidationError } from "../../lib/validation"

function respondValidationError(res, errors) {
  const result = sendValidationError(res, errors)
  if (result !== undefined) return result
  return res.status(400).json({
    error: "Validation failed",
    message: {
      en: "Please correct the highlighted fields and try again.",
      mr: "कृपया दाखवलेली क्षेत्रे दुरुस्त करून पुन्हा प्रयत्न करा.",
    },
    errors,
  })
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Handle GET: list challenges with pagination
  if (req.method === "GET") {
    try {
      const { page = 1, limit = 100 } = req.query
      const pageNum = parseInt(page, 10)
      const limitNum = parseInt(limit, 10)
      const skip = (pageNum - 1) * limitNum

      const [challenges, totalCount] = await prisma.$transaction([
        prisma.challenge.findMany({
          skip,
          take: limitNum,
          orderBy: { createdAt: "desc" },
        }),
        prisma.challenge.count(),
      ])

      return res.status(200).json({
        challenges,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Teachers, school admins, and platform admins can create challenges
  if (req.method === "POST") {
    if (
      session.user.role !== "TEACHER" &&
      session.user.role !== "SCHOOL_ADMIN" &&
      session.user.role !== "PLATFORM_ADMIN"
    ) {
      return res.status(403).json({ error: "Forbidden" })
    }

    try {
      const validation = validateSchema(req.body, "challenge")
      if (!validation.valid) return respondValidationError(res, validation.errors)

      const { title, description, grade, subject, classId } = validation.data

      const teacherProfile =
        typeof prisma.teacherProfile?.findUnique === "function"
          ? await prisma.teacherProfile.findUnique({
              where: { userId: session.user.id },
            })
          : null

      const challenge = await prisma.challenge.create({
        data: {
          title,
          description,
          grade,
          subject,
          classId: classId || null,
          teacherId: teacherProfile ? teacherProfile.id : null,
        },
      })

      return res.status(201).json(challenge)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle PUT: update a challenge
  if (req.method === "PUT") {
    if (
      session.user.role !== "PLATFORM_ADMIN" &&
      session.user.role !== "SCHOOL_ADMIN" &&
      session.user.role !== "TEACHER"
    ) {
      return res.status(403).json({ error: "Forbidden" })
    }

    try {
      if (session.user.role === "TEACHER") {
        const checkId = typeof (req.body?.id || req.query?.id) === "string" ? (req.body?.id || req.query?.id).trim() : ""
        const teacherProfile =
          typeof prisma.teacherProfile?.findUnique === "function"
            ? await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } })
            : null
        const existingChallenge =
          checkId && typeof prisma.challenge?.findUnique === "function"
            ? await prisma.challenge.findUnique({ where: { id: checkId } })
            : null
        if (!teacherProfile || !existingChallenge || existingChallenge.teacherId !== teacherProfile.id) {
          return res.status(403).json({ error: "Forbidden" })
        }
      }

      const validation = validateSchema(req.body, "challenge")
      if (!validation.valid) return respondValidationError(res, validation.errors)
      const rawId = req.body?.id || req.query?.id
      const id = typeof rawId === "string" ? rawId.trim() : ""
      if (!id) {
        return respondValidationError(res, {
          id: {
            en: "A challenge ID is required.",
            mr: "चॅलेंज आयडी आवश्यक आहे.",
          },
        })
      }

      const { title, description, grade, subject, classId } = validation.data

      const challenge = await prisma.challenge.update({
        where: { id },
        data: {
          title,
          description,
          grade,
          subject,
          classId: classId || null,
        },
      })

      return res.status(200).json(challenge)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle DELETE: delete a challenge
  if (req.method === "DELETE") {
    if (
      session.user.role !== "PLATFORM_ADMIN" &&
      session.user.role !== "SCHOOL_ADMIN" &&
      session.user.role !== "TEACHER"
    ) {
      return res.status(403).json({ error: "Forbidden" })
    }

    try {
      const rawId = req.body?.id || req.query?.id
      const id = typeof rawId === "string" ? rawId.trim() : ""

      if (session.user.role === "TEACHER") {
        const teacherProfile =
          typeof prisma.teacherProfile?.findUnique === "function"
            ? await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } })
            : null
        const existingChallenge =
          id && typeof prisma.challenge?.findUnique === "function"
            ? await prisma.challenge.findUnique({ where: { id } })
            : null
        if (!teacherProfile || !existingChallenge || existingChallenge.teacherId !== teacherProfile.id) {
          return res.status(403).json({ error: "Forbidden" })
        }
      }

      if (!id) {
        return respondValidationError(res, {
          id: {
            en: "A challenge ID is required.",
            mr: "चॅलेंज आयडी आवश्यक आहे.",
          },
        })
      }

      if (typeof prisma.suggestion?.deleteMany === "function") {
        await prisma.suggestion.deleteMany({
          where: { challengeId: id },
        })
      }

      if (typeof prisma.project?.updateMany === "function") {
        await prisma.project.updateMany({
          where: { challengeId: id },
          data: { challengeId: null },
        })
      }

      await prisma.challenge.delete({
        where: { id },
      })

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle other methods
  return res.status(405).json({ error: "Method not allowed" })
}