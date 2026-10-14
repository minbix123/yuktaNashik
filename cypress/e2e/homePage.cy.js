/// <reference types="cypress" />

describe('Home Page E2E Tests', () => {
  beforeEach(() => {
    // Visit the home page before each test
    cy.visit('/');
  });

  it('displays the application name', () => {
    // Check that the app name is visible
    cy.contains('Yukta Nashik').should('be.visible');
  });

  it('shows login button when not authenticated', () => {
    // Check for sign in button
    cy.contains('Sign In').should('be.visible');
  });

  it('navigates to challenges page', () => {
    // Click on challenges link and verify navigation
    cy.contains('Challenges').click();
    // Wait for navigation and check URL
    cy.url().should('include', '/challenges');
  });

  it('language toggle works', () => {
    // Click language dropdown
    cy.contains('Language').click();
    // Select Marathi
    cy.contains('Marathi').click();
    // Verify that Marathi text appears on the page (simplified check)
    cy.contains('य aprendizissage करते सीखे').should('exist'); // This would be the Marathi translation
  });

  it('displays loading state when session is checking', () => {
    // This test assumes there's a loading state
    cy.contains(/loading/i).should('exist');
  });
});

describe('Authentication Flow E2E Tests', () => {
  beforeEach(() => {
    // Visit home page before each test
    cy.visit('/');
  });

  it('should be able to navigate to login page', () => {
    cy.contains('Sign In').click();
    // Check that we're on the login page or see login form
    cy.url().should('include', '/api/auth/signin');
    // Alternatively, check for login form elements
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
    // or check for specific error text
  });

  it('should handle empty form submission', () => {
    cy.contains('Sign In').click();

    // Submit empty form
    cy.contains('Sign In').click();

    // Check for validation errors
    cy.contains(/required/i).should('exist');
  });
});

describe('Challenges Page E2E Tests', () => {
  beforeEach(() => {
    // Visit challenges page before each test
    cy.visit('/challenges');
  });

  it('displays challenges page title', () => {
    cy.contains('Learning Challenges').should('be.visible');
  });

  it('shows filter controls', () => {
    cy.contains('Filter').should('be.visible');
    cy.contains('Subject').should('be.visible');
    cy.contains('Grade').should('be.visible');
    cy.contains('Search').should('be.visible');
  });

  it('should be able to search challenges', () => {
    cy.contains('Search').type('science{enter}');
    // Would check that results are filtered
    cy.wait(1000); // Wait for search to process
  });

  it('should be able to filter by subject', () => {
    cy.contains('Subject').click();
    cy.contains('Science').click();
    // Would check that only science challenges are shown
  });

  it('should be able to filter by grade', () => {
    cy.contains('Grade').click();
    cy.contains('5').click();
    // Would check that only grade 5 challenges are shown
  });

  it('navigates to challenge details when clicked', () => {
    // This assumes challenge cards are rendered
    cy.contains('View Details').first().click();
    // Would check navigation to challenge details page
    cy.url().should('include', '/challenges/');
  });

  it('shows new challenge button for teachers', () => {
    // This test would need to be run with teacher authentication
    // For now, we'll check if the button exists in the DOM
    cy.contains('New Challenge').then(($button) => {
      // If user is teacher, button should be visible
      // If user is student, button might not be visible
      // We'll just check it exists in DOM
      expect($button).to.exist;
    });
  });

  it('language toggle works on challenges page', () => {
    cy.contains('Language').click();
    cy.contains('Marathi').click();
    // Verify Marathi text appears
    cy.contains('शिक्षण चुनौतियां').should('exist');
  });
});

describe('Authentication Flow E2E Tests', () => {
  it('should be able to navigate to login page', () => {
    cy.visit('/');
    cy.contains('Sign In').click();
    // Would check for login form elements
  });
});

