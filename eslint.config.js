// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const boundaries = require('eslint-plugin-boundaries');

/** Allowed targets for a layer; see docs/ARCHITECTURE.md section 4. */
const canUse = (from, ...to) => ({
  from: { element: { type: from } },
  allow: { to: { element: { types: { anyOf: [from, ...to] } } } },
});

module.exports = defineConfig([
  {
    // Layer rules for application code (specs and generated files are exempt).
    files: ['src/**/*.ts'],
    ignores: ['**/*.spec.ts', 'src/generated/**'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'src/app/core' },
        { type: 'content', pattern: 'src/app/content' },
        { type: 'data', pattern: 'src/app/data' },
        { type: 'shared', pattern: 'src/app/shared' },
        { type: 'features', pattern: 'src/app/features' },
        { type: 'generated', pattern: 'src/generated' },
        // Root files (app.ts, app.config.ts, app.routes.ts, main.ts) are the composition root:
        // they are deliberately unclassified, so they may import any layer.
      ],
      // Lets the plugin resolve extensionless TypeScript imports to files (otherwise targets stay "unknown").
      'import/resolver': { node: { extensions: ['.ts', '.js', '.json'] } },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            // Third-party packages are allowed everywhere.
            { allow: { to: { module: { origin: 'external' } } } },
            canUse('core'),
            canUse('content'),
            canUse('data', 'core', 'generated'),
            canUse('shared', 'core'),
            canUse('features', 'core', 'data', 'content', 'shared'),
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
