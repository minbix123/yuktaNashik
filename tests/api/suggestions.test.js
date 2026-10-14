import { getServerSession } from "next-auth"
import { authOptions } from "../../pages/api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import { validateSchema, sendValidationError } from "../../lib/validation"

// Mock the dependencies
jest.mock("../../lib/prisma", () => ({
  suggestion: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  challenge: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  studentProfile: {
    findUnique: jest.fn(),
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

describe('Suggestions API Route', () => {
  // We'll test the actual handler function by importing it after mocking dependencies
  let handler

  beforeAll(() => {
    // Reset all mocks before tests
    jest.clearAllMocks()

    // Import the handler after mocking
    handler = require("../../pages/api/suggestions").default
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

  describe('GET /api/suggestions', () => {
    const mockMentorSession = {
      user: {
        id: 'mentor1',
        role: 'MENTOR'
      }
    }

    const mockStudentSession = {
      user: {
        id: 'student1',
        role: 'STUDENT'
      }
    }

    const mockMentorSuggestions = [
      {
        id: 'suggestion1',
        mentorId: 'mentor1',
        studentId: 'student1',
        challengeId: 'challenge1',
        message: 'I think this challenge would be great for you',
        createdAt: new Date(),
        challenge: {
          id: 'challenge1',
          title: 'Community Service Challenge',
          description: 'Help the local community',
          grade: 5,
          subject: 'Social Studies'
        },
        student: {
          id: 'student1',
          name: 'John Doe'
        }
      }
    ]

    const mockStudentSuggestions = [
      {
        id: 'suggestion1',
        mentorId: 'mentor1',
        studentId: 'student1',
        challengeId: 'challenge1',
        message: 'I think this challenge would be great for you',
        createdAt: new Date(),
        challenge: {
          id: 'challenge1',
          title: 'Community Service Challenge',
          description: 'Help the local community',
          grade: 5,
          subject: 'Social Studies'
        },
        mentor: {
          id: 'mentor1',
          name: 'Jane Smith'
        }
      }
    ]

    describe('Mentor Access', () => {
      beforeEach(() => {
        jest.clearAllMocks()
        require("next-auth").getServerSession.mockResolvedValue(mockMentorSession)
        require("../../lib/prisma").suggestion.findMany.mockResolvedValue(mockMentorSuggestions)
      })

      it('should return suggestions for mentor', async () => {
        const { req, res } = createMockReqRes("GET")

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(mockMentorSuggestions)
      })
    })

    describe('Student Access', () => {
      beforeEach(() => {
        jest.clearAllMocks()
        require("next-auth").getServerSession.mockResolvedValue(mockStudentSession)
        require("../../lib/prisma").suggestion.findMany.mockResolvedValue(mockStudentSuggestions)
      })

      it('should return suggestions for student', async () => {
        const { req, res } = createMockReqRes("GET")

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(mockStudentSuggestions)
      })
    })

    it('should return 403 for non-mentor/non-student users', async () => {
      const mockSession = {
        user: {
          id: 'teacher1',
          role: 'TEACHER'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" })
    })

    it('should handle internal server errors', async () => {
      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockMentorSession)
      require("../../lib/prisma").suggestion.findMany.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('POST /api/suggestions', () => {
    const mockMentorSession = {
      user: {
        id: 'mentor1',
        role: 'MENTOR'
      }
    }

    const mockSuggestionData = {
      challengeId: 'challenge1',
      studentId: 'student1',
      message: 'I think this challenge would be great for you'
    }

    const mockCreatedSuggestion = {
      id: 'suggestion-new',
      mentorId: 'mentor1',
      studentId: 'student1',
      challengeId: 'challenge1',
      message: 'I think this challenge would be great for you',
      createdAt: new Date(),
      challenge: {
        id: 'challenge1',
        title: 'Community Service Challenge',
        description: 'Help the local community',
        grade: 5,
        subject: 'Social Studies'
      },
      student: {
        id: 'student1',
        name: 'John Doe'
      }
    }

    beforeEach(() => {
      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockMentorSession)
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockSuggestionData
      })

      // Mock existence checks
      require("../../lib/prisma").challenge.findUnique.mockResolvedValue({
        id: 'challenge1',
        title: 'Community Service Challenge'
      })

      require("../../lib/prisma").user.findUnique.mockResolvedValue({
        id: 'student1',
        name: 'John Doe'
      })

      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        userId: 'student1'
      })

      // Mock suggestion creation
      require("../../lib/prisma").suggestion.create.mockResolvedValue(mockCreatedSuggestion)
    })

    it('should create a suggestion for authenticated mentor', async () => {
      const { req, res } = createMockReqRes("POST", mockSuggestionData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(mockCreatedSuggestion)
    })

    it('should return 403 for non-mentor users', async () => {
      const mockSession = {
        user: {
          id: 'student1',
          role: 'STUDENT'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      const { req, res } = createMockReqRes("POST", mockSuggestionData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" })
    })

    it('should return 400 for validation errors', async () => {
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          message: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })

      const { req, res } = createMockReqRes("POST", {
        challengeId: 'challenge1',
        studentId: 'student1',
        message: '' // Invalid - empty
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
          message: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })
    })

    it('should return 404 if challenge not found', async () => {
      // Mock challenge not found
      require("../../lib/prisma").challenge.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", mockSuggestionData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Challenge not found" })
    })

    it('should return 404 if student not found', async () => {
      // Mock student not found
      require("../../lib/prisma").user.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", mockSuggestionData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Student not found" })
    })

    it('should return 400 if user is not a student', async () => {
      // Mock user exists but is not a student (no student profile)
      require("../../lib/prisma").user.findUnique.mockResolvedValue({
        id: 'student1',
        name: 'John Doe'
      })

      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", mockSuggestionData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: "User is not a student" })
    })

    it('should handle internal server errors', async () => {
      require("../../lib/prisma").suggestion.create.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("POST", mockSuggestionData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('PUT /api/suggestions (update suggestion status)', () => {
    const mockStudentSession = {
      user: {
        id: 'student1',
        role: 'STUDENT'
      }
    }

    const mockSuggestionId = 'suggestion1'
    const mockUpdateData = {
      status: 'ACCEPTED'
    }

    const mockExistingSuggestion = {
      id: 'suggestion1',
      mentorId: 'mentor1',
      studentId: 'student1',
      challengeId: 'challenge1',
      message: 'I think this challenge would be great for you',
      status: 'PENDING',
      createdAt: new Date(),
      student: {
        id: 'student1',
        name: 'John Doe'
      }
    }

    const mockUpdatedSuggestion = {
      id: 'suggestion1',
      mentorId: 'mentor1',
      studentId: 'student1',
      challengeId: 'challenge1',
      message: 'I think this challenge would be great for you',
      status: 'ACCEPTED',
      createdAt: new Date(),
      student: {
        id: 'student1',
        name: 'John Doe'
      },
      mentor: {
        id: 'mentor1',
        name: 'Jane Smith'
      }
    }

    beforeEach(() => {
      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockStudentSession)
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockUpdateData
      })

      // Mock suggestion retrieval
      require("../../lib/prisma").suggestion.findUnique.mockResolvedValue(mockExistingSuggestion)

      // Mock suggestion update
      require("../../lib/prisma").suggestion.update.mockResolvedValue(mockUpdatedSuggestion)
    })

    it('should update suggestion status for authenticated student who owns the suggestion', async () => {
      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "suggestion1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(mockUpdatedSuggestion)
    })

    it('should return 401 for unauthenticated user', async () => {
      // Mock no session
      require("next-auth").getServerSession.mockResolvedValue(null)

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "suggestion1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    })

    it('should return 403 for non-student users', async () => {
      const mockSession = {
        user: {
          id: 'mentor1',
          role: 'MENTOR'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "suggestion1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" })
    })

    it('should return 403 for student trying to update another student\'s suggestion', async () => {
      // Mock session as student trying to update another student's suggestion
      const mockSession = {
        user: {
          id: 'student2',
          role: 'STUDENT'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock suggestion retrieval (belongs to student1)
      require("../../lib/prisma").suggestion.findUnique.mockResolvedValue(mockExistingSuggestion)

      // Mock student profile for ownership check (student2 is not the owner)
      require("../../lib/prisma").user.findUnique.mockResolvedValue({
        id: 'student2',
        name: 'Jane Smith'
      })

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "suggestion1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" })
    })

    it('should return 400 for validation errors', async () => {
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          status: { en: "Select a valid option.", mr: "कृपया वैध पर्याय निवडा." }
        }
      })

      const { req, res } = createMockReqRes("PUT", {
        status: 'INVALID_STATUS' // Invalid status
      }, { id: "suggestion1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        message: {
          en: "Please correct the highlighted fields and try again.",
          mr: "कृपया दाखवलेली क्षेत्रे दुरुस्त करून पुन्हा प्रयत्न करा."
        },
        errors: {
          status: { en: "Select a valid option.", mr: "कृपया वैध पर्याय निवडा." }
        }
      })
    })

    it('should return 404 if suggestion not found', async () => {
      // Mock suggestion not found
      require("../../lib/prisma").suggestion.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "nonexistent" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Suggestion not found" })
    })

    it('should handle internal server errors', async () => {
      require("../../lib/prisma").suggestion.update.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "suggestion1" })

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