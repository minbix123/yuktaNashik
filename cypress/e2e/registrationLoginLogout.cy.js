/// <reference types="cypress" />

describe('User Registration, Login, and Logout E2E Tests', () => {
  const testUser = {
    email: `testuser_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    fullName: 'Test User'
  };

  beforeEach(() => {
    // Visit home page before each test
    cy.visit('/');
  });

  describe('User Registration', () => {
    it('should be able to navigate to registration page', () => {
      // Assuming there's a sign up link on the home page or login page
      cy.contains('Sign In').click();
      // On the login page, look for a sign up link
      cy.contains('Sign Up').click();
      // Verify we are on the registration page
      cy.url().should('include', '/signup');
      // Check for registration form elements
      cy.get('input[name="fullName"]').should('exist');
      cy.get('input[name="email"]').should('exist');
      cy.get('input[name="password"]').should('exist');
      cy.contains('Sign Up').should('exist');
    });

    it('should display validation errors for invalid registration', () => {
      cy.contains('Sign In').click();
      cy.contains('Sign Up').click();

      // Submit empty form
      cy.contains('Sign Up').click();

      // Check for validation errors
      cy.contains(/full name.*required/i).should('exist');
      cy.contains(/email.*required/i).should('exist');
      cy.contains(/password.*required/i).should('exist');
    });

    it('should successfully register a new user', () => {
      // Navigate to registration page
      cy.contains('Sign In').click();
      cy.contains('Sign Up').click();

      // Fill in registration form
      cy.get('input[name="fullName"]').type(testUser.fullName);
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type(testUser.password);

      // Submit form
      cy.contains('Sign Up').click();

      // Verify successful registration (could be redirect to home or a welcome message)
      // Adjust based on actual app behavior
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      cy.contains('Welcome').should('exist');
      // Or check for user profile element
      cy.contains(testUser.fullName).should('exist');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Register a user before login tests
      cy.registerUser(testUser.email, testUser.password, testUser.fullName);
    });

    it('should be able to navigate to login page', () => {
      cy.contains('Sign In').click();
      cy.url().should('include', '/signin');
      cy.get('input[type="email"]').should('exist');
      cy.get('input[type="password"]').should('exist');
      cy.contains('Sign In').should('exist');
    });

    it('should show error message for invalid credentials', () => {
      cy.contains('Sign In').click();

      // Fill in invalid credentials
      cy.get('input[type="email"]').type('invalid@example.com');
      cy.get('input[type="password"]').type('wrongpassword');

      // Submit form
      cy.contains('Sign In').click();

      // Check for error message
      cy.contains(/invalid/i).should('exist');
    });

    it('should handle empty form submission', () => {
      cy.contains('Sign In').click();

      // Submit empty form
      cy.contains('Sign In').click();

      // Check for validation errors
      cy.contains(/email.*required/i).should('exist');
      cy.contains(/password.*required/i).should('exist');
    });

    it('should successfully log in with valid credentials', () => {
      cy.contains('Sign In').click();

      // Fill in valid credentials
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[type="password"]').type(testUser.password);

      // Submit form
      cy.contains('Sign In').click();

      // Verify successful login
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      cy.contains(testUser.fullName).should('be.visible');
      // Check that sign in button is replaced by user menu or logout
      cy.contains('Sign In').should('not.be.visible');
      cy.contains('Logout').should('exist');
    });
  });

  describe('User Logout', () => {
    beforeEach(() => {
      // Log in before logout tests
      cy.login(testUser.email, testUser.password);
    });

    it('should be able to log out', () => {
      // Assuming there's a user menu or dropdown
      cy.contains(testUser.fullName).click(); // Click on user name to open menu
      cy.contains('Logout').click();

      // Verify logout successful
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      cy.contains('Sign In').should('be.visible');
      cy.contains(testUser.fullName).should('not.exist');
    });
  });
});

// Custom commands for registration and login (if not already implemented)
// We'll add them here for convenience, but note that they should ideally be in support/e2e.js
Cypress.Commands.add('registerUser', (email, password, fullName) => {
  cy.visit('/');
  cy.contains('Sign In').click();
  cy.contains('Sign Up').click();
  cy.get('input[name="fullName"]').type(fullName);
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('input[name="confirmPassword"]').type(password);
  cy.contains('Sign Up').click();
  // Assuming successful registration redirects to home
  cy.url().should('eq', Cypress.config().baseUrl + '/');
});

Cypress.Commands.add('login', (email, password) => {
  cy.visit('/');
  cy.contains('Sign In').click();
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('Sign In').click();
  cy.url().should('eq', Cypress.config().baseUrl + '/');
});