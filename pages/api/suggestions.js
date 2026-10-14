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

  // Handle GET: list suggestions (mentor sees their suggestions, student sees suggestions to them)
  if (req.method === "GET") {
    try {
      let suggestions
      if (session.user.role === "MENTOR") {
        // Mentor sees suggestions they made
        suggestions = await prisma.suggestion.findMany({
          where: { mentorId: session.user.id },
          include: {
            challenge: {
              select: {
                id: true,
                title: true,
                description: true,
                grade: true,
                subject: true,
              }
            },
            student: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: { createdAt: "desc" },
        })
      } else if (session.user.role === "STUDENT") {
        // Student sees suggestions made to them
        suggestions = await prisma.suggestion.findMany({
          where: { studentId: session.user.id },
          include: {
            challenge: {
              select: {
                id: true,
                title: true,
                description: true,
                grade: true,
                subject: true,
              }
            },
            mentor: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: { createdAt: "desc" },
        })
      } else {
        // Other roles (teachers, admins) can't access suggestions
        return res.status(403).json({ error: "Forbidden" })
      }

      return res.status(200).json(suggestions)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle POST: create a suggestion (mentor only)
  if (req.method === "POST") {
    if (session.user.role !== "MENTOR") {
      return res.status(403).json({ error: "Forbidden" })
    }

    try {
      const validation = validateSchema(req.body, "suggestion")
      if (!validation.valid) return respondValidationError(res, validation.errors)

      const { challengeId, studentId, message } = validation.data

      // Verify the challenge exists
      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
      })

      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" })
      }

      // Verify the student exists (accepting either User.id or StudentProfile.id)
      let targetStudentUserId = studentId
      const student = await prisma.user.findUnique({
        where: { id: studentId },
      })

      if (student) {
        // Verify the user has a studentProfile
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: student.id },
        })

        if (!studentProfile) {
          return res.status(400).json({ error: "User is not a student" })
        }
        targetStudentUserId = student.id
      } else {
        // Fallback: check if studentId is a StudentProfile.id
        const profileById = await prisma.studentProfile.findUnique({
          where: { id: studentId },
        })

        if (!profileById || profileById.id !== studentId) {
          return res.status(404).json({ error: "Student not found" })
        }
        targetStudentUserId = profileById.userId
      }

      const suggestion = await prisma.suggestion.create({
        data: {
          mentorId: session.user.id,
          studentId: targetStudentUserId,
          challengeId,
          message: message || null,
        },
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              description: true,
              grade: true,
              subject: true,
            }
          },
          student: {
            select: {
              id: true,
              name: true,
            }
          }
        },
      })

      return res.status(201).json(suggestion)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle PUT: update suggestion status (student can accept/reject)
  if (req.method === "PUT") {
    try {
      const bodyWithId = {
        ...(req.body || {}),
        ...(req.query?.id && !req.body?.id ? { id: req.query.id } : {}),
      }
      const validation = validateSchema(bodyWithId, "suggestionUpdate")
      if (!validation.valid) return respondValidationError(res, validation.errors)

      const id = validation.data.id || req.body?.id || req.query?.id
      const { status } = validation.data

      // Verify the suggestion exists and belongs to the student
      const suggestion = await prisma.suggestion.findUnique({
        where: { id },
        include: {
          student: true,
        },
      })

      if (!suggestion) {
        return res.status(404).json({ error: "Suggestion not found" })
      }

      // Only the student can update their suggestion status
      if (suggestion.studentId !== session.user.id) {
        return res.status(403).json({ error: "Forbidden" })
      }

      // Only students can update suggestion status
      if (session.user.role !== "STUDENT") {
        return res.status(403).json({ error: "Forbidden" })
      }

      const updatedSuggestion = await prisma.suggestion.update({
        where: { id },
        data: {
          status,
        },
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              description: true,
              grade: true,
              subject: true,
            }
          },
          mentor: {
            select: {
              id: true,
              name: true,
            }
          }
        },
      })

      return res.status(200).json(updatedSuggestion)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle other methods
  return res.status(405).json({ error: "Method not allowed" })
}