import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/free-ai-bitbucket-reviewer/',
  server: {
    port: 3000,
    host: true
  }
})