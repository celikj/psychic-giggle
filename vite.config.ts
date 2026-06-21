import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Set SINGLEFILE=1 to inline all JS/CSS into one self-contained index.html
const singlefile = process.env.SINGLEFILE === '1'

export default defineConfig({
  base: './',
  plugins: [react(), ...(singlefile ? [viteSingleFile()] : [])],
  build: {
    outDir: singlefile ? 'dist-single' : 'dist',
  },
})
