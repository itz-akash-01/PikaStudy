import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Flat project layout: there is no /public folder, so copy these host files into dist/ at build time.
const hostFiles = ['robots.txt', '_redirects']
const copyHostFiles = (): Plugin => ({
  name: 'copy-host-files',
  generateBundle() {
    for (const fileName of hostFiles) this.emitFile({ type: 'asset', fileName, source: readFileSync(fileName) })
  },
})

export default defineConfig({ plugins: [react(), copyHostFiles()] })
