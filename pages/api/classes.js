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

function sanitizeClassUser(cls) {
  if (!cls || typeof cls !== "object") return cls
  if (cls.teacher?.user && "passwordHash" in cls.teacher.user) {
    delete cls.teacher.user.passwordHash
  }
  if (Array.isArray(cls.students)) {
    cls.students.forEach((enrollment) => {
      if (enrollment?.student?.user && "passwordHash" in enrollment.student.user) {
        delete enrollment.student.user.passwordHash
      }
    })
  }
  return cls
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

  // Handle individual class operations first when req.query.id is provided
  if (req.query?.id) {
    const classId = String(req.query.id)

    // GET: Get specific class
    if (req.method === "GET") {
      try {
        const classData = await prisma.class.findUnique({
          where: { id: classId },
          include: {
            school: true,
            teacher: {
              include: {
                user: true,
              },
            },
            students: {
              include: {
                student: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        })

        if (!classData) {
          return res.status(404).json({ error: "Class not found" })
        }

        // Role-based access control
        let canAccess = false

        if (session.user.role === "PLATFORM_ADMIN" || session.user.role === "MENTOR") {
          canAccess = true
        } else if (session.user.role === "SCHOOL_ADMIN") {
          const adminSchoolId = await resolveSchoolAdminSchoolId(session)
          const classSchoolId = classData.schoolId || classData.school?.id
          if (adminSchoolId && adminSchoolId === classSchoolId) {
            canAccess = true
          }
        } else if (session.user.role === "TEACHER") {
          const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId: session.user.id },
          })
          const classTeacherId = classData.teacherId || classData.teacher?.id
          if (teacherProfile && teacherProfile.id === classTeacherId) {
            canAccess = true
          }
        } else if (session.user.role === "STUDENT") {
          const studentProfile = await prisma.studentProfile.findUnique({
            where: { userId: session.user.id },
          })
          if (studentProfile) {
            const enrollment = await prisma.enrollment.findFirst({
              where: {
                studentId: studentProfile.id,
                classId,
              },
            })
            if (enrollment) {
              canAccess = true
            }
          }
        }

        if (!canAccess) {
          return res.status(403).json({ error: "Forbidden: Insufficient permissions" })
        }

        return res.status(200).json(sanitizeClassUser(classData))
      } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Internal server error" })
      }
    }

    // PUT: Update class
    if (req.method === "PUT") {
      if (
        session.user.role !== "PLATFORM_ADMIN" &&
        session.user.role !== "SCHOOL_ADMIN" &&
        session.user.role !== "TEACHER"
      ) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" })
      }

      try {
        const existingClass = await prisma.class.findUnique({
          where: { id: classId },
        })

        if (!existingClass) {
          return res.status(404).json({ error: "Class not found" })
        }

        let canUpdate = false
        if (session.user.role === "PLATFORM_ADMIN") {
          canUpdate = true
        } else if (session.user.role === "SCHOOL_ADMIN") {
          const adminSchoolId = await resolveSchoolAdminSchoolId(session)
          if (adminSchoolId && adminSchoolId === existingClass.schoolId) {
            canUpdate = true
          }
        } else if (session.user.role === "TEACHER") {
          const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId: session.user.id },
          })
          if (teacherProfile && teacherProfile.id === existingClass.teacherId) {
            canUpdate = true
          }
        }

        if (!canUpdate) {
          return res.status(403).json({ error: "Forbidden: Insufficient permissions" })
        }

        if (!req.body || Object.keys(req.body).length === 0) {
          return respondValidationError(res, {
            form: {
              en: "Provide at least one field to update.",
              mr: "अपडेट करण्यासाठी किमान एक क्षेत्र द्या.",
            },
          })
        }

        const validation = validateSchema(req.body, "class", { partial: true })
        if (!validation.valid) return respondValidationError(res, validation.errors)
        const { name, grade, teacherId } = validation.data
        if (name === undefined && grade === undefined && teacherId === undefined) {
          return respondValidationError(res, {
            form: {
              en: "Provide at least one field to update.",
              mr: "अपडेट करण्यासाठी किमान एक क्षेत्र द्या.",
            },
          })
        }

        // Verify teacher belongs to same school if changing teacher
        if (teacherId) {
          const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { id: teacherId },
          })
          if (!teacherProfile || (existingClass.schoolId && teacherProfile.schoolId !== existingClass.schoolId)) {
            return res.status(400).json({ error: "Teacher does not belong to this school" })
          }
        }

        const updatedClass = await prisma.class.update({
          where: { id: classId },
          data: {
            name: name || undefined,
            grade: grade === undefined ? undefined : grade,
            teacherId: teacherId || undefined,
          },
          include: {
            school: true,
            teacher: {
              include: {
                user: true,
              },
            },
          },
        })

        return res.status(200).json(sanitizeClassUser(updatedClass))
      } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Internal server error" })
      }
    }

    // DELETE: Delete class
    if (req.method === "DELETE") {
      if (session.user.role !== "PLATFORM_ADMIN" && session.user.role !== "SCHOOL_ADMIN") {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" })
      }

      try {
        const classData = await prisma.class.findUnique({
          where: { id: classId },
        })

        if (!classData) {
          return res.status(404).json({ error: "Class not found" })
        }

        let canDelete = false
        if (session.user.role === "PLATFORM_ADMIN") {
          canDelete = true
        } else if (session.user.role === "SCHOOL_ADMIN") {
          const adminSchoolId = await resolveSchoolAdminSchoolId(session)
          if (adminSchoolId && adminSchoolId === classData.schoolId) {
            canDelete = true
          }
        }

        if (!canDelete) {
          return res.status(403).json({ error: "Forbidden: Insufficient permissions" })
        }

        // First, unenroll all students
        await prisma.enrollment.deleteMany({
          where: { classId },
        })

        // Unlink any challenges referencing this class
        if (typeof prisma.challenge?.updateMany === "function") {
          await prisma.challenge.updateMany({
            where: { classId },
            data: { classId: null },
          })
        }

        // Then delete the class
        await prisma.class.delete({
          where: { id: classId },
        })

        return res.status(200).json({ message: "Class deleted successfully" })
      } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Internal server error" })
      }
    }

    return res.status(405).json({ error: "Method not allowed" })
  }

  // GET: List classes
  if (req.method === "GET") {
    try {
      const { schoolId, grade, teacherId, page = 1, limit = 10 } = req.query || {}
      const pageNum = parseInt(page, 10) || 1
      const limitNum = parseInt(limit, 10) || 10
      const skip = (pageNum - 1) * limitNum

      // Build where clause
      const where = {}

      if (schoolId) {
        where.schoolId = schoolId
      }

      if (grade) {
        where.grade = parseInt(grade, 10)
      }

      if (teacherId) {
        where.teacherId = teacherId
      }

      // Role-based filtering
      if (session.user.role === "TEACHER") {
        // Teachers can only see their own classes
        const teacherProfile = await prisma.teacherProfile.findUnique({
          where: { userId: session.user.id },
        })
        if (teacherProfile) {
          where.teacherId = teacherProfile.id
        } else {
          where.teacherId = "nonexistent"
        }
      } else if (session.user.role === "SCHOOL_ADMIN") {
        // School admins can see classes in their school
        const adminSchoolId = await resolveSchoolAdminSchoolId(session)
        if (adminSchoolId) {
          where.schoolId = adminSchoolId
        } else {
          where.schoolId = "nonexistent"
        }
      }

      const [classes, totalCount] = await prisma.$transaction([
        prisma.class.findMany({
          where,
          include: {
            school: true,
            teacher: {
              include: {
                user: true,
              },
            },
            students: {
              include: {
                student: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
          skip,
          take: limitNum,
          orderBy: { name: "asc" },
        }),
        prisma.class.count({ where }),
      ])

      const sanitizedClasses = Array.isArray(classes) ? classes.map(sanitizeClassUser) : []

      return res.status(200).json({
        classes: sanitizedClasses,
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

  // POST: Create new class
  if (req.method === "POST") {
    let canCreate = false

    if (
      session.user.role === "TEACHER" ||
      session.user.role === "SCHOOL_ADMIN" ||
      session.user.role === "PLATFORM_ADMIN"
    ) {
      canCreate = true
    }

    if (!canCreate) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" })
    }

    try {
      const payload = { ...req.body }
      if (!payload.schoolId && session.user.role === "SCHOOL_ADMIN") {
        const adminSchoolId = await resolveSchoolAdminSchoolId(session)
        if (adminSchoolId) payload.schoolId = adminSchoolId
      }

      const validation = validateSchema(payload, "class")
      if (!validation.valid) return respondValidationError(res, validation.errors)
      const { name, grade, schoolId, teacherId } = validation.data

      if (session.user.role === "SCHOOL_ADMIN") {
        const adminSchoolId = await resolveSchoolAdminSchoolId(session)
        if (adminSchoolId && schoolId !== adminSchoolId) {
          return res.status(403).json({ error: "Forbidden: Insufficient permissions" })
        }
      }

      // Verify school exists
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
      })

      if (!school) {
        return res.status(404).json({ error: "School not found" })
      }

      // Verify teacher exists and belongs to school (if provided)
      if (teacherId) {
        const teacherProfile = await prisma.teacherProfile.findUnique({
          where: { id: teacherId },
          select: { id: true, schoolId: true },
        })

        if (!teacherProfile) {
          return res.status(404).json({ error: "Teacher not found" })
        }

        if (teacherProfile.schoolId !== schoolId) {
          return res.status(400).json({ error: "Teacher does not belong to this school" })
        }
      }

      const classCreated = await prisma.class.create({
        data: {
          name,
          grade,
          schoolId,
          teacherId: teacherId || undefined,
        },
        include: {
          school: true,
          teacher: {
            include: {
              user: true,
            },
          },
        },
      })

      return res.status(201).json(sanitizeClassUser(classCreated))
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle other methods
  return res.status(405).json({ error: "Method not allowed" })
}