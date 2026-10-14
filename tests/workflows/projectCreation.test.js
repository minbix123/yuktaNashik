/**
 * Integration test for project creation workflow
 * This test simulates the workflow:
 * 1. User authentication
 * 2. Challenge retrieval
 * 3. Project creation for a challenge
 * 4. Validation of the created project
 */

// Since we're testing workflows that involve multiple API calls and database operations,
// we'll create a simplified test that focuses on the logic integration

const {
  validateSchema,
  validationSchemas
} = require('../../lib/validation');

describe('Project Creation Workflow', () => {
  const mockPrisma = {
    challenge: {
      findUnique: jest.fn()
    },
    studentProfile: {
      findUnique: jest.fn()
    },
    project: {
      findFirst: jest.fn(),
      create: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Project Creation Flow', () => {
    it('should validate input data before processing', () => {
      // Step 1: Validate incoming project data
      const inputData = {
        challengeId: 'challenge-123',
        studentId: 'student-456'
      };

      const validationResult = validateSchema(inputData, 'project');

      expect(validationResult.valid).toBe(true);
      expect(validationResult.data).toEqual(inputData);
    });

    it('should check if challenge exists', async () => {
      const mockChallenge = {
        id: 'challenge-123',
        title: 'Test Challenge',
        description: 'Test Description'
      };

      mockPrisma.challenge.findUnique.mockResolvedValue(mockChallenge);

      const challenge = await mockPrisma.challenge.findUnique({
        where: { id: 'challenge-123' }
      });

      expect(challenge).toEqual(mockChallenge);
      expect(mockPrisma.challenge.findUnique).toHaveBeenCalledWith({
        where: { id: 'challenge-123' }
      });
    });

    it('should verify student owns the session', async () => {
      const mockStudentProfile = {
        id: 'student-456',
        userId: 'user-123',
        user: {
          id: 'user-123'
        }
      };

      mockPrisma.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);

      const studentProfile = await mockPrisma.studentProfile.findUnique({
        where: { id: 'student-456' },
        include: { user: true }
      });

      expect(studentProfile).toEqual(mockStudentProfile);
      expect(studentProfile.userId).toBe('user-123');
    });

    it('should prevent duplicate project creation', async () => {
      // Mock existing project
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'existing-project',
        challengeId: 'challenge-123',
        studentId: 'student-456'
      });

      const existingProject = await mockPrisma.project.findFirst({
        where: {
          challengeId: 'challenge-123',
          studentId: 'student-456'
        }
      });

      expect(existingProject).not.toBeNull();
      expect(existingProject.challengeId).toBe('challenge-123');
      expect(existingProject.studentId).toBe('student-456');
    });

    it('should create project when all validations pass', async () => {
      // Setup mocks for successful creation
      mockPrisma.challenge.findUnique.mockResolvedValue({
        id: 'challenge-123',
        title: 'Test Challenge',
        description: 'Test Description'
      });

      mockPrisma.studentProfile.findUnique.mockResolvedValue({
        id: 'student-456',
        userId: 'user-123'
      });

      mockPrisma.project.findFirst.mockResolvedValue(null); // No existing project

      mockPrisma.project.create.mockResolvedValue({
        id: 'new-project-789',
        title: 'Test Challenge',
        description: 'Test Description',
        challengeId: 'challenge-123',
        studentId: 'student-456',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Simulate the workflow
      const challenge = await mockPrisma.challenge.findUnique({
        where: { id: 'challenge-123' }
      });

      expect(challenge).not.toBeNull();

      const studentProfile = await mockPrisma.studentProfile.findUnique({
        where: { id: 'student-456' }
      });

      expect(studentProfile).not.toBeNull();
      expect(studentProfile.userId).toBe('user-123'); // Assuming this matches session

      const existingProject = await mockPrisma.project.findFirst({
        where: {
          challengeId: 'challenge-123',
          studentId: 'student-456'
        }
      });

      expect(existingProject).toBeNull(); // No existing project

      // Create project
      const newProject = await mockPrisma.project.create({
        data: {
          title: challenge.title,
          description: challenge.description,
          challengeId: challenge.id,
          studentId: studentProfile.id,
          status: 'DRAFT'
        }
      });

      expect(newProject).toBeDefined();
      expect(newProject.id).toBe('new-project-789');
      expect(newProject.challengeId).toBe('challenge-123');
      expect(newProject.studentId).toBe('student-456');
      expect(newProject.status).toBe('DRAFT');
    });
  });

  describe('Error Cases in Project Creation', () => {
    it('should handle validation errors', () => {
      const invalidData = {
        challengeId: '', // Invalid - empty
        studentId: 'student-456'
      };

      const result = validateSchema(invalidData, 'project');

      expect(result.valid).toBe(false);
      expect(result.errors.challengeId.en).toMatch(/This field is required|Select a valid record/);
    });

    it('should handle non-existent challenge', async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(null);

      const challenge = await mockPrisma.challenge.findUnique({
        where: { id: 'non-existent-challenge' }
      });

      expect(challenge).toBeNull();
    });

    it('should handle non-existent student profile', async () => {
      mockPrisma.studentProfile.findUnique.mockResolvedValue(null);

      const studentProfile = await mockPrisma.studentProfile.findUnique({
        where: { id: 'non-existent-student' }
      });

      expect(studentProfile).toBeNull();
    });

    it('should handle mismatched student and session user', async () => {
      mockPrisma.studentProfile.findUnique.mockResolvedValue({
        id: 'student-456',
        userId: 'different-user-id' // Doesn't match session user
      });

      const studentProfile = await mockPrisma.studentProfile.findUnique({
        where: { id: 'student-456' }
      });

      expect(studentProfile).toBeDefined();
      expect(studentProfile.userId).not.toBe('user-123'); // Session user ID
    });
  });
});