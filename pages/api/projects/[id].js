import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]"
import prisma from "../../../lib/prisma"
import { validateSchema, sendValidationError } from "../../../lib/validation"

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { id } = req.query

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid project ID" })
  }

  // Fetch the project to verify access
  let project
  try {
    project = await prisma.project.findUnique({
      where: { id },
      include: {
        challenge: {
          include: {
            skills: true,
          },
        },
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
        reflections: {
          orderBy: { createdAt: "desc" },
        },
        iterations: {
          orderBy: { createdAt: "desc" },
        },
        evidence: {
          include: {
            skill: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Internal server error" })
  }

  if (!project) {
    return res.status(404).json({ error: "Project not found" })
  }

  // Check access: student must own the project, or user is teacher/admin/mentor/parent
  const isStudentOwner = project.student?.userId === session.user.id
  const isTeacherOrAdmin =
    session.user.role === "TEACHER" ||
    session.user.role === "SCHOOL_ADMIN" ||
    session.user.role === "PLATFORM_ADMIN"
  const isMentorOrParent =
    session.user.role === "MENTOR" ||
    session.user.role === "PARENT"

  if (req.method === "GET") {
    if (!isStudentOwner && !isTeacherOrAdmin && !isMentorOrParent) {
      return res.status(403).json({ error: "Forbidden" })
    }
    return res.status(200).json(project)
  }

  if (!isStudentOwner && !isTeacherOrAdmin) {
    return res.status(403).json({ error: "Forbidden" })
  }

  if (req.method === "PUT") {
    try {
      const validation = validateSchema(req.body, "projectUpdate", { partial: true })
      if (!validation.valid) return sendValidationError(res, validation.errors)
      const { status: newStatus, reflection, evidenceDetails } = validation.data
      if (newStatus === undefined && reflection === undefined && evidenceDetails === undefined) {
        return sendValidationError(res, {
          form: {
            en: "Provide at least one field to update.",
            mr: "अपडेट करण्यासाठी किमान एक क्षेत्र द्या.",
          },
        })
      }

      // Prepare update data
      const updateData = {}
      if (newStatus) {
        updateData.status = newStatus
      }

      // Update the project
      let updatedProject = await prisma.project.update({
        where: { id },
        data: updateData,
      })

      // If reflection is provided, create a reflection entry
      if (reflection !== undefined && reflection.trim() !== "") {
        await prisma.reflection.create({
          data: {
            content: reflection.trim(),
            projectId: id,
          },
        })
      }

      // If the new status is EARN_SKILL_EVIDENCE (or evidenceDetails provided at EARN_SKILL_EVIDENCE), create/update skill evidence
      const effectiveStatus = newStatus || project.status
      if (effectiveStatus === "EARN_SKILL_EVIDENCE" && project.challengeId) {
        const challengeWithSkills = await prisma.challenge.findUnique({
          where: { id: project.challengeId },
          include: { skills: true },
        })

        let targetSkills = challengeWithSkills?.skills || []
        if (targetSkills.length === 0 && typeof prisma.skill?.findFirst === "function") {
          const fallbackSkill = await prisma.skill.findFirst()
          if (fallbackSkill) targetSkills = [fallbackSkill]
        }

        const resolvedDetails =
          (evidenceDetails && evidenceDetails.trim()) ||
          `Evidence automatically generated upon reaching EARN_SKILL_EVIDENCE stage for project: ${project.title}`

        for (const skill of targetSkills) {
          const existingEvidence =
            typeof prisma.skillEvidence.findFirst === "function"
              ? await prisma.skillEvidence.findFirst({
                  where: {
                    studentId: project.studentId,
                    skillId: skill.id,
                    projectId: project.id,
                  },
                })
              : null

          if (!existingEvidence) {
            await prisma.skillEvidence.create({
              data: {
                studentId: project.studentId,
                skillId: skill.id,
                projectId: project.id,
                details: resolvedDetails,
                verificationStatus: "PENDING",
                level: "BEGINNER",
              },
            })
          } else if (evidenceDetails && evidenceDetails.trim() && typeof prisma.skillEvidence.update === "function") {
            await prisma.skillEvidence.update({
              where: { id: existingEvidence.id },
              data: { details: evidenceDetails.trim() },
            })
          }
        }
      }

      if (typeof prisma.project.findUnique === "function") {
        const refreshed = await prisma.project.findUnique({
          where: { id },
          include: {
            challenge: { include: { skills: true } },
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
            reflections: { orderBy: { createdAt: "desc" } },
            iterations: { orderBy: { createdAt: "desc" } },
            evidence: { include: { skill: true }, orderBy: { createdAt: "desc" } },
          },
        })
        if (refreshed) updatedProject = refreshed
      }

      return res.status(200).json(updatedProject)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }

  // Handle other methods
  return res.status(405).json({ error: "Method not allowed" })
}