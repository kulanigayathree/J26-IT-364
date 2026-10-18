import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import ocean from './eslint-rules/ocean.js';

/**
 * Guardrails that keep the four component pages consistent. See CONTRIBUTING.md.
 * Do not disable these rules in feature code: ask for a shared component or token instead.
 */

const NO_INLINE_STYLE = {
  selector: "JSXAttribute[name.name='style']",
  message:
    'Inline style={{}} is not allowed. Use Tailwind classes built from src/design/tokens.ts.',
};

const OTHER_UI_LIBRARIES = {
  patterns: [
    {
      group: [
        '@mui/*',
        '@material-ui/*',
        'bootstrap',
        'react-bootstrap',
        'antd',
        '@chakra-ui/*',
        '@mantine/*',
        'styled-components',
        '@emotion/*',
      ],
      message:
        'Only the shared UI kit (src/components) + Tailwind + lucide-react are used in this app.',
    },
  ],
};

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'coverage'] },

  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node },
  },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, ocean },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['routes'] },
      ],
      'no-restricted-syntax': ['error', NO_INLINE_STYLE],
      'no-restricted-imports': ['error', OTHER_UI_LIBRARIES],
      'ocean/import-boundaries': 'error',
    },
  },

  // Hex / rgb() colours live only in src/design.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/design/**'],
    rules: { 'ocean/no-raw-colors': 'error' },
  },

  // Feature folders: no Tailwind arbitrary values either.
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: { 'ocean/no-arbitrary-tailwind': 'error' },
  },

  // Barrel files only re-export.
  {
    files: ['src/**/index.ts'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  {
    files: ['*.config.ts'],
    languageOptions: { globals: globals.node },
  },

  prettier,
);
