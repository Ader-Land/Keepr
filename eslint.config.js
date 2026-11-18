const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

module.exports = defineConfig([
    expo,
    {
        ignores: ['dist/*', 'android/*', 'node_modules/*', 'coverage/*'],
    },
    {
        files: ['__tests__/**/*.js', '**/*.test.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                jest: 'readonly',
            },
        },
        rules: {
            // jest.mock() calls must precede the imports they mock.
            'import/first': 'off',
        },
    },
]);
