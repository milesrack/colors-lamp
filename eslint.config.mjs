import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
    {
        files: ['public/**/*.js'],
        extends: [js.configs.recommended],
        languageOptions: {
            sourceType: 'script',
            globals: globals.browser,
        },
    },
    {
        files: ['tests/**/*.js', 'jest.config.cjs'],
        extends: [js.configs.recommended],
        languageOptions: {
            sourceType: 'commonjs',
            globals: { ...globals.node, ...globals.jest },
        },
    },
    {
        files: ['tests/unit/**/*.js'],
        languageOptions: { globals: globals.browser },
    },
]);
