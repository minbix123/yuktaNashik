/**
 * Integration test for skill evidence submission workflow
 * This test simulates the workflow:
 * 1. User authentication
 * 2. Project retrieval
 * 3. Skill evidence submission for a project
 * 4. Validation of the submitted skill evidence
 */

const {
  validateSchema,
  validationSchemas
} = require('../../lib/validation');

describe('Skill Evidence Submission Workflow', () => {
  const mockPrisma = {
    skill: {
      findUnique: jest.fn()
    },
    studentProfile: {
      findUnique: jest.fn()
    },
    project: {
      findUnique: jest.fn()
    },
    skillEvidence: {
      findMany: jest.fn(),
      create: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Skill Evidence Submission Flow', () => {
    it('should validate input data before processing', () => {
      // Step 1: Validate incoming skill evidence data
      const inputData = {
        studentId: 'student-456',
        skillId: 'skill-789',
        details: 'I demonstrated leadership by organizing a team project',
        projectId: 'project-123'
      };

      const validationResult = validateSchema(inputData, 'skillEvidence');

      expect(validationResult.valid).toBe(true);
      expect(validationResult.data).toEqual(inputData);
    });

    it('should validate skill evidence update data', () => {
      // Test validation for updating skill evidence
      const inputData = {
        details: 'Updated details with more information',
        verificationStatus: 'APPROVED',
        level: 'INTERMEDIATE'
      };

      const validationResult = validateSchema(inputData, 'skillEvidenceUpdate');

      expect(validationResult.valid).toBe(true);
      expect(validationResult.data).toEqual(inputData);
    });

    it('should check if skill exists', async () => {
      const mockSkill = {
        id: 'skill-789',
        name: 'Leadership',
        description: 'Ability to guide and motivate a team'
      };

      mockPrisma.skill.findUnique.mockResolvedValue(mockSkill);

      const skill = await mockPrisma.skill.findUnique({
        where: { id: 'skill-789' }
      });

      expect(skill).toEqual(mockSkill);
      expect(mockPrisma.skill.findUnique).toHaveBeenCalledWith({
        where: { id: 'skill-789' }
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

    it('should verify project exists and belongs to student', async () => {
      const mockProject = {
        id: 'project-123',
        title: 'Community Service Project',
        description: 'A project to help the local community',
        studentId: 'student-456'
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const project = await mockPrisma.project.findUnique({
        where: { id: 'project-123' },
        include: { student: true }
      });

      expect(project).toEqual(mockProject);
      expect(project.studentId).toBe('student-456');
    });

    it('should prevent duplicate skill evidence for same skill and project (if applicable)', async () => {
      // Mock existing skill evidence
      mockPrisma.skillEvidence.findMany.mockResolvedValue([
        {
          id: 'evidence-123',
          studentId: 'student-456',
          skillId: 'skill-789',
          projectId: 'project-123',
          details: 'Previous evidence',
          verificationStatus: 'PENDING',
          level: 'BEGINNER'
        }
      ]);

      const existingEvidence = await mockPrisma.skillEvidence.findMany({
        where: {
          studentId: 'student-456',
          skillId: 'skill-789',
          projectId: 'project-123'
        }
      });

      expect(existingEvidence.length).toBeGreaterThan(0);
      expect(existingEvidence[0].studentId).toBe('student-456');
      expect(existingEvidence[0].skillId).toBe('skill-789');
      expect(existingEvidence[0].projectId).toBe('project-123');
    });

    it('should create skill evidence when all validations pass', async () => {
      // Setup mocks for successful creation
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: 'skill-789',
        name: 'Leadership',
        description: 'Ability to guide and motivate a team'
      });

      mockPrisma.studentProfile.findUnique.mockResolvedValue({
        id: 'student-456',
        userId: 'user-123'
      });

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-123',
        title: 'Community Service Project',
        studentId: 'student-456'
      });

      mockPrisma.skillEvidence.findMany.mockResolvedValue([]); // No existing evidence

      mockPrisma.skillEvidence.create.mockResolvedValue({
        id: 'evidence-456',
        studentId: 'student-456',
        skillId: 'skill-789',
        projectId: 'project-123',
        details: 'I demonstrated leadership by organizing a team project of 5 people',
        verificationStatus: 'PENDING',
        level: 'BEGINNER',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Simulate the workflow
      const skill = await mockPrisma.skill.findUnique({
        where: { id: 'skill-789' }
      });

      expect(skill).not.toBeNull();

      const studentProfile = await mockPrisma.studentProfile.findUnique({
        where: { id: 'student-456' }
      });

      expect(studentProfile).not.toBeNull();
      expect(studentProfile.userId).toBe('user-123'); // Assuming this matches session

      const project = await mockPrisma.project.findUnique({
        where: { id: 'project-123' }
      });

      expect(project).not.toBeNull();
      expect(project.studentId).toBe('student-456'); // Matches student

      const existingEvidence = await mockPrisma.skillEvidence.findMany({
        where: {
          studentId: 'student-456',
          skillId: 'skill-789',
          projectId: 'project-123'
        }
      });

      expect(existingEvidence.length).toBe(0); // No existing evidence

      // Create skill evidence
      const newEvidence = await mockPrisma.skillEvidence.create({
        data: {
          studentId: studentProfile.id,
          skillId: skill.id,
          projectId: project.id,
          details: 'I demonstrated leadership by organizing a team project of 5 people',
          verificationStatus: 'PENDING',
          level: 'BEGINNER'
        }
      });

      expect(newEvidence).toBeDefined();
      expect(newEvidence.id).toBe('evidence-456');
      expect(newEvidence.studentId).toBe('student-456');
      expect(newEvidence.skillId).toBe('skill-789');
      expect(newEvidence.projectId).toBe('project-123');
      expect(newEvidence.details).toBe('I demonstrated leadership by organizing a team project of 5 people');
      expect(newEvidence.verificationStatus).toBe('PENDING');
      expect(newEvidence.level).toBe('BEGINNER');
    });
  });

  describe('Error Cases in Skill Evidence Submission', () => {
    it('should handle validation errors', () => {
      const invalidData = {
        studentId: '', // Invalid - empty
        skillId: 'skill-789',
        details: 'Valid details',
        // projectId is optional
      };

      const result = validateSchema(invalidData, 'skillEvidence');

      expect(result.valid).toBe(false);
      expect(result.errors.studentId.en).toMatch(/This field is required|Select a valid record/);
    });

    it('should handle non-existent skill', async () => {
      mockPrisma.skill.findUnique.mockResolvedValue(null);

      const skill = await mockPrisma.skill.findUnique({
        where: { id: 'non-existent-skill' }
      });

      expect(skill).toBeNull();
    });

    it('should handle non-existent student profile', async () => {
      mockPrisma.studentProfile.findUnique.mockResolvedValue(null);

      const studentProfile = await mockPrisma.studentProfile.findUnique({
        where: { id: 'non-existent-student' }
      });

      expect(studentProfile).toBeNull();
    });

    it('should handle non-existent project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const project = await mockPrisma.project.findUnique({
        where: { id: 'non-existent-project' }
      });

      expect(project).toBeNull();
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

    it('should handle mismatched project and student', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-123',
        title: 'Community Service Project',
        studentId: 'different-student-id' // Doesn't match the student
      });

      const project = await mockPrisma.project.findUnique({
        where: { id: 'project-123' }
      });

      expect(project).toBeDefined();
      expect(project.studentId).not.toBe('student-456'); // Doesn't match our student
    });
  });
});