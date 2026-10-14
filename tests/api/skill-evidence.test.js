import { getServerSession } from "next-auth"
import { authOptions } from "../../pages/api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import { validateSchema, sendValidationError } from "../../lib/validation"

// Mock the dependencies
jest.mock("../../lib/prisma", () => ({
  studentProfile: {
    findUnique: jest.fn(),
  },
  skill: {
    findUnique: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
  },
  reflection: {
    findUnique: jest.fn(),
  },
  skillEvidence: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}))
jest.mock("../../lib/validation", () => {
  const actual = jest.requireActual("../../lib/validation")
  return {
    ...actual,
    validateSchema: jest.fn(),
    sendValidationError: jest.fn(actual.sendValidationError),
  }
})
jest.mock("next-auth", () => ({
  getServerSession: jest.fn()
}))

// Mock the authOptions
jest.mock("../../pages/api/auth/[...nextauth]", () => ({
  authOptions: {}
}))

describe('Skill Evidence API Route', () => {
  // We'll test the actual handler function by importing it after mocking dependencies
  let handler

  beforeAll(() => {
    // Reset all mocks before tests
    jest.clearAllMocks()

    // Import the handler after mocking
    handler = require("../../pages/api/skill-evidence").default
  })

  const createMockReqRes = (method, body = null, query = null, sessionData = null) => {
    const req = {
      method,
      body: body || {},
      query: query || {}
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    return { req, res }
  }

  describe('GET /api/skill-evidence', () => {
    const mockSession = {
      user: {
        id: 'user1',
        role: 'STUDENT'
      }
    }

    const mockStudentProfile = {
      id: 'student1',
      userId: 'user1'
    }

    const mockEvidence = [
      {
        id: 'evidence1',
        studentId: 'student1',
        skillId: 'skill1',
        details: 'I demonstrated leadership in a group project',
        verificationStatus: 'PENDING',
        level: 'BEGINNER',
        createdAt: new Date(),
        skill: {
          id: 'skill1',
          name: 'Leadership',
          description: 'Ability to guide and motivate a team'
        },
        project: {
          id: 'project1',
          title: 'Community Project',
          challenge: {
            id: 'challenge1',
            title: 'Community Service Challenge'
          }
        }
      }
    ]

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock student profile lookup
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue(mockStudentProfile)

      // Mock prisma transaction
      jest.spyOn(require("../../lib/prisma"), "$transaction")
        .mockImplementation(async (callback) => {
          if (Array.isArray(callback)) return Promise.all(callback)
          const evidence = await callback(require("../../lib/prisma"))
          const count = await callback(require("../../lib/prisma"))
          return [evidence, count]
        })

      // Mock individual calls for the transaction
      require("../../lib/prisma").skillEvidence.findMany.mockResolvedValue(mockEvidence)
      require("../../lib/prisma").skillEvidence.count.mockResolvedValue(mockEvidence.length)
    })

    it('should return skill evidence for authenticated student', async () => {
      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        evidence: mockEvidence,
        pagination: {
          page: 1,
          limit: 100,
          total: mockEvidence.length,
          totalPages: 1
        }
      })
    })

    it('should return skill evidence for specific student when authorized', async () => {
      // Mock session as teacher
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'teacher1',
          role: 'TEACHER'
        }
      })

      // Mock the requested student profile
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student1',
        userId: 'student1',
        user: { id: 'student1' }
      })

      const { req, res } = createMockReqRes("GET", null, { studentId: "student1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        evidence: mockEvidence,
        pagination: {
          page: 1,
          limit: 100,
          total: mockEvidence.length,
          totalPages: 1
        }
      })
    })

    it('should return 403 for unauthorized user trying to access another student\'s evidence', async () => {
      // Mock session as student trying to access another student's evidence
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'student1',
          role: 'STUDENT'
        }
      })

      // Mock the requested student profile (different user)
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student2',
        userId: 'student2',
        user: { id: 'student2' }
      })

      const { req, res } = createMockReqRes("GET", null, { studentId: "student2" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" })
    })

    it('should return 404 if student profile not found', async () => {
      // Mock student profile not found
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Student profile not found" })
    })

    it('should return 404 if specific student not found', async () => {
      // Mock session as teacher
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'teacher1',
          role: 'TEACHER'
        }
      })

      // Mock student not found
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("GET", null, { studentId: "nonexistent" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Student not found" })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").skillEvidence.findMany.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('POST /api/skill-evidence', () => {
    const mockSession = {
      user: {
        id: 'user1',
        role: 'STUDENT'
      }
    }

    const mockStudentProfile = {
      id: 'student1',
      userId: 'user1'
    }

    const mockEvidenceData = {
      studentId: 'student1',
      skillId: 'skill1',
      details: 'I demonstrated leadership in a group project',
      projectId: 'project1'
    }

    const mockCreatedEvidence = {
      id: 'evidence-new',
      studentId: 'student1',
      skillId: 'skill1',
      details: 'I demonstrated leadership in a group project',
      projectId: 'project1',
      verificationStatus: 'PENDING',
      level: 'BEGINNER',
      createdAt: new Date(),
      skill: {
        id: 'skill1',
        name: 'Leadership',
        description: 'Ability to guide and motivate a team'
      },
      project: {
        id: 'project1',
        title: 'Community Project',
        challenge: {
          id: 'challenge1',
          title: 'Community Service Challenge'
        }
      }
    }

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock student profile lookup
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue(mockStudentProfile)

      // Mock validation success
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockEvidenceData
      })

      // Mock permission checks (student creating for themselves)
      // isOwnStudent check
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student1',
        userId: 'user1'
      })

      // Mock existence checks
      require("../../lib/prisma").skill.findUnique.mockResolvedValue({
        id: 'skill1',
        name: 'Leadership'
      })

      require("../../lib/prisma").project.findUnique.mockResolvedValue({
        id: 'project1',
        title: 'Community Project'
      })

      // Mock evidence creation
      require("../../lib/prisma").skillEvidence.create.mockResolvedValue(mockCreatedEvidence)
    })

    it('should create skill evidence for authenticated student', async () => {
      const { req, res } = createMockReqRes("POST", mockEvidenceData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(mockCreatedEvidence)
    })

    it('should return 401 for unauthenticated user', async () => {
      // Mock no session
      require("next-auth").getServerSession.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", mockEvidenceData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    })

    it('should return 400 for validation errors', async () => {
      // Mock validation failure
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          details: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })

      const { req, res } = createMockReqRes("POST", {
        studentId: 'student1',
        skillId: 'skill1',
        details: '' // Invalid - empty
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        message: {
          en: "Please correct the highlighted fields and try again.",
          mr: "कृपया दाखवलेली क्षेत्रे दुरुस्त करून पुन्हा प्रयत्न करा."
        },
        errors: {
          details: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })
    })

    it('should return 404 if student not found', async () => {
      // Mock student not found
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", mockEvidenceData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Student not found" })
    })

    it('should return 404 if skill not found', async () => {
      // Mock skill not found
      require("../../lib/prisma").skill.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", mockEvidenceData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Skill not found" })
    })

    it('should return 404 if project not found', async () => {
      // Mock project not found
      require("../../lib/prisma").project.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", mockEvidenceData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Project not found" })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").skillEvidence.create.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("POST", mockEvidenceData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('PUT /api/skill-evidence (update skill evidence)', () => {
    const mockSession = {
      user: {
        id: 'teacher1',
        role: 'TEACHER'
      }
    }

    const mockEvidenceId = 'evidence1'
    const mockUpdateData = {
      verificationStatus: 'APPROVED',
      level: 'INTERMEDIATE'
    }

    const mockExistingEvidence = {
      id: 'evidence1',
      studentId: 'student1',
      skillId: 'skill1',
      details: 'I demonstrated leadership in a group project',
      verificationStatus: 'PENDING',
      level: 'BEGINNER',
      createdAt: new Date(),
      student: {
        id: 'student1',
        userId: 'student1',
        user: {
          id: 'user1',
          name: 'John Doe'
        }
      }
    }

    const mockUpdatedEvidence = {
      id: 'evidence1',
      studentId: 'student1',
      skillId: 'skill1',
      details: 'I demonstrated leadership in a group project',
      verificationStatus: 'APPROVED',
      level: 'INTERMEDIATE',
      createdAt: new Date(),
      skill: {
        id: 'skill1',
        name: 'Leadership',
        description: 'Ability to guide and motivate a team'
      }
    }

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock validation success
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockUpdateData
      })

      // Mock evidence retrieval
      require("../../lib/prisma").skillEvidence.findUnique.mockResolvedValue(mockExistingEvidence)

      // Mock student profile for ownership check
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student1',
        userId: 'user1'
      })

      // Mock permission checks
      // Teacher can update verification status and level
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student1',
        userId: 'user1'
      })

      // Mock evidence update
      require("../../lib/prisma").skillEvidence.update.mockResolvedValue(mockUpdatedEvidence)
    })

    it('should update skill evidence verification status and level for authorized teacher', async () => {
      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "evidence1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(mockUpdatedEvidence)
    })

    it('should allow owner to update details', async () => {
      // Mock session as the student owner
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'user1',
          role: 'STUDENT'
        }
      })

      // Mock evidence retrieval
      require("../../lib/prisma").skillEvidence.findUnique.mockResolvedValue(mockExistingEvidence)

      // Mock student profile for ownership check (student is owner)
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student1',
        userId: 'user1'
      })

      // Mock validation for details update
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: {
          details: 'Updated details with more information'
        }
      })

      // Mock evidence update
      const mockUpdatedEvidenceDetails = {
        ...mockExistingEvidence,
        details: 'Updated details with more information'
      }
      require("../../lib/prisma").skillEvidence.update.mockResolvedValue(mockUpdatedEvidenceDetails)

      const { req, res } = createMockReqRes("PUT", {
        details: 'Updated details with more information'
      }, { id: "evidence1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(mockUpdatedEvidenceDetails)
    })

    it('should return 401 for unauthenticated user', async () => {
      // Mock no session
      require("next-auth").getServerSession.mockResolvedValue(null)

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "evidence1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    })

    it('should return 400 for validation errors', async () => {
      // Mock validation failure
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          verificationStatus: { en: "Select a valid option.", mr: "कृपया वैध पर्याय निवडा." }
        }
      })

      const { req, res } = createMockReqRes("PUT", {
        verificationStatus: 'INVALID_STATUS' // Invalid verification status
      }, { id: "evidence1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        message: {
          en: "Please correct the highlighted fields and try again.",
          mr: "कृपया दाखवलेली क्षेत्रे दुरुस्त करून पुन्हा प्रयत्न करा."
        },
        errors: {
          verificationStatus: { en: "Select a valid option.", mr: "कृपया वैध पर्याय निवडा." }
        }
      })
    })

    it('should return 404 if skill evidence not found', async () => {
      // Mock skill evidence not found
      require("../../lib/prisma").skillEvidence.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "nonexistent" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Skill evidence not found" })
    })

    it('should return 403 for non-owner trying to update details', async () => {
      // Mock session as a different student (not the owner)
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'user2',
          role: 'STUDENT'
        }
      })

      // Mock evidence retrieval
      require("../../lib/prisma").skillEvidence.findUnique.mockResolvedValue(mockExistingEvidence)

      // Mock student profile for ownership check (different user)
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student2',
        userId: 'user2'
      })

      const { req, res } = createMockReqRes("PUT", {
        details: 'Attempted update by non-owner'
      }, { id: "evidence1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: "No valid fields to update or insufficient permissions" })
    })

    it('should return 403 for non-teacher/non-mentor/non-admin trying to update verification status', async () => {
      // Mock session as student trying to update verification status
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'user1',
          role: 'STUDENT'
        }
      })

      // Mock evidence retrieval
      require("../../lib/prisma").skillEvidence.findUnique.mockResolvedValue(mockExistingEvidence)

      // Mock student profile for ownership check (student is owner, but they can't update verification status)
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student1',
        userId: 'user1'
      })

      const { req, res } = createMockReqRes("PUT", {
        verificationStatus: 'APPROVED',
        level: 'INTERMEDIATE'
      }, { id: "evidence1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: "No valid fields to update or insufficient permissions" })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").skillEvidence.update.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "evidence1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('Other methods', () => {
    it('should return 405 for unsupported methods', async () => {
      const { req, res } = createMockReqRes("DELETE") // DELETE not supported

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(405)
      expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed" })
    })
  })
})