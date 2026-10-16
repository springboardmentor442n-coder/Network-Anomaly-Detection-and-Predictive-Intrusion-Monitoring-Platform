import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    /*
     * The default `forks` pool fails to hand off to its workers on this
     * machine (the project lives inside a OneDrive-synced, non-ASCII path, and
     * the forked worker never reports ready). The `threads` pool starts
     * reliably and runs the same tests.
     */
    pool: 'threads',
    testTimeout: 20000,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'backend'],
  },
});
