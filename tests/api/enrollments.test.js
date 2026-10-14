import { getServerSession } from "next-auth"
import { authOptions } from "../../pages/api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import { validateSchema, sendValidationError } from "../../lib/validation"

// Mock the dependencies
jest.mock("../../lib/prisma", () => ({
  enrollment: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  studentProfile: {
    findUnique: jest.fn(),
  },
  teacherProfile: {
    findUnique: jest.fn(),
  },
  class: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
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

describe('Enrollments API Route', () => {
  // We'll test the actual handler function by importing it after mocking dependencies
  let handler

  beforeAll(() => {
    // Reset all mocks before tests
    jest.clearAllMocks()

    // Import the handler after mocking
    handler = require("../../pages/api/enrollments").default
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

  describe('GET /api/enrollments', () => {
    const mockSession = {
      user: {
        id: 'user1',
        role: 'STUDENT'
      }
    }

    const mockEnrollments = [
      {
        id: 'enrollment1',
        studentId: 'student1',
        classId: 'class1',
        enrolledAt: new Date(),
        student: {
          id: 'student1',
          userId: 'user1',
          user: {
            id: 'user1',
            name: 'John Doe',
            email: 'john@example.com'
          },
          studentProfile: {
            id: 'student1',
            userId: 'user1',
            school: {
              id: 'school1',
              name: 'Test School'
            }
          }
        },
        class: {
          id: 'class1',
          name: 'Grade 3 Section A',
          grade: 3,
          school: {
            id: 'school1',
            name: 'Test School'
          },
          teacher: {
            id: 'teacher1',
            user: {
              id: 'user2',
              name: 'Jane Smith'
            }
          }
        }
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
          const enrollments = await callback(require("../../lib/prisma"))
          const count = await callback(require("../../lib/prisma"))
          return [enrollments, count]
        })

      // Mock individual calls for the transaction
      require("../../lib/prisma").enrollment.findMany.mockResolvedValue(mockEnrollments)
      require("../../lib/prisma").enrollment.count.mockResolvedValue(mockEnrollments.length)

      // Mock related queries for role-based filtering
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student1',
        userId: 'user1'
      })

      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue(null)
      require("../../lib/prisma").class.findMany.mockResolvedValue([])
    })

    it('should return enrollments with pagination for authenticated student', async () => {
      const { req, res } = createMockReqRes("GET", null, { page: "1", limit: "10" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        enrollments: mockEnrollments,
        pagination: {
          page: 1,
          limit: 10,
          total: mockEnrollments.length,
          totalPages: 1
        }
      })
    })

    it('should filter by studentId when provided', async () => {
      const { req, res } = createMockReqRes("GET", null, { studentId: "student1", page: "1", limit: "10" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        enrollments: mockEnrollments,
        pagination: {
          page: 1,
          limit: 10,
          total: mockEnrollments.length,
          totalPages: 1
        }
      })
    })

    it('should filter by classId when provided', async () => {
      const { req, res } = createMockReqRes("GET", null, { classId: "class1", page: "1", limit: "10" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        enrollments: mockEnrollments,
        pagination: {
          page: 1,
          limit: 10,
          total: mockEnrollments.length,
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
      require("../../lib/prisma").enrollment.findMany.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('POST /api/enrollments', () => {
    const mockSession = {
      user: {
        id: 'teacher1',
        role: 'TEACHER'
      }
    }

    const mockEnrollmentData = {
      studentId: 'student1',
      classId: 'class1'
    }

    const mockCreatedEnrollment = {
      id: 'enrollment-new',
      studentId: 'student1',
      classId: 'class1',
      enrolledAt: new Date(),
      student: {
        id: 'student1',
        userId: 'student1',
        user: {
          id: 'student1',
          name: 'John Doe',
          email: 'john@example.com'
        }
      },
      class: {
        id: 'class1',
        name: 'Grade 3 Section A',
        grade: 3,
        school: {
          id: 'school1',
          name: 'Test School'
        },
        teacher: {
          id: 'teacher1',
          user: {
            id: 'user1',
            name: 'Jane Smith'
          }
        }
      }
    }

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock validation success
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockEnrollmentData
      })

      // Mock permission checks
      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
        id: 'teacher1',
        userId: 'teacher1'
      })

      require("../../lib/prisma").class.findUnique.mockResolvedValue({
        id: 'class1',
        teacherId: 'teacher1'
      })

      // Verify student exists
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student1',
        userId: 'student1'
      })

      // Verify no existing enrollment
      require("../../lib/prisma").enrollment.findFirst.mockResolvedValue(null)

      // Mock enrollment creation
      require("../../lib/prisma").enrollment.create.mockResolvedValue(mockCreatedEnrollment)
    })

    it('should create an enrollment for authenticated teacher', async () => {
      const { req, res } = createMockReqRes("POST", mockEnrollmentData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(mockCreatedEnrollment)
    })

    it('should return 403 for non-teacher/non-school-admin/non-platform-admin users', async () => {
      // Mock student session
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'student1',
          role: 'STUDENT'
        }
      })

      const { req, res } = createMockReqRes("POST", mockEnrollmentData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Insufficient permissions" })
    })

    it('should return 400 for validation errors', async () => {
      // Mock validation failure
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          studentId: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })

      const { req, res } = createMockReqRes("POST", {
        studentId: '', // Invalid - empty
        classId: 'class1'
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
          studentId: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })
    })

    it('should return 404 if student not found', async () => {
      // Mock student not found
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", mockEnrollmentData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Student not found" })
    })

    it('should return 404 if class not found', async () => {
      // Mock class not found
      require("../../lib/prisma").class.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", mockEnrollmentData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Class not found" })
    })

    it('should return 400 if student is already enrolled', async () => {
      // Mock existing enrollment
      require("../../lib/prisma").enrollment.findFirst.mockResolvedValue({
        id: 'existing-enrollment',
        studentId: 'student1',
        classId: 'class1'
      })

      const { req, res } = createMockReqRes("POST", mockEnrollmentData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: "Student is already enrolled in this class" })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").enrollment.create.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("POST", mockEnrollmentData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('DELETE /api/enrollments', () => {
    const mockSession = {
      user: {
        id: 'teacher1',
        role: 'TEACHER'
      }
    }

    const mockEnrollmentData = {
      studentId: 'student1',
      classId: 'class1'
    }

    const mockExistingEnrollment = {
      id: 'enrollment1',
      studentId: 'student1',
      classId: 'class1',
      enrolledAt: new Date()
    }

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock validation success
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockEnrollmentData
      })

      // Mock permission checks
      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
        id: 'teacher1',
        userId: 'teacher1'
      })

      require("../../lib/prisma").class.findUnique.mockResolvedValue({
        id: 'class1',
        teacherId: 'teacher1'
      })

      // Mock existing enrollment
      require("../../lib/prisma").enrollment.findFirst.mockResolvedValue(mockExistingEnrollment)
    })

    it('should delete an enrollment for authenticated teacher', async () => {
      const { req, res } = createMockReqRes("DELETE", null, mockEnrollmentData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ message: "Student withdrawn from class successfully" })
    })

    it('should return 403 for non-teacher/non-school-admin/non-platform-admin users', async () => {
      // Mock student session
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'student1',
          role: 'STUDENT'
        }
      })

      const { req, res } = createMockReqRes("DELETE", null, mockEnrollmentData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Insufficient permissions" })
    })

    it('should return 400 for validation errors', async () => {
      // Mock validation failure
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          studentId: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })

      const { req, res } = createMockReqRes("DELETE", null, {
        studentId: '', // Invalid - empty
        classId: 'class1'
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
          studentId: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })
    })

    it('should return 404 if enrollment not found', async () => {
      // Mock enrollment not found
      require("../../lib/prisma").enrollment.findFirst.mockResolvedValue(null)

      const { req, res } = createMockReqRes("DELETE", null, mockEnrollmentData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Enrollment not found" })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").enrollment.delete.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("DELETE", null, mockEnrollmentData)

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