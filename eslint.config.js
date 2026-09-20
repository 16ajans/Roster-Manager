const js = require('@eslint/js')
const tseslint = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')

module.exports = [
  {
    ignores: ['node_modules/**', '.env', 'verifications/**', 'dist/**', 'public/**']
  },
  js.configs.recommended,
  ...tseslint.configs['flat/strict'],
  ...tseslint.configs['flat/stylistic'],
  {
    languageOptions: {
      parser: tsParser
    }
  }
]
