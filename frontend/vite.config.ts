import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { UserConfig } from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  build: {
    rollupOptions: {
      external: ['html2canvas', 'dompurify', 'canvg']
    },
    outDir: 'dist',
    assetsDir: 'assets'
  }
} as UserConfig)
