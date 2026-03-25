import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
// import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  // Use absolute asset paths so deployments on routes like 
  // https://example.com/auth resolve assets correctly.
  // For local testing, use `npm run dev` or `npm run preview` instead of opening file:// directly.
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  build: {
    // Build-specific options
    sourcemap: false, // Generate sourcemaps
  },
  server: {
    // https: true,
    host: true,
    port: 3000
  }
})
