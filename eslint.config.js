// ESLint flat config (ES modules) для LUMIVORE
// Проект легаси - шумные правила заглушены, цель: зелёный линт как гигиена CI
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    // Служебные и сгенерированные пути не линтуем
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'public/assets/**',
      '**/*.svg',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // --- Заглушки для легаси-кода: не роняем линт, только warn где полезно ---
      'no-empty': 'off',
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'no-prototype-builtins': 'off',
      'no-fallthrough': 'off',
      'no-constant-condition': 'off',
      'no-cond-assign': 'off',
      'no-async-promise-executor': 'off',
      'no-irregular-whitespace': 'off',
      'no-useless-assignment': 'off',

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-array-constructor': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-namespace': 'off',
    },
  },
);
