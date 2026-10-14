import { getServerSession } from "next-auth"
import { authOptions } from "../../pages/api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import { validateSchema, sendValidationError } from "../../lib/validation"

// Mock the dependencies
jest.mock("../../lib/prisma", () => ({
  challenge: {
    findUnique: jest.fn(),
  },
  studentProfile: {
    findUnique: jest.fn(),
  },
  project: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
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

describe('Projects API Route', () => {
  // We'll test the actual handler function by importing it after mocking dependencies
  let handler

  beforeAll(() => {
    // Reset all mocks before tests
    jest.clearAllMocks()

    // Import the handler after mocking
    // We need to dynamically import it since we mocked the dependencies
    handler = require("../../pages/api/projects").default
  })

  const createMockReqRes = (method, body = null, sessionData = null) => {
    const req = {
      method,
      body: body || {}
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    return { req, res }
  }

  describe('POST /api/projects', () => {
    const mockSession = {
      user: {
        id: 'user1',
        role: 'STUDENT'
      }
    }

    const mockChallenge = {
      id: 'challenge1',
      title: 'Test Challenge',
      description: 'Test Description'
    }

    const mockStudentProfile = {
      id: 'student1',
      userId: 'user1'
    }

    beforeEach(() => {
      jest.clearAllMocks()

      // Setup default mock responses
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: {
          challengeId: 'challenge1',
          studentId: 'student1'
        }
      })

      require("../../lib/prisma").challenge.findUnique.mockResolvedValue(mockChallenge)
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue(mockStudentProfile)
      require("../../lib/prisma").project.findFirst.mockResolvedValue(null) // No existing project
      require("../../lib/prisma").project.create.mockResolvedValue({
        id: 'project1',
        title: 'Test Challenge',
        description: 'Test Description',
        challengeId: 'challenge1',
        studentId: 'student1',
        status: 'DRAFT'
      })

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)
    })

    it('should create a project for authenticated student', async () => {
      const { req, res } = createMockReqRes("POST", {
        challengeId: 'challenge1',
        studentId: 'student1'
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        id: 'project1',
        title: 'Test Challenge',
        description: 'Test Description',
        challengeId: 'challenge1',
        studentId: 'student1',
        status: 'DRAFT'
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      // Mock no session
      require("next-auth").getServerSession.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", {
        challengeId: 'challenge1',
        studentId: 'student1'
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    })

    it('should return 403 for non-student users', async () => {
      // Mock teacher session
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'user1',
          role: 'TEACHER'
        }
      })

      const { req, res } = createMockReqRes("POST", {
        challengeId: 'challenge1',
        studentId: 'student1'
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" })
    })

    it('should return 400 for validation errors', async () => {
      // Mock validation failure
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          challengeId: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })

      const { req, res } = createMockReqRes("POST", {
        challengeId: '', // Invalid - empty
        studentId: 'student1'
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
          challengeId: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })
    })

    it('should return 404 if challenge not found', async () => {
      // Mock challenge not found
      require("../../lib/prisma").challenge.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", {
        challengeId: 'nonexistent',
        studentId: 'student1'
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Challenge not found" })
    })

    it('should return 403 if student does not match session', async () => {
      // Mock student profile with different userId
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student1',
        userId: 'different-user-id' // Doesn't match session
      })

      const { req, res } = createMockReqRes("POST", {
        challengeId: 'challenge1',
        studentId: 'student1'
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" })
    })

    it('should return 400 if project already exists', async () => {
      // Mock existing project
      require("../../lib/prisma").project.findFirst.mockResolvedValue({
        id: 'existing-project',
        challengeId: 'challenge1',
        studentId: 'student1'
      })

      const { req, res } = createMockReqRes("POST", {
        challengeId: 'challenge1',
        studentId: 'student1'
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: "Project already started for this challenge"
      })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").project.create.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("POST", {
        challengeId: 'challenge1',
        studentId: 'student1'
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('GET /api/projects', () => {
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

    const mockProjects = [
      {
        id: 'project1',
        title: 'Test Challenge 1',
        description: 'Test Description 1',
        status: 'DRAFT',
        challenge: {
          title: 'Challenge 1',
          description: 'Description 1'
        },
        student: {
          id: 'student1',
          studentProfile: {
            user: {
              name: 'John Doe',
              image: 'image1.jpg'
            }
          }
        }
      }
    ]

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock student profile
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue(mockStudentProfile)

      // Mock projects
      require("../../lib/prisma").project.findMany.mockResolvedValue(mockProjects)
    })

    it('should return projects for authenticated student', async () => {
      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(mockProjects)
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
      require("../../lib/prisma").project.findMany.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('Other methods', () => {
    it('should return 405 for unsupported methods', async () => {
      const { req, res } = createMockReqRes("PUT") // PUT not supported

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(405)
      expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed" })
    })
  })
})