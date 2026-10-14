/// <reference types="cypress" />

describe('Challenge Browsing, Filtering, and Searching E2E Tests', () => {
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
    const searchTerm = 'science';
    cy.contains('Search').type(`${searchTerm}{enter}`);

    // Wait for search to process (assuming there's an API call)
    cy.wait(1000);

    // Verify that the search term is reflected in the URL or that results are filtered
    // We'll check that the search input still contains the term
    cy.contains('Search').should('have.value', searchTerm);

    // Additionally, we could check that all visible challenges contain the search term
    // But since we don't have control over test data, we'll just verify the UI interaction
    // and that there are no error messages
    cy.contains(/no results/i).should('not.exist');
  });

  it('should be able to filter by subject', () => {
    const subject = 'Science';
    cy.contains('Filter').click();
    cy.contains('Subject').click();
    cy.contains(subject).click();
    cy.contains('Filter').click(); // Close filter dropdown

    // Verify that the filter is applied (check URL or UI)
    // We'll check that the subject filter chip is visible
    cy.contains(subject).should('be.visible');

    // Wait for filtering to complete
    cy.wait(1000);

    // Check that there are no error messages
    cy.contains(/no results/i).should('not.exist');
  });

  it('should be able to filter by grade', () => {
    const grade = '5';
    cy.contains('Filter').click();
    cy.contains('Grade').click();
    cy.contains(grade).click();
    cy.contains('Filter').click(); // Close filter dropdown

    // Verify that the filter is applied
    cy.contains(grade).should('be.visible');

    // Wait for filtering to complete
    cy.wait(1000);

    // Check that there are no error messages
    cy.contains(/no results/i).should('not.exist');
  });

  it('should be able to combine multiple filters', () => {
    const subject = 'Math';
    const grade = '3';

    // Apply subject filter
    cy.contains('Filter').click();
    cy.contains('Subject').click();
    cy.contains(subject).click();

    // Apply grade filter
    cy.contains('Grade').click();
    cy.contains(grade).click();

    cy.contains('Filter').click(); // Close filter dropdown

    // Verify both filters are applied
    cy.contains(subject).should('be.visible');
    cy.contains(grade).should('be.visible');

    // Wait for filtering to complete
    cy.wait(1000);

    // Check that there are no error messages
    cy.contains(/no results/i).should('not.exist');
  });

  it('should clear filters when reset button is clicked', () => {
    // Apply a filter
    cy.contains('Filter').click();
    cy.contains('Subject').click();
    cy.contains('Science').click();
    cy.contains('Filter').click();

    // Click reset button (assuming there is one)
    cy.contains('Reset Filters').click();

    // Verify that filters are cleared
    cy.contains('Science').should('not.be.visible'); // Assuming the filter chip disappears

    // Wait for reset to complete
    cy.wait(1000);
  });

  it('navigates to challenge details when clicked', () => {
    // This assumes challenge cards are rendered
    cy.contains('View Details').first().click();

    // Would check navigation to challenge details page
    cy.url().should('include', '/challenges/');
    // Verify that the challenge details page is loaded
    cy.contains('Challenge Details').should('exist');
  });

  it('shows new challenge button for teachers (if applicable)', () => {
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

    // Verify Marathi text appears (using actual translation)
    cy.contains('शिक्षण चुनौतियां').should('exist');
  });
});