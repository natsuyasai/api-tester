/// <reference types="vitest/config" />
/// <reference types="vitest" />
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['src/**/*.stories.{js,jsx,ts,tsx}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@': resolve('src/')
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  }
})
