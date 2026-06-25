/**
 * Minimal ESLint flat configuration for the JavaScript ES Modules backend scaffold.
 * This keeps the provided lint script functional without introducing TypeScript tooling.
 */
export default [
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**', 'logs/**', 'public/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
];
