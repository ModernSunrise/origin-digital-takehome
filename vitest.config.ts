import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Unit tests target the pure service layer directly (Node env, no DOM, no HTTP).
// See .claude/rules/testing/service-tests.md.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
