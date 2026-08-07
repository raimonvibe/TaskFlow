import js from '@eslint/js'
import babelParser from '@babel/eslint-parser'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const reactConfigs = [react.configs['flat/recommended'], react.configs['flat/jsx-runtime']].filter(
  Boolean
)

const reactPlugins = {
  react,
  'react-hooks': reactHooks,
  'react-refresh': reactRefresh,
}

const reactRules = {
  ...(reactHooks.configs.recommended?.rules ?? {}),
  'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  'react/prop-types': 'off',
  'react/jsx-uses-vars': 'error',
  'react/jsx-uses-react': 'error',
}

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  ...reactConfigs,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ['@babel/preset-react'] },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: reactPlugins,
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactRules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: reactPlugins,
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactRules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
    },
  }
)
