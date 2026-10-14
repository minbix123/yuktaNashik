import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]"
import prisma from "../../../lib/prisma"
import { validateSchema, sendValidationError } from "../../../lib/validation"

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

function sanitizeEnrollment(enrollment) {
  if (!enrollment || typeof enrollment !== "object") return enrollment
  if (enrollment.student?.user && "passwordHash" in enrollment.student.user) {
    delete enrollment.student.user.passwordHash
  }
  if (enrollment.class?.teacher?.user && "passwordHash" in enrollment.class.teacher.user) {
    delete enrollment.class.teacher.user.passwordHash
  }
  return enrollment
}

async function resolveSchoolAdminSchoolId(session) {
  if (session?.user?.schoolId) return session.user.schoolId
  if (typeof prisma.user?.findUnique === "function") {
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { schoolId: true },
    })
    if (userRecord?.schoolId) return userRecord.schoolId
  }
  if (typeof prisma.teacherProfile?.findUnique === "function") {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (teacherProfile?.schoolId) return teacherProfile.schoolId
  }
  return null
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Only allow POST for bulk enrollment
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const validation = validateSchema(req.body, "bulkEnrollment")
    if (!validation.valid) return respondValidationError(res, validation.errors)
    const { classId, studentIds } = validation.data

    // Check permissions
    let canEnroll = false
    let classData = null

    if (session.user.role === "TEACHER") {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
      })
      if (teacherProfile) {
        classData = await prisma.class.findUnique({
          where: { id: classId },
        })
        if (!classData) {
          return res.status(404).json({ error: "Class not found" })
        }
        if (classData.teacherId === teacherProfile.id) {
          canEnroll = true
        }
      }
    } else if (session.user.role === "SCHOOL_ADMIN") {
      const adminSchoolId = await resolveSchoolAdminSchoolId(session)
      if (adminSchoolId) {
        classData = await prisma.class.findUnique({
          where: { id: classId },
        })
        if (!classData) {
          return res.status(404).json({ error: "Class not found" })
        }
        if (classData.schoolId === adminSchoolId) {
          canEnroll = true
        }
      }
    } else if (session.user.role === "PLATFORM_ADMIN") {
      canEnroll = true
    }

    if (!canEnroll) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" })
    }

    // Verify class exists
    if (!classData) {
      classData = await prisma.class.findUnique({
        where: { id: classId },
      })
    }

    if (!classData) {
      return res.status(404).json({ error: "Class not found" })
    }

    // Batch-prefetch student profiles and existing enrollments to avoid N+1 queries
    const studentMap = new Map()
    if (typeof prisma.studentProfile?.findMany === "function") {
      const profiles = await prisma.studentProfile.findMany({
        where: {
          OR: [{ id: { in: studentIds } }, { userId: { in: studentIds } }],
        },
      })
      if (Array.isArray(profiles)) {
        for (const p of profiles) {
          studentMap.set(p.id, p)
          if (p.userId) studentMap.set(p.userId, p)
        }
      }
    }

    const existingSet = new Set()
    if (typeof prisma.enrollment?.findMany === "function" && studentMap.size > 0) {
      const resolvedIds = Array.from(new Set(Array.from(studentMap.values()).map((p) => p.id)))
      const existingList = await prisma.enrollment.findMany({
        where: {
          classId,
          studentId: { in: resolvedIds },
        },
        select: { studentId: true },
      })
      if (Array.isArray(existingList)) {
        for (const e of existingList) {
          existingSet.add(e.studentId)
        }
      }
    }

    const results = []
    const errors = []

    for (const studentId of studentIds) {
      try {
        let studentProfile = studentMap.get(studentId)
        if (!studentProfile && typeof prisma.studentProfile?.findUnique === "function") {
          studentProfile = await prisma.studentProfile.findUnique({
            where: { id: studentId },
          })
        }

        if (!studentProfile) {
          errors.push({ studentId, error: "Student not found" })
          continue
        }

        const resolvedStudentId = studentProfile.id

        let alreadyEnrolled = existingSet.has(resolvedStudentId)
        if (!alreadyEnrolled && existingSet.size === 0 && typeof prisma.enrollment?.findFirst === "function") {
          const existingEnrollment = await prisma.enrollment.findFirst({
            where: {
              studentId: resolvedStudentId,
              classId,
            },
          })
          alreadyEnrolled = Boolean(existingEnrollment)
        }

        if (alreadyEnrolled) {
          errors.push({ studentId, error: "Student is already enrolled in this class" })
          continue
        }

        const enrollment = await prisma.enrollment.create({
          data: {
            studentId: resolvedStudentId,
            classId,
          },
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    image: true,
                  },
                },
              },
            },
            class: {
              include: {
                school: true,
                teacher: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        image: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })

        existingSet.add(resolvedStudentId)
        results.push(sanitizeEnrollment(enrollment))
      } catch (error) {
        console.error(`Error enrolling student ${studentId}:`, error)
        errors.push({ studentId, error: "Internal server error" })
      }
    }

    if (errors.length > 0) {
      return res.status(207).json({
        enrolled: results,
        errors,
        message: `${results.length} students enrolled, ${errors.length} errors`,
      })
    }

    return res.status(201).json({
      enrolled: results,
      count: results.length,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Internal server error" })
  }
}