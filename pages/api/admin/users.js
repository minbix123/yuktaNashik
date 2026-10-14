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

function sanitizeUser(user) {
  if (!user || typeof user !== "object") return user
  const copy = { ...user }
  delete copy.passwordHash
  return copy
}

async function resolveAdminSchoolId(session) {
  if (session?.user?.schoolId) return session.user.schoolId
  if (typeof prisma.user?.findUnique === "function") {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { schoolId: true },
    })
    if (u?.schoolId) return u.schoolId
  }
  if (typeof prisma.teacherProfile?.findUnique === "function") {
    const tp = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: { schoolId: true },
    })
    if (tp?.schoolId) return tp.schoolId
  }
  return null
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Check if user is platform admin or school admin
  if (session.user.role !== "PLATFORM_ADMIN" && session.user.role !== "SCHOOL_ADMIN") {
    return res.status(403).json({ error: "Forbidden: Admin access required" })
  }

  // Determine if user is school admin and get their schoolId
  const isSchoolAdmin = session.user.role === "SCHOOL_ADMIN"
  const adminSchoolId = isSchoolAdmin ? await resolveAdminSchoolId(session) : null

  // If school admin but no schoolId associated, forbid access
  if (isSchoolAdmin && !adminSchoolId) {
    return res.status(403).json({ error: "Forbidden: School admin not associated with a school" })
  }

  // Handle individual user operations FIRST when ?id= is present
  if (req.query?.id) {
    const userId = String(req.query.id)

    // GET: Get specific user
    if (req.method === "GET") {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            studentProfile: true,
            teacherProfile: true,
          },
        })

        if (!user) {
          return res.status(404).json({ error: "User not found" })
        }

        if (isSchoolAdmin) {
          const userSchoolId =
            user.schoolId ??
            user.studentProfile?.schoolId ??
            user.teacherProfile?.schoolId ??
            null

          if (userSchoolId !== adminSchoolId) {
            return res.status(403).json({ error: "Forbidden: User not in your school" })
          }
        }

        return res.status(200).json(sanitizeUser(user))
      } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Internal server error" })
      }
    }

    // PUT: Update user
    if (req.method === "PUT") {
      try {
        const validation = validateSchema(req.body, "user", { partial: true })
        if (!validation.valid) return respondValidationError(res, validation.errors)
        const { name, email, role, password } = validation.data
        const requestedSchoolId = req.body?.schoolId
        if (
          name === undefined &&
          email === undefined &&
          role === undefined &&
          password === undefined &&
          requestedSchoolId === undefined
        ) {
          return respondValidationError(res, {
            form: {
              en: "Provide at least one field to update.",
              mr: "अपडेट करण्यासाठी किमान एक क्षेत्र द्या.",
            },
          })
        }

        if (isSchoolAdmin && role === "PLATFORM_ADMIN") {
          return res.status(403).json({ error: "Forbidden: School admins cannot promote users to platform admin" })
        }

        if (isSchoolAdmin) {
          const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
              studentProfile: true,
              teacherProfile: true,
            },
          })

          if (!targetUser) {
            return res.status(404).json({ error: "User not found" })
          }

          const userSchoolId =
            targetUser.schoolId ??
            targetUser.studentProfile?.schoolId ??
            targetUser.teacherProfile?.schoolId ??
            null

          if (userSchoolId !== adminSchoolId) {
            return res.status(403).json({ error: "Forbidden: User not in your school" })
          }
        }

        const updateData = {
          name: name || undefined,
          email: email || undefined,
          role: role || undefined,
        }

        if (!isSchoolAdmin && requestedSchoolId !== undefined) {
          updateData.schoolId = requestedSchoolId || null
        }

        if (password) {
          const { hashSync } = require("bcryptjs")
          updateData.passwordHash = hashSync(password, 10)
        }

        if (role) {
          const validRoles = ["STUDENT", "TEACHER", "SCHOOL_ADMIN", "PLATFORM_ADMIN", "MENTOR", "PARENT"]
          if (!validRoles.includes(role)) {
            return res.status(400).json({ error: "Invalid role specified" })
          }
        }

        const user = await prisma.user.update({
          where: { id: userId },
          data: updateData,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            schoolId: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        })

        const targetSchoolId = isSchoolAdmin ? adminSchoolId : requestedSchoolId
        if (targetSchoolId !== undefined && (role === "STUDENT" || role === "TEACHER")) {
          const profileData = { schoolId: targetSchoolId || null }
          if (role === "STUDENT") {
            await prisma.studentProfile.upsert({
              where: { userId: user.id },
              update: profileData,
              create: { userId: user.id, schoolId: targetSchoolId || null },
            })
          } else if (role === "TEACHER") {
            await prisma.teacherProfile.upsert({
              where: { userId: user.id },
              update: profileData,
              create: { userId: user.id, schoolId: targetSchoolId || null },
            })
          }
        }

        return res.status(200).json(sanitizeUser(user))
      } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Internal server error" })
      }
    }

    // DELETE: Delete user
    if (req.method === "DELETE") {
      try {
        if (isSchoolAdmin) {
          const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
              studentProfile: true,
              teacherProfile: true,
            },
          })

          if (!targetUser) {
            return res.status(404).json({ error: "User not found" })
          }

          const userSchoolId =
            targetUser.schoolId ??
            targetUser.studentProfile?.schoolId ??
            targetUser.teacherProfile?.schoolId ??
            null

          if (userSchoolId !== adminSchoolId) {
            return res.status(403).json({ error: "Forbidden: User not in your school" })
          }
        }

        await prisma.studentProfile.deleteMany({
          where: { userId },
        })

        await prisma.teacherProfile.deleteMany({
          where: { userId },
        })

        await prisma.user.delete({
          where: { id: userId },
        })

        return res.status(200).json({ message: "User deleted successfully" })
      } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Internal server error" })
      }
    }
  }

  // GET: List users with filtering
  if (req.method === "GET") {
    try {
      const { role, status, search, page = 1, limit = 10 } = req.query || {}
      const pageNum = parseInt(page, 10) || 1
      const limitNum = parseInt(limit, 10) || 10
      const skip = (pageNum - 1) * limitNum

      const where = {}

      if (role && role !== "all") {
        where.role = role
      }

      if (status && status !== "all") {
        // Reserved for future status field
      }

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
        ]
      }

      if (isSchoolAdmin) {
        const schoolFilter = [
          { schoolId: adminSchoolId },
          { studentProfile: { schoolId: adminSchoolId } },
          { teacherProfile: { schoolId: adminSchoolId } },
        ]
        if (search) {
          const searchConditions = where.OR
          delete where.OR
          where.AND = [
            { OR: schoolFilter },
            { OR: searchConditions },
          ]
        } else {
          where.OR = schoolFilter
        }
      }

      const [users, totalCount] = await prisma.$transaction([
        prisma.user.findMany({
          where,
          include: {
            studentProfile: true,
            teacherProfile: true,
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where }),
      ])

      const sanitizedUsers = Array.isArray(users) ? users.map(sanitizeUser) : []

      return res.status(200).json({
        users: sanitizedUsers,
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

  // POST: Create new user
  if (req.method === "POST") {
    try {
      const validation = validateSchema(req.body, "userCreate")
      if (!validation.valid) return respondValidationError(res, validation.errors)
      const { email, name, password, role } = validation.data
      const requestedSchoolId = req.body?.schoolId || null

      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" })
      }

      const validRoles = ["STUDENT", "TEACHER", "SCHOOL_ADMIN", "PLATFORM_ADMIN", "MENTOR", "PARENT"]
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role specified" })
      }

      if (isSchoolAdmin && role === "PLATFORM_ADMIN") {
        return res.status(403).json({ error: "Forbidden: School admins cannot create platform admins" })
      }

      const { hashSync } = require("bcryptjs")
      const hashedPassword = hashSync(password, 10)

      const effectiveSchoolId = isSchoolAdmin ? adminSchoolId : requestedSchoolId

      const userData = {
        email,
        name,
        passwordHash: hashedPassword,
        role,
        emailVerified: new Date(),
      }

      if (effectiveSchoolId && (role === "SCHOOL_ADMIN" || !isSchoolAdmin)) {
        userData.schoolId = effectiveSchoolId
      }

      const user = await prisma.user.create({
        data: userData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      })

      if (role === "STUDENT") {
        await prisma.studentProfile.create({
          data: {
            userId: user.id,
            schoolId: effectiveSchoolId,
          },
        })
      } else if (role === "TEACHER") {
        await prisma.teacherProfile.create({
          data: {
            userId: user.id,
            schoolId: effectiveSchoolId,
          },
        })
      }

      return res.status(201).json(sanitizeUser(user))
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  return res.status(405).json({ error: "Method not allowed" })
}