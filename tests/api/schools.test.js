import { getServerSession } from "next-auth"
import { authOptions } from "../../pages/api/auth/[...nextauth]"
import prisma from "../../lib/prisma"
import { validateSchema, sendValidationError } from "../../lib/validation"

// Mock the dependencies
jest.mock("../../lib/prisma", () => ({
  school: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  teacherProfile: {
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

describe('Schools API Route', () => {
  // We'll test the actual handler function by importing it after mocking dependencies
  let handler

  beforeAll(() => {
    // Reset all mocks before tests
    jest.clearAllMocks()

    // Import the handler after mocking
    handler = require("../../pages/api/schools").default
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

  describe('GET /api/schools', () => {
    const mockSchools = [
      {
        id: 'school1',
        name: 'Test School',
        address: '123 Test Street',
        contactEmail: 'contact@testschool.com',
        contactPhone: '123-456-7890',
        students: [{ id: 'student1' }, { id: 'student2' }],
        teachers: [{ id: 'teacher1' }, { id: 'teacher2' }]
      }
    ]

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
        require("../../lib/prisma").school.findMany.mockResolvedValue(mockSchools)
      })

      it('should return all schools for platform admin', async () => {
        const { req, res } = createMockReqRes("GET")

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(mockSchools)
      })
    })

    describe('School Admin Access', () => {
      const mockSession = {
        user: {
          id: 'teacher1',
          role: 'SCHOOL_ADMIN'
        }
      }

      const mockSchool = [{
        id: 'school1',
        name: 'Test School',
        address: '123 Test Street',
        contactEmail: 'contact@testschool.com',
        contactPhone: '123-456-7890',
        students: [{ id: 'student1' }, { id: 'student2' }],
        teachers: [{ id: 'teacher1' }, { id: 'teacher2' }]
      }]

      beforeEach(() => {
        jest.clearAllMocks()
        require("next-auth").getServerSession.mockResolvedValue(mockSession)

        // Mock teacher profile for school admin
        require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
          schoolId: 'school1'
        })

        require("../../lib/prisma").school.findMany.mockResolvedValue(mockSchool)
      })

      it('should return only their school for school admin', async () => {
        const { req, res } = createMockReqRes("GET")

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(mockSchool)
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

    it('should handle internal server errors', async () => {
      const mockSession = {
        user: {
          id: 'admin1',
          role: 'PLATFORM_ADMIN'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)
      require("../../lib/prisma").school.findMany.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("GET")

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('POST /api/schools', () => {
    const mockSession = {
      user: {
        id: 'admin1',
        role: 'PLATFORM_ADMIN'
      }
    }

    const mockSchoolData = {
      name: 'New Test School',
      address: '456 New Street',
      contactEmail: 'contact@newschool.com',
      contactPhone: '098-765-4321'
    }

    const mockCreatedSchool = {
      id: 'school-new',
      name: 'New Test School',
      address: '456 New Street',
      contactEmail: 'contact@newschool.com',
      contactPhone: '098-765-4321'
    }

    beforeEach(() => {
      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockSchoolData
      })
      require("../../lib/prisma").school.create.mockResolvedValue(mockCreatedSchool)
    })

    it('should create a school for platform admin', async () => {
      const { req, res } = createMockReqRes("POST", mockSchoolData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(mockCreatedSchool)
    })

    it('should return 403 for non-platform-admin users', async () => {
      const mockSession = {
        user: {
          id: 'user1',
          role: 'TEACHER'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      const { req, res } = createMockReqRes("POST", mockSchoolData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Platform admin access required" })
    })

    it('should return 400 for validation errors', async () => {
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          name: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })

      const { req, res } = createMockReqRes("POST", {
        name: '', // Invalid - empty
        address: '456 New Street',
        contactEmail: 'contact@newschool.com',
        contactPhone: '098-765-4321'
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
          name: { en: "This field is required.", mr: "हे क्षेत्र आवश्यक आहे." }
        }
      })
    })

    it('should handle internal server errors', async () => {
      require("../../lib/prisma").school.create.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("POST", mockSchoolData)

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('GET /api/schools?id=:id (specific school)', () => {
    const mockSchool = {
      id: 'school1',
      name: 'Test School',
      address: '123 Test Street',
      contactEmail: 'contact@testschool.com',
      contactPhone: '123-456-7890',
      students: [{ id: 'student1' }, { id: 'student2' }],
      teachers: [{ id: 'teacher1' }, { id: 'teacher2' }],
      classes: [{ id: 'class1' }, { id: 'class2' }]
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
        require("../../lib/prisma").school.findUnique.mockResolvedValue(mockSchool)
      })

      it('should return a specific school for platform admin', async () => {
        const { req, res } = createMockReqRes("GET", null, { id: "school1" })

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(mockSchool)
      })
    })

    describe('School Admin Access', () => {
      const mockSession = {
        user: {
          id: 'teacher1',
          role: 'SCHOOL_ADMIN'
        }
      }

      beforeEach(() => {
        jest.clearAllMocks()
        require("next-auth").getServerSession.mockResolvedValue(mockSession)

        // Mock teacher profile for school admin
        require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
          schoolId: 'school1'
        })

        require("../../lib/prisma").school.findUnique.mockResolvedValue(mockSchool)
      })

      it('should return their school for school admin', async () => {
        const { req, res } = createMockReqRes("GET", null, { id: "school1" })

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(mockSchool)
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

      const { req, res } = createMockReqRes("GET", null, { id: "school1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Admin access required" })
    })

    it('should return 403 for school admin trying to access different school', async () => {
      const mockSession = {
        user: {
          id: 'teacher1',
          role: 'SCHOOL_ADMIN'
        }
      }

      const differentSchool = {
        id: 'school2',
        name: 'Different School',
        address: '789 Different Ave',
        contactEmail: 'contact@different.com',
        contactPhone: '555-555-5555'
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock teacher profile for school admin (different school)
      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
        schoolId: 'school2' // Different school
      })

      require("../../lib/prisma").school.findUnique.mockResolvedValue(differentSchool)

      const { req, res } = createMockReqRes("GET", null, { id: "school1" }) // Trying to access school1

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Access denied to this school" })
    })

    it('should return 404 if school not found', async () => {
      const mockSession = {
        user: {
          id: 'admin1',
          role: 'PLATFORM_ADMIN'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)
      require("../../lib/prisma").school.findUnique.mockResolvedValue(null)

      const { req, res } = createMockReqRes("GET", null, { id: "nonexistent" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "School not found" })
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
      require("../../lib/prisma").school.findUnique.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("GET", null, { id: "school1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('PUT /api/schools?id=:id (update school)', () => {
    const mockSchool = {
      id: 'school1',
      name: 'Test School',
      address: '123 Test Street',
      contactEmail: 'contact@testschool.com',
      contactPhone: '123-456-7890'
    }

    const mockUpdateData = {
      name: 'Updated Test School',
      address: '456 Updated Street'
    }

    const mockUpdatedSchool = {
      id: 'school1',
      name: 'Updated Test School',
      address: '456 Updated Street',
      contactEmail: 'contact@testschool.com',
      contactPhone: '123-456-7890'
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
        require("../../lib/validation").validateSchema.mockReturnValue({
          valid: true,
          data: mockUpdateData
        })
        require("../../lib/prisma").school.update.mockResolvedValue(mockUpdatedSchool)
      })

      it('should update a school for platform admin', async () => {
        const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "school1" })

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(mockUpdatedSchool)
      })
    })

    describe('School Admin Access', () => {
      const mockSession = {
        user: {
          id: 'teacher1',
          role: 'SCHOOL_ADMIN'
        }
      }

      beforeEach(() => {
        jest.clearAllMocks()
        require("next-auth").getServerSession.mockResolvedValue(mockSession)

        // Mock teacher profile for school admin (same school)
        require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
          schoolId: 'school1'
        })

        require("../../lib/validation").validateSchema.mockReturnValue({
          valid: true,
          data: mockUpdateData
        })
        require("../../lib/prisma").school.update.mockResolvedValue(mockUpdatedSchool)
      })

      it('should update their school for school admin', async () => {
        const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "school1" })

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(mockUpdatedSchool)
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

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "school1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Insufficient permissions" })
    })

    it('should return 403 for school admin trying to update different school', async () => {
      const mockSession = {
        user: {
          id: 'teacher1',
          role: 'SCHOOL_ADMIN'
        }
      }

      const differentSchoolId = 'school2'

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      // Mock teacher profile for school admin (different school)
      require("../../lib/prisma").teacherProfile.findUnique.mockResolvedValue({
        schoolId: 'school1' // Admin belongs to school1, trying to update school2
      })

      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockUpdateData
      })

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: differentSchoolId })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Insufficient permissions" })
    })

    it('should return 400 for validation errors (no fields to update)', async () => {
      const mockSession = {
        user: {
          id: 'admin1',
          role: 'PLATFORM_ADMIN'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: false,
        errors: {
          form: {
            en: "Provide at least one field to update.",
            mr: "अपडेट करण्यासाठी किमान एक क्षेत्र द्या."
          }
        }
      })

      const { req, res } = createMockReqRes("PUT", {}, { id: "school1" }) // Empty body

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

    it('should return 404 if school not found', async () => {
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
        data: mockUpdateData
      })
      require("../../lib/prisma").school.update.mockResolvedValue(null)

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "nonexistent" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "School not found" })
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
      require("../../lib/validation").validateSchema.mockReturnValue({
        valid: true,
        data: mockUpdateData
      })
      require("../../lib/prisma").school.update.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("PUT", mockUpdateData, { id: "school1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
    })
  })

  describe('DELETE /api/schools?id=:id (delete school)', () => {
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
        require("../../lib/prisma").school.delete.mockResolvedValue({ id: 'school1' })
      })

      it('should delete a school for platform admin', async () => {
        const { req, res } = createMockReqRes("DELETE", null, { id: "school1" })

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ message: "School deleted successfully" })
      })
    })

    it('should return 403 for non-platform-admin users', async () => {
      const mockSession = {
        user: {
          id: 'user1',
          role: 'SCHOOL_ADMIN'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)

      const { req, res } = createMockReqRes("DELETE", null, { id: "school1" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Platform admin access required" })
    })

    it('should return 404 if school not found', async () => {
      const mockSession = {
        user: {
          id: 'admin1',
          role: 'PLATFORM_ADMIN'
        }
      }

      jest.clearAllMocks()
      require("next-auth").getServerSession.mockResolvedValue(mockSession)
      require("../../lib/prisma").school.delete.mockResolvedValue(null)

      const { req, res } = createMockReqRes("DELETE", null, { id: "nonexistent" })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "School not found" })
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
      require("../../lib/prisma").school.delete.mockRejectedValue(new Error("Database error"))

      const { req, res } = createMockReqRes("DELETE", null, { id: "school1" })

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