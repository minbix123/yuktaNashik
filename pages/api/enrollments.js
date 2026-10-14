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

  // GET: List enrollments
  if (req.method === "GET") {
    try {
      const { studentId, classId, page = 1, limit = 10 } = req.query || {}
      const pageNum = parseInt(page, 10) || 1
      const limitNum = parseInt(limit, 10) || 10
      const skip = (pageNum - 1) * limitNum

      // Build where clause
      const where = {}

      if (studentId) {
        where.studentId = studentId
      }

      if (classId) {
        where.classId = classId
      }

      // Role-based filtering
      if (session.user.role === "STUDENT") {
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: session.user.id },
        })
        if (studentProfile) {
          where.studentId = studentProfile.id
        } else {
          where.studentId = "nonexistent"
        }
      } else if (session.user.role === "TEACHER") {
        const teacherProfile = await prisma.teacherProfile.findUnique({
          where: { userId: session.user.id },
        })
        if (teacherProfile) {
          const teacherClasses = await prisma.class.findMany({
            where: { teacherId: teacherProfile.id },
            select: { id: true },
          })
          const classIds = (teacherClasses || []).map((c) => c.id)
          if (classIds.length > 0) {
            where.classId = classId
              ? classIds.includes(classId)
                ? classId
                : { equals: "nonexistent" }
              : { in: classIds }
          } else {
            where.classId = { equals: "nonexistent" }
          }
        } else {
          where.classId = { equals: "nonexistent" }
        }
      } else if (session.user.role === "SCHOOL_ADMIN") {
        const adminSchoolId = await resolveSchoolAdminSchoolId(session)
        if (adminSchoolId) {
          const schoolClasses = await prisma.class.findMany({
            where: { schoolId: adminSchoolId },
            select: { id: true },
          })
          const classIds = (schoolClasses || []).map((c) => c.id)
          if (classIds.length > 0) {
            where.classId = classId
              ? classIds.includes(classId)
                ? classId
                : { equals: "nonexistent" }
              : { in: classIds }
          } else {
            where.classId = { equals: "nonexistent" }
          }
        } else {
          where.classId = { equals: "nonexistent" }
        }
      }

      const [enrollments, totalCount] = await prisma.$transaction([
        prisma.enrollment.findMany({
          where,
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
                school: true,
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
          skip,
          take: limitNum,
          orderBy: { enrolledAt: "desc" },
        }),
        prisma.enrollment.count({ where }),
      ])

      const sanitized = Array.isArray(enrollments) ? enrollments.map(sanitizeEnrollment) : []

      return res.status(200).json({
        enrollments: sanitized,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // POST: Enroll student in class
  if (req.method === "POST") {
    try {
      const validation = validateSchema(req.body, "enrollment")
      if (!validation.valid) return respondValidationError(res, validation.errors)
      const { studentId, classId } = validation.data

      // Check permissions
      let canEnroll = false
      let classDataForCheck = null

      if (session.user.role === "TEACHER") {
        const teacherProfile = await prisma.teacherProfile.findUnique({
          where: { userId: session.user.id },
        })
        if (teacherProfile) {
          classDataForCheck = await prisma.class.findUnique({
            where: { id: classId },
          })
          if (!classDataForCheck) {
            return res.status(404).json({ error: "Class not found" })
          }
          if (classDataForCheck.teacherId === teacherProfile.id) {
            canEnroll = true
          }
        }
      } else if (session.user.role === "SCHOOL_ADMIN") {
        const adminSchoolId = await resolveSchoolAdminSchoolId(session)
        if (adminSchoolId) {
          classDataForCheck = await prisma.class.findUnique({
            where: { id: classId },
          })
          if (!classDataForCheck) {
            return res.status(404).json({ error: "Class not found" })
          }
          if (classDataForCheck.schoolId === adminSchoolId) {
            canEnroll = true
          }
        }
      } else if (session.user.role === "PLATFORM_ADMIN") {
        canEnroll = true
      }

      if (!canEnroll) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" })
      }

      // Verify student exists (support StudentProfile.id or User.id)
      let studentProfile = await prisma.studentProfile.findUnique({
        where: { id: studentId },
      })
      if (!studentProfile && typeof prisma.studentProfile.findFirst === "function") {
        studentProfile = await prisma.studentProfile.findFirst({
          where: { OR: [{ id: studentId }, { userId: studentId }] },
        })
      }

      if (!studentProfile) {
        return res.status(404).json({ error: "Student not found" })
      }

      const resolvedStudentId = studentProfile.id

      // Verify class exists
      const classData =
        classDataForCheck ||
        (await prisma.class.findUnique({
          where: { id: classId },
        }))

      if (!classData) {
        return res.status(404).json({ error: "Class not found" })
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: resolvedStudentId,
          classId,
        },
      })

      if (existingEnrollment) {
        return res.status(400).json({ error: "Student is already enrolled in this class" })
      }

      // Create enrollment
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
              school: true,
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

      return res.status(201).json(sanitizeEnrollment(enrollment))
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // DELETE: Remove enrollment (withdraw student from class)
  if (req.method === "DELETE") {
    try {
      const rawStudentId = req.query?.studentId ?? req.body?.studentId
      const rawClassId = req.query?.classId ?? req.body?.classId
      const validation = validateSchema(
        {
          studentId: Array.isArray(rawStudentId) ? rawStudentId[0] : rawStudentId,
          classId: Array.isArray(rawClassId) ? rawClassId[0] : rawClassId,
        },
        "enrollment"
      )
      if (!validation.valid) return respondValidationError(res, validation.errors)
      const { studentId, classId } = validation.data

      // Check permissions
      let canDelete = false

      if (session.user.role === "TEACHER") {
        const teacherProfile = await prisma.teacherProfile.findUnique({
          where: { userId: session.user.id },
        })
        if (teacherProfile) {
          const classData = await prisma.class.findUnique({
            where: { id: classId },
          })
          if (classData && classData.teacherId === teacherProfile.id) {
            canDelete = true
          }
        }
      } else if (session.user.role === "SCHOOL_ADMIN") {
        const adminSchoolId = await resolveSchoolAdminSchoolId(session)
        if (adminSchoolId) {
          const classData = await prisma.class.findUnique({
            where: { id: classId },
          })
          if (classData && classData.schoolId === adminSchoolId) {
            canDelete = true
          }
        }
      } else if (session.user.role === "PLATFORM_ADMIN") {
        canDelete = true
      }

      if (!canDelete) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" })
      }

      // Verify enrollment exists
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: String(studentId),
          classId: String(classId),
        },
      })

      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" })
      }

      // Delete enrollment
      await prisma.enrollment.delete({
        where: { id: enrollment.id },
      })

      return res.status(200).json({ message: "Student withdrawn from class successfully" })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle other methods
  return res.status(405).json({ error: "Method not allowed" })
}