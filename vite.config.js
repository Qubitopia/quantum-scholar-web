import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  // Use relative asset paths in production so the built `index.html`
  // can be opened directly (file://) or served from the `build/`
  // directory by simple static servers (like Live Server).
  base: './',
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
