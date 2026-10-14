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

  // Only students can create projects (by starting a challenge)
  if (req.method === "POST") {
    if (session.user.role !== "STUDENT") {
      return res.status(403).json({ error: "Forbidden" })
    }

    try {
      const validation = validateSchema(req.body, "project")
      if (!validation.valid) return respondValidationError(res, validation.errors)
      const { challengeId, studentId } = validation.data

      // Verify that the challenge exists
      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
      })

      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" })
      }

      // Verify that the student exists (studentId may be StudentProfile.id or User.id) and matches the session
      let student = null
      if (typeof prisma.studentProfile.findFirst === "function") {
        student = await prisma.studentProfile.findFirst({
          where: { OR: [{ id: studentId }, { userId: studentId }] },
          include: { user: true },
        })
      }
      if (!student && typeof prisma.studentProfile.findUnique === "function") {
        student =
          (await prisma.studentProfile.findUnique({
            where: { id: studentId },
            include: { user: true },
          })) ||
          (await prisma.studentProfile.findUnique({
            where: { userId: studentId },
            include: { user: true },
          }))
      }
      if (!student && studentId === session.user.id && typeof prisma.studentProfile.create === "function") {
        student = await prisma.studentProfile.create({
          data: { userId: session.user.id },
          include: { user: true },
        })
      }

      if (!student || student.userId !== session.user.id) {
        return res.status(403).json({ error: "Forbidden" })
      }

      const resolvedStudentId = student.id

      // Check if the student already has a project for this challenge
      const existingProject = await prisma.project.findFirst({
        where: {
          challengeId,
          studentId: resolvedStudentId,
        },
      })

      if (existingProject) {
        return res.status(400).json({ error: "Project already started for this challenge" })
      }

      const project = await prisma.project.create({
        data: {
          title: challenge.title,
          description: challenge.description,
          challengeId,
          studentId: resolvedStudentId,
          status: "LEARN",
        },
      })

      return res.status(201).json(project)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // GET: list projects for the current user
  if (req.method === "GET") {
    try {
      const { page = 1, limit = 50, studentId: queryStudentId } = req.query || {}
      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const limitNum = Math.max(1, parseInt(limit, 10) || 50)
      const skip = (pageNum - 1) * limitNum

      const projectSelect = {
        id: true,
        title: true,
        description: true,
        status: true,
        challengeId: true,
        studentId: true,
        challenge: {
          select: {
            id: true,
            title: true,
            description: true,
            grade: true,
            subject: true,
          },
        },
        student: {
          select: {
            id: true,
            userId: true,
            grade: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      }

      let where = {}
      if (session.user.role === "STUDENT") {
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: session.user.id },
        })
        if (!studentProfile) {
          return res.status(200).json({
            projects: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              totalCount: 0,
              totalPages: 0,
            },
          })
        }
        where = { studentId: studentProfile.id }
      } else if (
        session.user.role === "TEACHER" ||
        session.user.role === "SCHOOL_ADMIN" ||
        session.user.role === "PLATFORM_ADMIN" ||
        session.user.role === "MENTOR" ||
        session.user.role === "PARENT"
      ) {
        if (queryStudentId) {
          where = { studentId: String(queryStudentId) }
        }
      } else {
        return res.status(403).json({ error: "Forbidden" })
      }

      const projects = await prisma.project.findMany({
        where,
        select: projectSelect,
        skip,
        take: limitNum,
        orderBy: { updatedAt: "desc" },
      })

      if (req.query === undefined) {
        return res.status(200).json(projects)
      }

      const countResult =
        typeof prisma.project.count === "function"
          ? await prisma.project.count({ where })
          : undefined
      const totalCount = typeof countResult === "number" ? countResult : projects.length

      return res.status(200).json({
        projects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle other methods
  return res.status(405).json({ error: "Method not allowed" })
}