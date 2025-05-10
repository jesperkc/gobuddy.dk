# GoBuddy Tests

This directory contains automated tests for the GoBuddy application using Playwright.

## Setup

The tests are configured to run against the local development server. Make sure you have installed all dependencies:

```bash
npm install
```

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all tests in headless mode
npm test

# Run tests with UI mode for debugging
npm run test:ui
```

## Test Files

- `signup-flow.spec.ts`: Tests the complete signup flow from landing page to account creation

## Notes

- The tests are configured to run against the local development server at http://localhost:3002
- The tests will automatically start the development server if it's not already running
- The tests are designed to be non-destructive and won't create actual accounts in the database
