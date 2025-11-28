/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/game/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  // Clear mocks between tests
  clearMocks: true,
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Module name mapper to handle vscode mock
  moduleNameMapper: {
    '^vscode$': '<rootDir>/tests/__mocks__/vscode.ts',
  },
};

