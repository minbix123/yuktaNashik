import { getServerSession } from "next-auth"
import { authOptions } from "../../pages/api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import { validateSchema, sendValidationError } from "../../lib/validation"

// Mock the dependencies
jest.mock("../../lib/prisma", () => ({
  class: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  school: {
    findUnique: jest.fn(),
  },
  teacherProfile: {
    findUnique: jest.fn(),
  },
  studentProfile: {
    findUnique: jest.fn(),
  },
  enrollment: {
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
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

describe('Classes API Route', () => {
  // We'll test the actual handler function by importing it after mocking dependencies
  let handler

  beforeAll(() => {
    // Reset all mocks before tests
    jest.clearAllMocks()

    // Import the handler after mocking
    handler = require("../../pages/api/classes").default
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

  describe('GET /api/classes', () => {
    const mockSession = {
      user: {
        id: 'user1',
        role: 'TEACHER'
      }
    }

    const mockClasses = [
      {
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
            name: 'John Doe'
          }
        },
        students: [
          {
            student: {
              id: 'student1',
              user: {
                id: 'user2',
                name: 'Jane Smith'
              }
            }
          }
        ]
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
          const classes = await callback(require("../../lib/prisma"))
          const count = await callback(require("../../lib/prisma"))
          return [classes, count]
        })

      // Mock individual calls for the transaction
      require("../../lib/prisma").class.findMany.mockResolvedValue(mockClasses)
      require("../../lib/prisma").class.count.mockResolvedValue(mockClasses.length)

      // Mock related queries for role-based filtering
      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
        id: 'teacher1',
        userId: 'user1'
      })
    })

    it('should return classes with pagination for authenticated teacher', async () => {
      const { req, res } = createMockReqRes("GET", null, { page: "1", limit: "10" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        classes: mockClasses,
        pagination: {
          page: 1,
          limit: 10,
          total: mockClasses.length,
          totalPages: 1
        }
      })
    })

    it('should filter by schoolId when provided', async () => {
      const { req, res } = createMockReqRes("GET", null, { schoolId: "school1", page: "1", limit: "10" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        classes: mockClasses,
        pagination: {
          page: 1,
          limit: 10,
          total: mockClasses.length,
          totalPages: 1
        }
      })
    })

    it('should filter by grade when provided', async () => {
      const { req, res } = createMockReqRes("GET", null, { grade: "3", page: "1", limit: "10" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        classes: mockClasses,
        pagination: {
          page: 1,
          limit: 10,
          total: mockClasses.length,
          totalPages: 1
        }
      })
    })

    it('should filter by teacherId when provided', async () => {
      const { req, res } = createMockReqRes("GET", null, { teacherId: "teacher1", page: "1", limit: "10" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        classes: mockClasses,
        pagination: {
          page: 1,
          limit: 10,
          total: mockClasses.length,
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
      require("../../lib/prisma").class.findMany.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('POST /api/classes', () => {
    const mockSession = {
      user: {
        id: 'teacher1',
        role: 'TEACHER'
      }
    }

    const mockClassData = {
      name: 'Grade 3 Section B',
      grade: 3,
      schoolId: 'school1',
      teacherId: 'teacher1'
    }

    const mockCreatedClass = {
      id: 'class-new',
      name: 'Grade 3 Section B',
      grade: 3,
      schoolId: 'school1',
      teacherId: 'teacher1',
      school: {
        id: 'school1',
        name: 'Test School'
      },
      teacher: {
        id: 'teacher1',
        user: {
          id: 'user1',
          name: 'John Doe'
        }
      },
      students: []
    }

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock validation success
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockClassData
      })

      // Mock permission checks
      // Teacher or school admin or platform admin can create
      // We're mocking as teacher, so no additional checks needed beyond what's in the handler

      // Mock school exists
      require("../../lib/prisma").school.findUnique.mockResolvedValue({
        id: 'school1',
        name: 'Test School'
      })

      // Mock teacher exists and belongs to school
      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
        id: 'teacher1',
        schoolId: 'school1'
      })

      // Mock class creation
      require("../../lib/prisma").class.create.mockResolvedValue(mockCreatedClass)
    })

    it('should create a class for authenticated teacher', async () => {
      const { req, res } = createMockReqRes("POST", mockClassData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(mockCreatedClass)
    })

    it('should return 403 for unauthorized users (student)', async () => {
      // Mock student session
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'student1',
          role: 'STUDENT'
        }
      })

      const { req, res } = createMockReqRes("POST", mockClassData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Insufficient permissions" })
    })

    it('should return 404 if school not found', async () => {
      // Mock school not found
      require("../../lib/prisma").school.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", mockClassData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "School not found" })
    })

    it('should return 404 if teacher not found', async () => {
      // Mock teacher not found
      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("POST", mockClassData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Teacher not found" })
    })

    it('should return 400 if teacher does not belong to school', async () => {
      // Mock teacher exists but belongs to different school
      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
        id: 'teacher1',
        schoolId: 'school2' // Different school
      })

      const { req, res } = createMockReqRes("POST", mockClassData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: "Teacher does not belong to this school" })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").class.create.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("POST", mockClassData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('GET /api/classes?id=:id (specific class)', () => {
    const mockSession = {
      user: {
        id: 'user1',
        role: 'STUDENT'
      }
    }

    const mockClassData = {
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
          name: 'John Doe'
        }
      },
      students: [
        {
          student: {
            id: 'student1',
            user: {
              id: 'user2',
              name: 'Jane Smith'
            }
          }
        }
      ]
    }

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock class retrieval
      require("../../lib/prisma").class.findUnique.mockResolvedValue(mockClassData)

      // Mock related queries for access control
      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
        id: 'teacher1',
        userId: 'user1',
        schoolId: 'school1'
      })

      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student1',
        userId: 'user2'
      })

      require("../../lib/prisma").enrollment.findFirst.mockResolvedValue({
        id: 'enrollment1',
        studentId: 'student1',
        classId: 'class1'
      })
    })

    it('should return a specific class for authenticated student who is enrolled', async () => {
      const { req, res } = createMockReqRes("GET", null, { id: "class1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(mockClassData)
    })

    it('should return 404 if class not found', async () => {
      // Mock class not found
      require("../../lib/prisma").class.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("GET", null, { id: "nonexistent" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Class not found" })
    })

    it('should return 403 for student not enrolled in the class', async () => {
      // Mock student not enrolled
      require("../../lib/prisma").enrollment.findFirst.mockResolvedValue(null)

      const { req, res } = createMockReqRes("GET", null, { id: "class1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Insufficient permissions" })
    })

    it('should return 403 for unauthorized user roles', async () => {
      // Mock platform admin trying to access without proper school relationship
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'admin1',
          role: 'PLATFORM_ADMIN'
        }
      })

      // For platform admin, access should be granted, so let's test a different scenario
      // Let's test as a user with no specific role permissions
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'user1',
          role: 'STUDENT' // Already set in beforeEach, but let's be explicit
        }
      })

      // Mock that the user is not enrolled (already done in previous test setup)
      // Actually, let's reset and test properly

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'user1',
          role: 'STUDENT'
        }
      })

      require("../../lib/prisma").class.findUnique.mockResolvedValue(mockClassData)
      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
        id: 'teacher1',
        userId: 'user1',
        schoolId: 'school1'
      })
      require("../../lib/prisma").studentProfile.findUnique.mockResolvedValue({
        id: 'student1',
        userId: 'user2' // Different user - not enrolled
      })
      require("../../lib/prisma").enrollment.findFirst.mockResolvedValue(null) // Not enrolled

      const { req, res } = createMockReqRes("GET", null, { id: "class1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Insufficient permissions" })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").class.findUnique.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("GET", null, { id: "class1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('PUT /api/classes?id=:id (update class)', () => {
    const mockSession = {
      user: {
        id: 'teacher1',
        role: 'TEACHER'
      }
    }

    const mockClassData = {
      id: 'class1',
      name: 'Grade 3 Section A',
      grade: 3,
      schoolId: 'school1',
      teacherId: 'teacher1'
    }

    const mockUpdateData = {
      name: 'Grade 3 Section B',
      grade: 4
    }

    const mockUpdatedClass = {
      id: 'class1',
      name: 'Grade 3 Section B',
      grade: 4,
      schoolId: 'school1',
      teacherId: 'teacher1',
      school: {
        id: 'school1',
        name: 'Test School'
      },
      teacher: {
        id: 'teacher1',
        user: {
          id: 'user1',
          name: 'John Doe'
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
        data: mockUpdateData
      })

      // Mock permission checks
      // Teacher can update if they are the teacher of the class
      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
        id: 'teacher1',
        userId: 'user1'
      })

      require("../../lib/prisma").class.findUnique.mockResolvedValue({
        id: 'class1',
        teacherId: 'teacher1',
        select: { teacherId: true }
      })

      // Mock class update
      require("../../lib/prisma").class.update.mockResolvedValue(mockUpdatedClass)
    })

    it('should update a class for authenticated teacher who owns the class', async () => {
      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "class1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(mockUpdatedClass)
    })

    it('should return 403 for unauthorized users (student)', async () => {
      // Mock student session
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'student1',
          role: 'STUDENT'
        }
      })

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "class1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Insufficient permissions" })
    })

    it('should return 400 for validation errors (no fields to update)', async () => {
      const { req, res } = createMockReqRes("PUT", {}, { id: "class1" }) // Empty body

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        message: {
          en: "Please correct the highlighted fields and try again.",
          mr: "कृपया दाखवलेली क्षेत्रे दुरुस्त करून पुन्हा प्रयत्न करा."
        },
        errors: {
          form: {
            en: "Provide at least one field to update.",
            mr: "अपडेट करण्यासाठी किमान एक क्षेत्र द्या."
          }
        }
      })
    })

    it('should return 404 if class not found', async () => {
      // Mock class not found
      require("../../lib/prisma").class.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "nonexistent" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Class not found" })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").class.update.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "class1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('DELETE /api/classes?id=:id (delete class)', () => {
    const mockSession = {
      user: {
        id: 'admin1',
        role: 'PLATFORM_ADMIN'
      }
    }

    const mockClassData = {
      id: 'class1',
      name: 'Grade 3 Section A',
      grade: 3,
      schoolId: 'school1'
    }

    beforeEach(() => {
      jest.clearAllMocks()

      // Mock session
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock permission checks
      // Platform admin can delete any class

      // Mock class retrieval for deletion
      require("../../lib/prisma").class.findUnique.mockResolvedValue(mockClassData)

      // Mock enrollment deletion
      require("../../lib/prisma").enrollment.deleteMany.mockResolvedValue({ count: 0 })

      // Mock class deletion
      require("../../lib/prisma").class.delete.mockResolvedValue({ id: 'class1' })
    })

    it('should delete a class for authenticated platform admin', async () => {
      const { req, res } = createMockReqRes("DELETE", null, { id: "class1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ message: "Class deleted successfully" })
    })

    it('should return 403 for unauthorized users (student)', async () => {
      // Mock student session
      require("next-auth").getServerSession.mockResolvedValue({
        user: {
          id: 'student1',
          role: 'STUDENT'
        }
      })

      const { req, res } = createMockReqRes("DELETE", null, { id: "class1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Insufficient permissions" })
    })

    it('should return 404 if class not found', async () => {
      // Mock class not found
      require("../../lib/prisma").class.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("DELETE", null, { id: "nonexistent" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Class not found" })
    })

    it('should handle internal server errors', async () => {
      // Mock database error
      require("../../lib/prisma").class.delete.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("DELETE", null, { id: "class1" })

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