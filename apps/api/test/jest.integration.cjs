module.exports = {
  preset: 'ts-jest',
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['**/test/integration/*.spec.ts'],
  testTimeout: 30000,
};
