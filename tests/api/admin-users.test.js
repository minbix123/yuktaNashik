import { getServerSession } from "next-auth"
import { authOptions } from "../../pages/api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import { validateSchema, sendValidationError } from "../../lib/validation"

// Mock the dependencies
jest.mock("../../lib/prisma", () => ({
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  studentProfile: {
    create: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  teacherProfile: {
    create: jest.fn(),
    upsert: jest.fn(),
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

describe('Admin Users API Route', () => {
  // We'll test the actual handler function by importing it after mocking dependencies
  let handler

  beforeAll(() => {
    // Reset all mocks before tests
    jest.clearAllMocks()

    // Import the handler after mocking
    handler = require("../../pages/api/admin/users").default
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

  describe('GET /api/admin/users', () => {
    const mockPlatformAdminSession = {
      user: {
        id: 'admin1',
        role: 'PLATFORM_ADMIN'
      }
    }

    const mockSchoolAdminSession = {
      user: {
        id: 'teacher1',
        role: 'SCHOOL_ADMIN',
        schoolId: 'school1'
      }
    }

    const mockUsers = [
      {
        id: 'user1',
        email: 'student1@example.com',
        name: 'John Doe',
        role: 'STUDENT',
        emailVerified: new Date(),
        createdAt: new Date(),
        studentProfile: {
          id: 'student1',
          userId: 'user1',
          schoolId: 'school1'
        },
        teacherProfile: null
      },
      {
        id: 'user2',
        email: 'teacher1@example.com',
        name: 'Jane Smith',
        role: 'TEACHER',
        emailVerified: new Date(),
        createdAt: new Date(),
        studentProfile: null,
        teacherProfile: {
          id: 'teacher1',
          userId: 'user2',
          schoolId: 'school1'
        }
      }
    ]

    describe('Platform Admin Access', () => {
      beforeEach(() => {
        jest.clearAllMocks()
        require("next-auth").getServerSession.mockResolvedValue(mockPlatformAdminSession)

        // Mock prisma transaction
        jest.spyOn(require("../../lib/prisma"), "$transaction")
          .mockImplementation(async (callback) => {
            if (Array.isArray(callback)) return Promise.all(callback)
            const users = await callback(require("../../lib/prisma"))
            const count = await callback(require("../../lib/prisma"))
            return [users, count]
          })

        // Mock individual calls for the transaction
        require("../../lib/prisma").user.findMany.mockResolvedValue(mockUsers)
        require("../../lib/prisma").user.count.mockResolvedValue(mockUsers.length)
      })

      it('should return all users for platform admin', async () => {
        const { req, res } = createMockReqRes("GET")

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({
          users: mockUsers,
          pagination: {
            page: 1,
            limit: 10,
            total: mockUsers.length,
            totalPages: 1
          }
        })
      })

      it('should filter by role when provided', async () => {
        require("../../lib/prisma").user.findMany.mockResolvedValue([mockUsers[0]])
        require("../../lib/prisma").user.count.mockResolvedValue(1)

        const { req, res } = createMockReqRes("GET", null, { role: "STUDENT" })

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({
          users: [mockUsers[0]], // Only the student
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        })
      })

      it('should filter by search when provided', async () => {
        require("../../lib/prisma").user.findMany.mockResolvedValue([mockUsers[0]])
        require("../../lib/prisma").user.count.mockResolvedValue(1)

        const { req, res } = createMockReqRes("GET", null, { search: "John" })

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({
          users: [mockUsers[0]], // Only John Doe
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        })
      })
    })

    describe('School Admin Access', () => {
      beforeEach(() => {
        jest.clearAllMocks()
        require("next-auth").getServerSession.mockResolvedValue(mockSchoolAdminSession)

        // Mock prisma transaction
        jest.spyOn(require("../../lib/prisma"), "$transaction")
          .mockImplementation(async (callback) => {
            if (Array.isArray(callback)) return Promise.all(callback)
            const users = await callback(require("../../lib/prisma"))
            const count = await callback(require("../../lib/prisma"))
            return [users, count]
          })

        // Mock individual calls for the transaction
        require("../../lib/prisma").user.findMany.mockResolvedValue(mockUsers)
        require("../../lib/prisma").user.count.mockResolvedValue(mockUsers.length)
      })

      it('should return users in school for school admin', async () => {
        const { req, res } = createMockReqRes("GET")

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({
          users: mockUsers, // Both users are in school1
          pagination: {
            page: 1,
            limit: 10,
            total: mockUsers.length,
            totalPages: 1
          }
        })
      })
    })

    it('should return 403 for non-admin users', async () => {
      const mockSession = {
        user: {
          id: 'user1',
          role: 'STUDENT'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Admin access required" })
    })

    it('should return 403 for school admin without school association', async () => {
      const mockSession = {
        user: {
          id: 'teacher1',
          role: 'SCHOOL_ADMIN'
          // No schoolId - simulating the error condition
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: School admin not associated with a school" })
    })

    it('should handle internal server errors', async () => {
      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockPlatformAdminSession)
      require("../../lib/prisma").user.findMany.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('POST /api/admin/users', () => {
    const mockPlatformAdminSession = {
      user: {
        id: 'admin1',
        role: 'PLATFORM_ADMIN'
      }
    }

    const mockSchoolAdminSession = {
      user: {
        id: 'teacher1',
        role: 'SCHOOL_ADMIN',
        schoolId: 'school1'
      }
    }

    const mockUserData = {
      email: 'newuser@example.com',
      name: 'New User',
      password: 'password123',
      role: 'STUDENT'
    }

    const mockCreatedUser = {
      id: 'user-new',
      email: 'newuser@example.com',
      name: 'New User',
      role: 'STUDENT',
      emailVerified: new Date(),
      createdAt: new Date()
    }

    beforeEach(() => {
      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockPlatformAdminSession)
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockUserData
      })
      require("../../lib/prisma").user.findUnique.mockResolvedValue(null)
      const mockBcrypt = require('bcryptjs')
      mockBcrypt.hashSync = jest.fn().mockReturnValue('hashedpassword123')
      require("../../lib/prisma").user.create.mockResolvedValue(mockCreatedUser)
      require("../../lib/prisma").studentProfile.create.mockResolvedValue({
        id: 'profile-new',
        userId: 'user-new',
        schoolId: null
      })
    })

    describe('Platform Admin Access', () => {
      beforeEach(() => {
        jest.clearAllMocks()
        require("next-auth").getServerSession.mockResolvedValue(mockPlatformAdminSession)
        require("../../lib/validation").validateSchema.mockReturnValue({
          valid: true,
          data: mockUserData
        })

        // Mock user not existing
        require("../../lib/prisma").user.findUnique.mockResolvedValue(null)

        // Mock bcrypt hashSync
        const mockBcrypt = require('bcryptjs')
        mockBcrypt.hashSync = jest.fn().mockReturnValue('hashedpassword123')

        // Mock user creation
        require("../../lib/prisma").user.create.mockResolvedValue(mockCreatedUser)

        // Mock profile creation for student
        require("../../lib/prisma").studentProfile.create.mockResolvedValue({
          id: 'profile-new',
          userId: 'user-new',
          schoolId: null
        })
      })

      it('should create a user for platform admin', async () => {
        const { req, res } = createMockReqRes("POST", mockUserData)

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(mockCreatedUser)
      })
    })

    describe('School Admin Access', () => {
      beforeEach(() => {
        jest.clearAllMocks()
        require("next-auth").getServerSession.mockResolvedValue(mockSchoolAdminSession)
        require("../../lib/validation").validateSchema.mockReturnValue({
          valid: true,
          data: mockUserData
        })

        // Mock user not existing
        require("../../lib/prisma").user.findUnique.mockResolvedValue(null)

        // Mock bcrypt hashSync
        const mockBcrypt = require('bcryptjs')
        mockBcrypt.hashSync = jest.fn().mockReturnValue('hashedpassword123')

        // Mock user creation
        require("../../lib/prisma").user.create.mockResolvedValue({
          ...mockCreatedUser,
          schoolId: 'school1' // School admin creates user associated with their school
        })

        // Mock profile creation for student
        require("../../lib/prisma").studentProfile.create.mockResolvedValue({
          id: 'profile-new',
          userId: 'user-new',
          schoolId: 'school1' // Associated with school admin's school
        })
      })

      it('should create a user in their school for school admin', async () => {
        const { req, res } = createMockReqRes("POST", mockUserData)

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith({
          id: 'user-new',
          email: 'newuser@example.com',
          name: 'New User',
          role: 'STUDENT',
          emailVerified: expect.any(Date),
          createdAt: expect.any(Date),
          schoolId: 'school1'
        })
      })
    })

    it('should return 403 for non-admin users', async () => {
      const mockSession = {
        user: {
          id: 'user1',
          role: 'STUDENT'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      const { req, res } = createMockReqRes("POST", mockUserData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Admin access required" })
    })

    it('should return 403 for school admin trying to create platform admin', async () => {
      const mockSession = {
        user: {
          id: 'teacher1',
          role: 'SCHOOL_ADMIN',
          schoolId: 'school1'
        }
      }

      const mockPlatformAdminData = {
        ...mockUserData,
        role: 'PLATFORM_ADMIN'
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSchoolAdminSession)
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockPlatformAdminData
      })

      const { req, res } = createMockReqRes("POST", mockPlatformAdminData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: School admins cannot create platform admins" })
    })

    it('should return 400 for validation errors', async () => {
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          email: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })

      const { req, res } = createMockReqRes("POST", {
        email: '', // Invalid - empty
        name: 'New User',
        password: 'password123',
        role: 'STUDENT'
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
          email: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })
    })

    it('should return 400 if user already exists', async () => {
      // Mock user already existing
      require("../../lib/prisma").user.findUnique.mockResolvedValue({
        id: 'user-existing',
        email: 'newuser@example.com'
      })

      const { req, res } = createMockReqRes("POST", mockUserData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: "User with this email already exists" })
    })

    it('should return 400 if invalid role specified', async () => {
      const mockSession = {
        user: {
          id: 'admin1',
          role: 'PLATFORM_ADMIN'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: {
          ...mockUserData,
          role: 'INVALID_ROLE'
        }
      })

      const { req, res } = createMockReqRes("POST", {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
        role: 'INVALID_ROLE'
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid role specified" })
    })

    it('should handle internal server errors', async () => {
      require("../../lib/prisma").user.create.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("POST", mockUserData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('GET /api/admin/users?id=:id (specific user)', () => {
    const mockUser = {
      id: 'user1',
      email: 'student1@example.com',
      name: 'John Doe',
      role: 'STUDENT',
      emailVerized: new Date(),
      createdAt: new Date(),
      studentProfile: {
        id: 'student1',
        userId: 'user1',
        schoolId: 'school1'
      },
      teacherProfile: null
    }

    describe('Platform Admin Access', () => {
      const mockSession = {
        user: {
          id: 'admin1',
          role: 'PLATFORM_ADMIN'
        }
      }

      beforeEach(() => {
        jest.clearAllMocks()
        require("next-auth").getServerSession.mockResolvedValue(mockSession)
        require("../../lib/prisma").user.findUnique.mockResolvedValue(mockUser)
      })

      it('should return a specific user for platform admin', async () => {
        const { req, res } = createMockReqRes("GET", null, { id: "user1" })

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(mockUser)
      })
    })

    describe('School Admin Access', () => {
      const mockSession = {
        user: {
          id: 'teacher1',
          role: 'SCHOOL_ADMIN',
          schoolId: 'school1'
        }
      }

      beforeEach(() => {
        jest.clearAllMocks()
        require("next-auth").getServerSession.mockResolvedValue(mockSession)
        require("../../lib/prisma").user.findUnique.mockResolvedValue(mockUser)
      })

      it('should return a user in their school for school admin', async () => {
        const { req, res } = createMockReqRes("GET", null, { id: "user1" })

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(mockUser)
      })
    })

    it('should return 403 for non-admin users', async () => {
      const mockSession = {
        user: {
          id: 'user1',
          role: 'STUDENT'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      const { req, res } = createMockReqRes("GET", null, { id: "user1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Admin access required" })
    })

    it('should return 403 for school admin trying to access user not in their school', async () => {
      const mockSession = {
        user: {
          id: 'teacher1',
          role: 'SCHOOL_ADMIN',
          schoolId: 'school1'
        }
      }

      const mockUserInDifferentSchool = {
        ...mockUser,
        studentProfile: {
          ...mockUser.studentProfile,
          schoolId: 'school2' // Different school
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)
      require("../../lib/prisma").user.findUnique.mockResolvedValue(mockUserInDifferentSchool)

      const { req, res } = createMockReqRes("GET", null, { id: "user1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: User not in your school" })
    })

    it('should return 404 if user not found', async () => {
      const mockSession = {
        user: {
          id: 'admin1',
          role: 'PLATFORM_ADMIN'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)
      require("../../lib/prisma").user.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("GET", null, { id: "nonexistent" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" })
    })

    it('should handle internal server errors', async () => {
      const mockSession = {
        user: {
          id: 'admin1',
          role: 'PLATFORM_ADMIN'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)
      require("../../lib/prisma").user.findUnique.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("GET", null, { id: "user1" })

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