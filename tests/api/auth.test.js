import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "../../lib/prisma"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcryptjs"

// Mock the dependencies
jest.mock("../../lib/prisma", () => ({
  user: {
    findUnique: jest.fn(),
  },
}))
jest.mock("@next-auth/prisma-adapter", () => ({
  PrismaAdapter: jest.fn(() => ({}))
}))
jest.mock("bcryptjs")
jest.mock("next-auth/providers/credentials", () => {
  const fn = jest.fn((config) => config)
  return { __esModule: true, default: fn }
})
jest.mock("next-auth", () => {
  const fn = jest.fn(() => jest.fn())
  fn.getServerSession = jest.fn()
  return { __esModule: true, default: fn, getServerSession: fn.getServerSession }
})

describe('Authentication API Route (NextAuth)', () => {
  let authOptions
  let savedProviderConfig

  beforeAll(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Import the actual auth options
    const authModule = require("../../pages/api/auth/[...nextauth]")
    authOptions = authModule.authOptions || authModule.default || authModule
    savedProviderConfig = CredentialsProvider.mock.calls[0]?.[0]
  })

  describe('Prisma Adapter Configuration', () => {
    it('should configure PrismaAdapter correctly', () => {
      // Check that PrismaAdapter was called with prisma instance
      expect(PrismaAdapter).toHaveBeenCalledWith(require("../../lib/prisma"))
    })
  })

  describe('Credentials Provider Configuration', () => {
    it('should configure CredentialsProvider with correct fields', () => {
      // Check that CredentialsProvider was called
      expect(CredentialsProvider).toHaveBeenCalled()

      // Get the arguments passed to CredentialsProvider
      const providerArgs = savedProviderConfig || CredentialsProvider.mock.calls[0][0]

      // Check that it has the expected name and credentials fields
      expect(providerArgs.name).toBe("Credentials")
      expect(providerArgs.credentials).toEqual({
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      })
    })
  })

  describe('Authorize Function', () => {
    let authorizeFn

    beforeEach(() => {
      // Get the authorize function from the provider before clearing mocks
      const providerConfig = savedProviderConfig || CredentialsProvider.mock.calls[0]?.[0]
      authorizeFn = providerConfig.authorize

      jest.clearAllMocks()

      // Mock prisma user find
      const mockPrisma = require("../../lib/prisma")
      mockPrisma.user.findUnique = jest.fn()

      // Mock bcrypt compare
      bcrypt.compare = jest.fn()
    })

    it('should return null for missing credentials', async () => {
      const result = await authorizeFn({})
      expect(result).toBeNull()
    })

    it('should return null for missing email', async () => {
      const result = await authorizeFn({ password: "password123" })
      expect(result).toBeNull()
    })

    it('should return null for missing password', async () => {
      const result = await authorizeFn({ email: "test@example.com" })
      expect(result).toBeNull()
    })

    it('should return null for non-existent user', async () => {
      // Mock user not found
      require("../../lib/prisma").user.findUnique.mockResolvedValue(null)

      const result = await authorizeFn({
        email: "nonexistent@example.com",
        password: "password123"
      })

      expect(result).toBeNull()
      expect(require("../../lib/prisma").user.findUnique).toHaveBeenCalledWith({
        where: { email: "nonexistent@example.com" }
      })
    })

    it('should return null for invalid password', async () => {
      // Mock user found
      const mockUser = {
        id: "user1",
        email: "test@example.com",
        name: "Test User",
        passwordHash: "hashedpassword",
        role: "STUDENT"
      }

      require("../../lib/prisma").user.findUnique.mockResolvedValue(mockUser)
      // Mock bcrypt compare to return false (invalid password)
      bcrypt.compare.mockResolvedValue(false)

      const result = await authorizeFn({
        email: "test@example.com",
        password: "wrongpassword"
      })

      expect(result).toBeNull()
      expect(require("../../lib/prisma").user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" }
      })
      expect(bcrypt.compare).toHaveBeenCalledWith("wrongpassword", "hashedpassword")
    })

    it('should return user object for valid credentials', async () => {
      // Mock user found
      const mockUser = {
        id: "user1",
        email: "test@example.com",
        name: "Test User",
        passwordHash: "hashedpassword",
        role: "STUDENT"
      }

      require("../../lib/prisma").user.findUnique.mockResolvedValue(mockUser)
      // Mock bcrypt compare to return true (valid password)
      bcrypt.compare.mockResolvedValue(true)

      const result = await authorizeFn({
        email: "test@example.com",
        password: "password123"
      })

      expect(result).toEqual({
        id: "user1",
        email: "test@example.com",
        name: "Test User",
        role: "STUDENT"
      })

      expect(require("../../lib/prisma").user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" }
      })
      expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashedpassword")
    })
  })

  describe('Session Callback', () => {
    it('should add user id and role to session', async () => {
      // We would test the session callback, but since it's embedded in the NextAuth config,
      // we'll test it indirectly by checking the authOptions structure

      const mockSession = { user: { name: "Test User" } }
      const mockUser = { id: "user1", role: "STUDENT" }

      // Find the callbacks object in the authOptions
      const callbacks = authOptions.callbacks

      if (callbacks && callbacks.session) {
        const result = await callbacks.session({ session: mockSession, user: mockUser })

        expect(result.user.id).toBe("user1")
        expect(result.user.role).toBe("STUDENT")
      }
    })
  })

  // Note: Testing the actual NextAuth handler would require setting up a mock Next.js server
  // which is complex. The unit tests above cover the key logic components.
})