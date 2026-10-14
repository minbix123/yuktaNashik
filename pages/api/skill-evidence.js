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

  // GET: Fetch skill evidence
  if (req.method === "GET") {
    const { studentId } = req.query || {}

    // If studentId is provided, fetch evidence for that student
    // Otherwise, fetch evidence for the current user
    let targetStudentId = studentId
    if (!targetStudentId) {
      // Get the student profile for the current user
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      })
      if (!studentProfile) {
        return res.status(404).json({ error: "Student profile not found" })
      }
      targetStudentId = studentProfile.id
    } else {
      // If a specific studentId is requested, check permissions
      let studentProfile = await prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: { user: true },
      })
      if (!studentProfile) {
        studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: studentId },
          include: { user: true },
        })
      }
      if (!studentProfile) {
        return res.status(404).json({ error: "Student not found" })
      }
      targetStudentId = studentProfile.id

      const isOwnStudent = studentProfile.userId === session.user.id
      const isStaffOrAuthorized =
        session.user.role === "TEACHER" ||
        session.user.role === "SCHOOL_ADMIN" ||
        session.user.role === "PLATFORM_ADMIN" ||
        session.user.role === "MENTOR" ||
        session.user.role === "PARENT"
      if (!isOwnStudent && !isStaffOrAuthorized) {
        return res.status(403).json({ error: "Forbidden" })
      }
    }

    try {
      // Add pagination
      const { page = 1, limit = 100 } = req.query || {}
      const pageNum = parseInt(page, 10)
      const limitNum = parseInt(limit, 10)
      const skip = (pageNum - 1) * limitNum

      const [evidence, totalCount] = await prisma.$transaction([
        prisma.skillEvidence.findMany({
          where: { studentId: targetStudentId },
          include: {
            skill: true,
            project: {
              include: {
                challenge: true,
              },
            },
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: "desc" },
        }),
        prisma.skillEvidence.count({ where: { studentId: targetStudentId } }),
      ])

      return res.status(200).json({
        evidence,
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

  // POST: Create new skill evidence
  if (req.method === "POST") {
    try {
      const validation = validateSchema(req.body, "skillEvidence")
      if (!validation.valid) return respondValidationError(res, validation.errors)
      const { studentId, skillId, details, projectId, reflectionId } = validation.data

      // Get student profile to verify permissions
      let targetStudentId = studentId
      if (!targetStudentId) {
        // If no studentId provided, use current user's student profile
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: session.user.id },
        })
        if (!studentProfile) {
          return res.status(404).json({ error: "Student profile not found" })
        }
        targetStudentId = studentProfile.id
      }

      // Verify student exists (by StudentProfile.id or User.id)
      let studentExists = await prisma.studentProfile.findUnique({
        where: { id: targetStudentId }
      })
      if (!studentExists) {
        studentExists = await prisma.studentProfile.findUnique({
          where: { userId: targetStudentId }
        })
      }
      if (!studentExists) {
        return res.status(404).json({ error: "Student not found" })
      }
      targetStudentId = studentExists.id

      // Check permissions: user can create evidence for themselves
      // Teachers, mentors, and admins can create evidence for students they're associated with
      const ownProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      })
      const isOwnStudent = Boolean(
        (ownProfile && targetStudentId === ownProfile.id) ||
        studentExists.userId === session.user.id
      )

      const isTeacherOrAdmin =
        session.user.role === "TEACHER" ||
        session.user.role === "SCHOOL_ADMIN" ||
        session.user.role === "PLATFORM_ADMIN"
      const isMentor = session.user.role === "MENTOR"

      if (!isOwnStudent && !isTeacherOrAdmin && !isMentor) {
        return res.status(403).json({ error: "Forbidden" })
      }

      // Verify skill exists
      const skillExists = await prisma.skill.findUnique({
        where: { id: skillId }
      })
      if (!skillExists) {
        return res.status(404).json({ error: "Skill not found" })
      }

      // Verify project exists if provided
      if (projectId) {
        const projectExists = await prisma.project.findUnique({
          where: { id: projectId }
        })
        if (!projectExists) {
          return res.status(404).json({ error: "Project not found" })
        }
      }

      // Verify reflection exists if provided
      if (reflectionId) {
        const reflectionExists = await prisma.reflection.findUnique({
          where: { id: reflectionId }
        })
        if (!reflectionExists) {
          return res.status(404).json({ error: "Reflection not found" })
        }
      }

      // Create skill evidence
      const skillEvidence = await prisma.skillEvidence.create({
        data: {
          studentId: targetStudentId,
          skillId,
          details,
          projectId: projectId || undefined,
          verificationStatus: "PENDING",
          level: "BEGINNER",
        },
        include: {
          skill: true,
          project: {
            include: {
              challenge: true,
            },
          },
        }
      })

      return res.status(201).json(skillEvidence)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // PUT / PATCH: Update skill evidence (for verification/approval)
  if (req.method === "PUT" || req.method === "PATCH") {
    const id = req.query?.id || req.body?.id
    const validation = validateSchema(req.body, "skillEvidenceUpdate", { partial: true })
    if (!validation.valid) return respondValidationError(res, validation.errors)
    const { verificationStatus, level, details } = validation.data

    if (!id) {
      return respondValidationError(res, {
        id: {
          en: "A skill evidence ID is required.",
          mr: "कौशल्य पुराव्याचा आयडी आवश्यक आहे.",
        },
      })
    }

    // Fetch the evidence to check ownership and permissions
    let evidence
    try {
      evidence = await prisma.skillEvidence.findUnique({
        where: { id },
        include: { student: { include: { user: true } } },
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }

    if (!evidence) {
      return res.status(404).json({ error: "Skill evidence not found" })
    }

    // Get the student profile for the current user
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
    })
    const isOwner = studentProfile && evidence.studentId === studentProfile.id

    // Determine if the user is teacher, mentor, or admin
    const isTeacherOrAdmin =
      session.user.role === "TEACHER" ||
      session.user.role === "SCHOOL_ADMIN" ||
      session.user.role === "PLATFORM_ADMIN"
    const isMentor = session.user.role === "MENTOR"

    // Permissions:
    // - Only the owner can update details
    // - Only teacher, mentor, admin can update verificationStatus and level
    const updateData = {}
    if (details !== undefined && isOwner) {
      updateData.details = details
    }
    if (verificationStatus !== undefined && (isTeacherOrAdmin || isMentor)) {
      updateData.verificationStatus = verificationStatus
    }
    if (level !== undefined && (isTeacherOrAdmin || isMentor)) {
      updateData.level = level
    }

    // If no fields to update, return bad request
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update or insufficient permissions" })
    }

    try {
      const updatedEvidence = await prisma.skillEvidence.update({
        where: { id },
        data: updateData,
        include: {
          skill: true,
          project: {
            include: {
              challenge: true,
            },
          },
        },
      })
      return res.status(200).json(updatedEvidence)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle other methods
  return res.status(405).json({ error: "Method not allowed" })
}