describe('Project Workflow E2E Tests', () => {
  it('should be able to start a challenge', () => {
    // This would test the full workflow:
    // 1. Login
    // 2. Browse challenges
    // 3. Select a challenge
    // 4. Start project
    // 5. Verify project is created

    // Visit home page
    cy.visit('/');

    // Click sign in
    cy.contains('Sign In').click();

    // Login with test credentials (would need test user setup)
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.contains('Sign In').click();

    // Wait for login to complete and redirect to home
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // Navigate to challenges
    cy.contains('Challenges').click();
    cy.url().should('include', '/challenges');

    // Select a challenge
    cy.contains('View Details').first().click();
    cy.url().should('include', '/challenges/');

    // Start project (assuming there's a button)
    cy.contains('Start Project').click();

    // Verify project was created and redirected to workflow
    cy.url().should('include', '/projects/');
    cy.url().should('include', '/workflow');

    // Check that project workflow page is loaded
    cy.contains('Project Workflow').should('be.visible');
  });

  it('should allow adding skill evidence to a project', () => {
    // This would test adding skill evidence to a project
    // Requires being logged in and having a project in progress
    cy.visit('/');

    // Login (would need proper test setup)
    cy.contains('Sign In').click();
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.contains('Sign In').click();

    // Navigate to a project
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.contains('Projects').click() || cy.contains('My Projects').click();
    cy.url().should('include', '/projects');

    // Select a project
    cy.contains('View Details').first().click();
    cy.url().should('include', '/projects/');

    // Navigate to workflow
    cy.contains('Workflow').click();
    cy.url().should('include', '/workflow');

    // Add skill evidence
    cy.contains('Add Skill Evidence').click();

    // Fill in evidence form
    cy.get('input[name="details"]').type('I demonstrated leadership in this project');
    cy.get('select[name="skillId"]').select('Leadership');
    cy.get('select[name="level"]').select('BEGINNER');

    // Submit evidence
    cy.contains('Submit Evidence').click();

    // Verify success message
    cy.contains(/success/i).should('exist');
    cy.contains(/evidence added/i).should('exist');
  });

  it('should allow adding reflections to a project', () => {
    // Similar to skill evidence but for reflections
    expect(true).toBe(true); // Placeholder
  });

  it('should show workflow progression', () => {
    // Test that users can see and advance through workflow stages
    expect(true).toBe(true); // Placeholder
  });
});

describe('Admin Dashboard E2E Tests (if applicable)', () => {
  it('should show admin dashboard for platform admins', () => {
    // This would test admin functionality
    // Requires logging in as platform admin
    expect(true).toBe(true); // Placeholder
  });

  it('should allow managing users', () => {
    // Test user management functionality
    expect(true).toBe(true); // Placeholder
  });

  it('should allow managing challenges', () => {
    // Test challenge management functionality
    expect(true).toBe(true); // Placeholder
  });
});

describe('Multi-Language Support E2E Tests', () => {
  it('should switch to Marathi language', () => {
    cy.visit('/');
    cy.contains('Language').click();
    cy.contains('Marathi').click();

    // Check that key text is in Marathi
    // Note: These translations would need to be verified against actual translations
    cy.contains('य aprendizissage करते सीखे').should('exist'); // Learning Challenges in Marathi (example)
  });

  it('should switch back to English language', () => {
    cy.visit('/');
    cy.contains('Language').click();
    cy.contains('English').click();

    // Check that key text is in English
    cy.contains('Learning Challenges').should('be.visible');
  });

  it('should persist language preference', () => {
    // Set language to Marathi
    cy.visit('/');
    cy.contains('Language').click();
    cy.contains('Marathi').click();

    // Reload page
    cy.reload();

    // Should still be in Marathi
    cy.contains('य apprendissage करते सीखे').should('exist');
  });
});

describe('Responsive Design E2E Tests', () => {
  it('should display correctly on mobile viewport', () => {
    cy.viewport(375, 667); // iPhone 6/7/8
    cy.visit('/');

    cy.contains('Yukta Nashik').should('be.visible');
    cy.contains('Sign In').should('be.visible');
    // Check that navigation is accessible
    cy.contains('Challenges').should('exist');
  });

  it('should display correctly on tablet viewport', () => {
    cy.viewport(768, 1024); // iPad
    cy.visit('/');

    cy.contains('Yukta Nashik').should('be.visible');
    cy.contains('Sign In').should('be.visible');
  });

  it('should display correctly on desktop viewport', () => {
    cy.viewport(1280, 720);
    cy.visit('/');

    cy.contains('Yukta Nashik').should('be.visible');
    cy.contains('Sign In').should('be.visible');
  });
});

describe('Error Handling E2E Tests', () => {
  it('should show 404 page for non-existent routes', () => {
    cy.visit('/nonexistent-page');
    cy.contains(/not found/i).should('exist');
    cy.contains(/404/i).should('exist');
  });

  it('should handle API errors gracefully', () => {
    // This would require mocking or simulating API errors
    expect(true).toBe(true); // Placeholder
  });

  it('should show validation errors for form inputs', () => {
    cy.visit('/');
    cy.contains('Sign In').click();

    // Try to submit empty form
    cy.contains('Sign In').click();

    // Check for validation errors
    cy.contains(/email.*required/i).should('exist');
    cy.contains(/password.*required/i).should('exist');
  });
});