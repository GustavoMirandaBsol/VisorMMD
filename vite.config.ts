import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const DIAGRAMS_DIR = path.join(process.cwd(), 'public', 'diagrams')
const MANIFEST_PATH = path.join(DIAGRAMS_DIR, 'manifest.json')

async function readManifest(): Promise<string[]> {
  const raw = await fs.readFile(MANIFEST_PATH, 'utf-8')
  return JSON.parse(raw)
}

async function writeManifest(manifest: string[]): Promise<void> {
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
  })
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export default defineConfig({
  base: '/VisorMMD/',
  plugins: [
    react(),
    {
      name: 'mmd-file-api',
      configureServer(server) {
        // POST /api/save-diagram  { name, content }
        // Escribe el .mmd en public/diagrams/ y actualiza manifest.json
        server.middlewares.use('/api/save-diagram', async (req, res, next) => {
          if (req.method !== 'POST') { next(); return }
          try {
            const { name, content } = JSON.parse(await readBody(req)) as {
              name: string
              content: string
            }
            if (!name.endsWith('.mmd')) throw new Error('Solo se permiten archivos .mmd')

            await fs.writeFile(path.join(DIAGRAMS_DIR, name), content, 'utf-8')

            const manifest = await readManifest()
            if (!manifest.includes(name)) {
              manifest.push(name)
              await writeManifest(manifest)
            }

            json(res, 200, { ok: true })
          } catch (err) {
            json(res, 500, { ok: false, error: String(err) })
          }
        })

        // DELETE /api/delete-diagram  { name }
        // Elimina el .mmd de public/diagrams/ y lo quita del manifest.json
        server.middlewares.use('/api/delete-diagram', async (req, res, next) => {
          if (req.method !== 'DELETE') { next(); return }
          try {
            const { name } = JSON.parse(await readBody(req)) as { name: string }

            await fs.rm(path.join(DIAGRAMS_DIR, name), { force: true })

            const manifest = await readManifest()
            const updated = manifest.filter((f) => f !== name)
            await writeManifest(updated)

            json(res, 200, { ok: true })
          } catch (err) {
            json(res, 500, { ok: false, error: String(err) })
          }
        })
      },
    },
  ],
  optimizeDeps: {
    include: ['mermaid'],
  },
})
