module.exports = {
    projects: [
        {
            displayName: 'unit',
            testEnvironment: 'jsdom',
            testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
            transform: {},
        },
        {
            displayName: 'integration',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/integration/api.test.js'],
            transform: {},
        },
        {
            displayName: 'database-failure',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/integration/database-failure.test.js'],
            transform: {},
        },
    ],
};
