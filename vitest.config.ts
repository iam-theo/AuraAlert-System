import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts', 'server/microkernel/**/*.ts'],
    },
    include: ['tests/**/*.{test,spec}.ts'],
  },
});
