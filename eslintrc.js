/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    /*
     * Async correctness (critical for VS Code APIs)
     */
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: false },
    ],
    '@typescript-eslint/await-thenable': 'error',
    /*
     * Practical TypeScript defaults
     */
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    /*
     * General correctness
     */
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-debugger': 'error',
    'no-console': 'warn',
    /*
     * Imports / variables
     */
    'no-duplicate-imports': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_' },
    ],
    /*
     * TS comment discipline
     */
    '@typescript-eslint/ban-ts-comment': [
      'warn',
      { 'ts-ignore': 'allow-with-description' },
    ],
    /*
     * Light stylistic rules (Prettier handles most)
     */
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  },
  ignorePatterns: ['out', 'dist', 'node_modules'],
};
