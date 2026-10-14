// Cypress E2E support file
import './commands';

// Example custom command
Cypress.Commands.add('login', (email, password) => {
  // Implement login command
  cy.visit('/');
  // In a real app, you would fill in login form and submit
  // For demo purposes, we'll just visit the login page
});

Cypress.Commands.add('createProject', (challengeId, studentId) => {
  // Implement project creation command
  // This would involve API calls or UI interactions
});