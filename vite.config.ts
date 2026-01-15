import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // If deploying to GitHub Pages with a repository name (e.g., username.github.io/repo-name),
  // uncomment the line below and set base to '/repo-name/'
  // base: '/arcade/',
})

