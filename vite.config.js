import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  // Use absolute asset paths so deployments on routes like 
  // https://example.com/auth resolve assets correctly.
  // For local testing, use `npm run dev` or `npm run preview` instead of opening file:// directly.
  base: '/',
  plugins: [react()],
  build: {
    // Build-specific options
    outDir: 'build', // Output directory for the build
    sourcemap: false, // Generate sourcemaps
  },
  server: {
    // https: true,
    host: true,
    port: 3000
  }
})
