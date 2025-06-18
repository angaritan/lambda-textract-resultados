module.exports = {
    testPathIgnorePatterns: ['/config/'],
    coveragePathIgnorePatterns: ['/config/'],
    coverageDirectory: 'dist/test-coverage/',
    testEnvironment: 'node',
    transform: {
      '^.+\\.js': 'babel-jest'
    },
    collectCoverageFrom: [
      'src/**/*.{js,jsx}',
      '!src/config/**'
    ]
  };