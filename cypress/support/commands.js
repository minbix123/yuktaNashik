// Custom Cypress commands
Cypress.Commands.add('registerUser', (email, password, fullName) => {
  cy.visit('/');
  cy.contains('Sign In').click();
  cy.contains('Sign Up').click();
  cy.get('input[name="fullName"]').type(fullName);
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('input[name="confirmPassword"]').type(password);
  cy.contains('Sign Up').click();
});
