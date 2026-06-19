/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  testMatch: ['**/src/**/__tests__/**/*.test.js', '**/api/**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/services/**/*.js',
    'api/**/*.js',
    '!api/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
};
