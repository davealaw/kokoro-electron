module.exports = {
  // Test environment setup
  testEnvironment: 'jsdom',

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov'],
  collectCoverageFrom: [
    'scripts/**/*.js',
    'main.js',
    'preload.js',
    '!scripts/debug.js', // Exclude debug utilities
    '!node_modules/**',
    '!tests/**',
    '!coverage/**',
  ],
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 25,
      lines: 25,
      statements: 25,
    },
  },

  // Test file patterns
  testMatch: ['**/tests/**/*.test.js', '**/?(*.)+(spec|test).js'],

  // Module setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Transform settings for ES6 modules
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Module name mapping for mocking
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
};
