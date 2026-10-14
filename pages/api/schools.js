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

async function resolveAdminSchoolId(session) {
  if (session.user.schoolId) {
    return session.user.schoolId
  }
  const userRecord = await prisma.user?.findUnique?.({
    where: { id: session.user.id },
    select: { schoolId: true },
  })
  if (userRecord?.schoolId) {
    return userRecord.schoolId
  }
  const teacherProfile = await prisma.teacherProfile?.findUnique?.({
    where: { userId: session.user.id },
    select: { schoolId: true },
  })
  return teacherProfile?.schoolId || null
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Handle individual school operations first
  if (req.query?.id) {
    const schoolId = String(req.query.id)

    // GET: Get specific school
    if (req.method === "GET") {
      try {
        let school

        if (session.user.role === "PLATFORM_ADMIN") {
          // Platform admin can see any school
          school = await prisma.school.findUnique({
            where: { id: schoolId },
            include: {
              students: true,
              teachers: true,
              classes: true
            }
          })
        } else if (session.user.role === "SCHOOL_ADMIN") {
          // School admin can only see their own school
          const adminSchoolId = await resolveAdminSchoolId(session)

          if (!adminSchoolId || adminSchoolId !== schoolId) {
            return res.status(403).json({ error: "Forbidden: Access denied to this school" })
          }

          school = await prisma.school.findUnique({
            where: { id: schoolId },
            include: {
              students: true,
              teachers: true,
              classes: true
            }
          })
        } else {
          return res.status(403).json({ error: "Forbidden: Admin access required" })
        }

        if (!school) {
          return res.status(404).json({ error: "School not found" })
        }

        return res.status(200).json(school)
      } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Internal server error" })
      }
    }

    // PUT: Update school
    if (req.method === "PUT") {
      let canUpdate = false

      if (session.user.role === "PLATFORM_ADMIN") {
        canUpdate = true
      } else if (session.user.role === "SCHOOL_ADMIN") {
        const adminSchoolId = await resolveAdminSchoolId(session)
        canUpdate = Boolean(adminSchoolId && adminSchoolId === schoolId)
      }

      if (!canUpdate) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" })
      }

      try {
        const validation = validateSchema(req.body, "school", { partial: true })
        if (!validation.valid) return respondValidationError(res, validation.errors)
        const { name, address, contactEmail, contactPhone } = validation.data
        if (!name && !address && !contactEmail && !contactPhone) {
          return respondValidationError(res, {
            form: {
              en: "Provide at least one field to update.",
              mr: "अपडेट करण्यासाठी किमान एक क्षेत्र द्या.",
            },
          })
        }

        const school = await prisma.school.update({
          where: { id: schoolId },
          data: {
            name: name || undefined,
            address: address || undefined,
            contactEmail: contactEmail || undefined,
            contactPhone: contactPhone || undefined
          }
        })

        if (!school) {
          return res.status(404).json({ error: "School not found" })
        }

        return res.status(200).json(school)
      } catch (error) {
        if (error?.code === "P2025") {
          return res.status(404).json({ error: "School not found" })
        }
        console.error(error)
        return res.status(500).json({ error: "Internal server error" })
      }
    }

    // DELETE: Delete school (platform admin only)
    if (req.method === "DELETE") {
      if (session.user.role !== "PLATFORM_ADMIN") {
        return res.status(403).json({ error: "Forbidden: Platform admin access required" })
      }

      try {
        const deleted = await prisma.school.delete({
          where: { id: schoolId }
        })

        if (deleted === null) {
          return res.status(404).json({ error: "School not found" })
        }

        return res.status(200).json({ message: "School deleted successfully" })
      } catch (error) {
        if (error?.code === "P2025") {
          return res.status(404).json({ error: "School not found" })
        }
        console.error(error)
        return res.status(500).json({ error: "Internal server error" })
      }
    }
  }

  // GET: List schools
  if (req.method === "GET") {
    try {
      let schools

      if (session.user.role === "PLATFORM_ADMIN") {
        // Platform admin can see all schools
        schools = await prisma.school.findMany({
          include: {
            students: true,
            teachers: true
          },
          orderBy: { name: "asc" }
        })
      } else if (session.user.role === "SCHOOL_ADMIN") {
        // School admin can only see their own school
        const adminSchoolId = await resolveAdminSchoolId(session)

        if (!adminSchoolId) {
          return res.status(404).json({ error: "School not found for this user" })
        }

        schools = await prisma.school.findMany({
          where: { id: adminSchoolId },
          include: {
            students: true,
            teachers: true
          }
        })
      } else {
        // Other roles can't access school management
        return res.status(403).json({ error: "Forbidden: Admin access required" })
      }

      return res.status(200).json(schools)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // POST: Create new school (platform admin only)
  if (req.method === "POST") {
    if (session.user.role !== "PLATFORM_ADMIN") {
      return res.status(403).json({ error: "Forbidden: Platform admin access required" })
    }

    try {
      const validation = validateSchema(req.body, "school")
      if (!validation.valid) return respondValidationError(res, validation.errors)
      const { name, address, contactEmail, contactPhone } = validation.data

      const school = await prisma.school.create({
        data: {
          name,
          address: address || undefined,
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined
        }
      })

      return res.status(201).json(school)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle other methods
  return res.status(405).json({ error: "Method not allowed" })
}