import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  modulePaths: ['<rootDir>/node_modules'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@rently/shared$': '<rootDir>/../shared/src/index.ts',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
    }],
  },
  collectCoverageFrom: [
    'src/components/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageReporters: ['text', 'lcov'],
}

export default config
