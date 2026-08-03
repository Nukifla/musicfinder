import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

function getBuildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return Date.now().toString(36)
  }
}

const buildId = getBuildId()

// Emits /version.json alongside the build so the running app can poll it and
// detect that a newer build has been deployed (see useAppUpdate hook).
function versionFilePlugin(id: string): Plugin {
  return {
    name: 'musicfinder-version-file',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId: id, builtAt: new Date().toISOString() }),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), versionFilePlugin(buildId)],
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
})
