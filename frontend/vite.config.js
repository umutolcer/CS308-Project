import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Read frontend/.env; variables without the VITE_ prefix stay out of the browser bundle
  const env = loadEnv(mode, import.meta.dirname, '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Forward /api requests to the Express backend so the browser sees a single origin
      proxy: {
        '/api': env.BACKEND_URL || 'http://localhost:5000',
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './tests/setup.js',
    },
  };
});
