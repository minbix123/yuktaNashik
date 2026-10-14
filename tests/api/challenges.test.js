import { getServerSession } from "next-auth"
import { authOptions } from "../../pages/api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import { validateSchema, sendValidationError } from "../../lib/validation"

// Mock the dependencies
jest.mock("../../lib/prisma", () => ({
  challenge: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

describe('Challenges API Route', () => {
  // We'll test the actual handler function by importing it after mocking dependencies
  let handler

  beforeAll(() => {
    // Reset all mocks before tests
    jest.clearAllMocks()

    // Import the handler after mocking
    handler = require("../../pages/api/challenges").default
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

  describe('GET /api/challenges', () => {
    const mockSession = {
      user: {
        id: 'user1',
        role: 'STUDENT'
      }
    }

    const mockChallenges = [
      {
        id: 'challenge1',
        title: 'Test Challenge 1',
        description: 'Test Description 1',
        grade: 5,
        subject: 'Science',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock prisma transaction
      jest.spyOn(require("../../lib/prisma"), "$transaction")
        .mockImplementation(async (callback) => {
          if (Array.isArray(callback)) return Promise.all(callback)
          const challenges = await callback(require("../../lib/prisma"))
          const count = await callback(require("../../lib/prisma"))
          return [challenges, count]
        })

      // Mock individual calls for the transaction
      require("../../lib/prisma").challenge.findMany.mockResolvedValue(mockChallenges)
      require("../../lib/prisma").challenge.count.mockResolvedValue(mockChallenges.length)
    })

    it('should return challenges with pagination for authenticated user', async () => {
      const { req, res } = createMockReqRes("GET", null, { page: "1", limit: "10" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        challenges: mockChallenges,
        pagination: {
          page: 1,
          limit: 10,
          total: mockChallenges.length,
          totalPages: 1
        }
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      // Mock no session
      require("next-auth").getServerSession.mockResolvedValue(null)

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").challenge.findMany.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('POST /api/challenges', () => {
    const mockSession = {
      user: {
        id: 'teacher1',
        role: 'TEACHER'
      }
    }

    const mockChallengeData = {
      title: 'New Challenge',
      description: 'New Challenge Description',
      grade: 5,
      subject: 'Science'
    }

    const mockCreatedChallenge = {
      id: 'challenge-new',
      title: 'New Challenge',
      description: 'New Challenge Description',
      grade: 5,
      subject: 'Science',
      teacherId: 'teacher1',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock validation success
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockChallengeData
      })

      // Mock challenge creation
      require("../../lib/prisma").challenge.create.mockResolvedValue(mockCreatedChallenge)
    })

    it('should create a challenge for authenticated teacher', async () => {
      const { req, res } = createMockReqRes("POST", mockChallengeData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(mockCreatedChallenge)
    })

    it('should return 403 for non-teacher/non-school-admin users', async () => {
      // Mock student session
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'student1',
          role: 'STUDENT'
        }
      })

      const { req, res } = createMockReqRes("POST", mockChallengeData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" })
    })

    it('should return 400 for validation errors', async () => {
      // Mock validation failure
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          title: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })

      const { req, res } = createMockReqRes("POST", {
        title: '', // Invalid - empty
        description: 'Valid description',
        grade: 5,
        subject: 'Science'
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
          title: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").challenge.create.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("POST", mockChallengeData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('PUT /api/challenges (update)', () => {
    const mockSession = {
      user: {
        id: 'admin1',
        role: 'PLATFORM_ADMIN'
      }
    }

    const mockUpdateData = {
      id: 'challenge1',
      title: 'Updated Challenge',
      description: 'Updated Description',
      grade: 6,
      subject: 'Math'
    }

    const mockUpdatedChallenge = {
      id: 'challenge1',
      title: 'Updated Challenge',
      description: 'Updated Description',
      grade: 6,
      subject: 'Math',
      teacherId: 'teacher1',
      createdAt: new Date(),
      updatedAt: new Date()
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

      // Mock challenge update
      require("../../lib/prisma").challenge.update.mockResolvedValue(mockUpdatedChallenge)
    })

    it('should update a challenge for authenticated platform admin', async () => {
      const { req, res } = createMockReqRes("PUT", mockUpdateData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(mockUpdatedChallenge)
    })

    it('should return 403 for non-platform-admin users', async () => {
      // Mock teacher session
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'teacher1',
          role: 'TEACHER'
        }
      })

      const { req, res } = createMockReqRes("PUT", mockUpdateData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" })
    })

    it('should return 400 for validation errors (missing ID)', async () => {
      // Mock validation failure for missing ID
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          id: { en: "A challenge ID is required.", mr: "चॅलेंज आयडी आवश्यक आहे." }
        }
      })

      const { req, res } = createMockReqRes("PUT", {
        title: 'Updated Challenge',
        description: 'Updated Description',
        grade: 6,
        subject: 'Math'
        // Missing id
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
          id: { en: "A challenge ID is required.", mr: "चॅलेंज आयडी आवश्यक आहे." }
        }
      })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").challenge.update.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("PUT", mockUpdateData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('DELETE /api/challenges', () => {
    const mockSession = {
      user: {
        id: 'admin1',
        role: 'PLATFORM_ADMIN'
      }
    }

    const mockDeleteData = {
      id: 'challenge1'
    }

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock validation success
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockDeleteData
      })

      // Mock challenge deletion
      require("../../lib/prisma").challenge.delete.mockResolvedValue({})
    })

    it('should delete a challenge for authenticated platform admin', async () => {
      const { req, res } = createMockReqRes("DELETE", mockDeleteData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    it('should return 403 for non-platform-admin users', async () => {
      // Mock teacher session
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'teacher1',
          role: 'TEACHER'
        }
      })

      const { req, res } = createMockReqRes("DELETE", mockDeleteData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" })
    })

    it('should return 400 for validation errors (missing ID)', async () => {
      // Mock validation failure for missing ID
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          id: { en: "A challenge ID is required.", mr: "चॅलेंज आयडी आवश्यक आहे." }
        }
      })

      const { req, res } = createMockReqRes("DELETE", {}) // Empty body

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        message: {
          en: "Please correct the highlighted fields and try again.",
          mr: "कृपया दाखवलेली क्षेत्रे दुरुस्त करून पुन्हा प्रयत्न करा."
        },
        errors: {
          id: { en: "A challenge ID is required.", mr: "चॅलेंज आयडी आवश्यक आहे." }
        }
      })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").challenge.delete.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("DELETE", mockDeleteData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('Other methods', () => {
    it('should return 405 for unsupported methods', async () => {
      const { req, res } = createMockReqRes("PATCH") // PATCH not supported

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(405)
      expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed" })
    })
  })
})