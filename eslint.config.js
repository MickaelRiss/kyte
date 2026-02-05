import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import globals from 'globals';

export default [
  // Ignore patterns (replaces .eslintignore)
  {
    ignores: [
      '**/dist/**',
      '**/out/**',
      '**/build/**',
      '**/release/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.bundle.js',
    ],
  },

  // Base configuration for all files
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  // React configuration
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      react,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: '19.0',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript for prop validation
    },
  },

  // Node.js files (main process, scripts)
  {
    files: ['**/src/main/**/*.ts', '**/scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
