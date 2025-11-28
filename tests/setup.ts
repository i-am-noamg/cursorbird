/**
 * Jest setup file - runs before each test file
 * Sets up global mocks and test utilities
 */

// Ensure console output during tests is visible
jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'warn').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

// Default timeout for async tests (useful for debugging)
jest.setTimeout(10000);

// Reset modules before each test to ensure clean state
beforeEach(() => {
  jest.clearAllMocks();
});

