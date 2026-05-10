import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function readVersion() {
  try {
    if (existsSync('./src-tauri/tauri.conf.json')) {
      return JSON.parse(readFileSync('./src-tauri/tauri.conf.json', 'utf-8')).version
    }
  } catch {}
  return JSON.parse(readFileSync('./package.json', 'utf-8')).version
}
const version = readVersion()

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Injected at build time from tauri.conf.json — update version there, not here
    __APP_VERSION__: JSON.stringify(version),
  },
})
