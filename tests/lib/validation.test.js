const {
  validateSchema,
  validationSchemas,
  validationMessages,
  sendValidationError
} = require('../../lib/validation');

describe('Validation Library', () => {
  describe('User Validation Schema', () => {
    it('validates a correct user object', () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'STUDENT',
        password: 'password123'
      };

      const result = validateSchema(userData, 'user');

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'STUDENT',
        password: 'password123'
      });
    });

    it('invalidates missing required fields', () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
        // missing role and password
      };

      const result = validateSchema(userData, 'userCreate');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('role');
      expect(result.errors).toHaveProperty('password');
    });

    it('invalidates invalid email format', () => {
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        role: 'STUDENT',
        password: 'password123'
      };

      const result = validateSchema(userData, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.email.en).toContain('Enter a valid email address');
    });

    it('invalidates weak password', () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'STUDENT',
        password: '123' // too short, no letter
      };

      const result = validateSchema(userData, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.password.en).toContain('Password must be 8–128 characters');
    });

    it('invalidates invalid role', () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'INVALID_ROLE',
        password: 'password123'
      };

      const result = validateSchema(userData, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.role.en).toContain('Select a valid option');
    });
  });

  describe('Project Validation Schema', () => {
    it('validates correct project data', () => {
      const projectData = {
        challengeId: 'challenge-123',
        studentId: 'student-456'
      };

      const result = validateSchema(projectData, 'project');

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({
        challengeId: 'challenge-123',
        studentId: 'student-456'
      });
    });

    it('invalidates missing challengeId', () => {
      const projectData = {
        studentId: 'student-456'
      };

      const result = validateSchema(projectData, 'project');

      expect(result.valid).toBe(false);
      expect(result.errors.challengeId.en).toContain('This field is required');
    });

    it('invalidates missing studentId', () => {
      const projectData = {
        challengeId: 'challenge-123'
      };

      const result = validateSchema(projectData, 'project');

      expect(result.valid).toBe(false);
      expect(result.errors.studentId.en).toContain('This field is required');
    });
  });

  describe('Validation Error Formatting', () => {
    it('formats validation errors correctly', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const errors = {
        name: { en: 'Name is required', mr: 'नाव आवश्यक आहे' },
        email: { en: 'Invalid email', mr: 'अवैध ईमेल' }
      };

      sendValidationError(mockRes, errors);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        message: {
          en: 'Please correct the highlighted fields and try again.',
          mr: 'कृपया दाखवलेली क्षेत्रे दुरुस्त करून पुन्हा प्रयत्न करा.'
        },
        errors
      });
    });
  });

  describe('Validation Messages', () => {
    it('contains bilingual validation messages', () => {
      expect(validationMessages.required.en).toBe('This field is required.');
      expect(validationMessages.required.mr).toBe('हे क्षेत्र आवश्यक आहे.');

      expect(validationMessages.invalidEmail.en).toBe('Enter a valid email address.');
      expect(validationMessages.invalidEmail.mr).toBe('कृपया वैध ईमेल पत्ता प्रविष्ट करा.');
    });
  });
});