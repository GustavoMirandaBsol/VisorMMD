import { useState, useCallback, useEffect } from 'react'
import type { DiagramFile } from '../types'

function generateId(name: string): string {
  return `${name}-${Math.random().toString(36).slice(2, 9)}`
}

// Guarda el .mmd en public/diagrams/ y actualiza manifest.json via el plugin de Vite.
// En producción (sin el plugin) falla silenciosamente — el archivo vive solo en memoria.
async function saveToDisk(name: string, content: string): Promise<boolean> {
  try {
    const res = await fetch('/api/save-diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content }),
    })
    const data = await res.json() as { ok: boolean }
    return data.ok
  } catch {
    return false
  }
}

async function deleteFromDisk(name: string): Promise<void> {
  try {
    await fetch('/api/delete-diagram', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  } catch {
    // Silencioso en producción
  }
}

export function useDiagrams() {
  const [diagrams, setDiagrams] = useState<DiagramFile[]>([])
  const [selected, setSelected] = useState<DiagramFile | null>(null)
  const [isLoadingDemo, setIsLoadingDemo] = useState(true)

  // Carga los diagramas desde /public/diagrams usando el manifest
  useEffect(() => {
    async function loadDemoFiles() {
      try {
        const base = import.meta.env.BASE_URL
        const manifestRes = await fetch(`${base}diagrams/manifest.json`)
        if (!manifestRes.ok) throw new Error('manifest no encontrado')
        const fileNames: string[] = await manifestRes.json()

        const loaded = await Promise.all(
          fileNames.map(async (name) => {
            const res = await fetch(`${base}diagrams/${name}`)
            const content = await res.text()
            return { id: generateId(name), name, content, source: 'demo' as const }
          })
        )

        setDiagrams(loaded)
        setSelected(loaded[0] ?? null)
      } catch {
        // Arranca vacío si no hay servidor
      } finally {
        setIsLoadingDemo(false)
      }
    }

    loadDemoFiles()
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files
      if (!fileList) return

      const mmdFiles = Array.from(fileList).filter((f) =>
        f.name.toLowerCase().endsWith('.mmd')
      )

      const readers = mmdFiles.map(
        (file) =>
          new Promise<DiagramFile>((resolve) => {
            const reader = new FileReader()
            reader.onload = async (ev) => {
              const content = (ev.target?.result as string) ?? ''

              // Añade inmediatamente a la lista con estado 'upload' (no persistido aún)
              const draft: DiagramFile = {
                id: generateId(file.name),
                name: file.name,
                content,
                source: 'upload',
              }

              // Persiste en disco en segundo plano y actualiza source si tiene éxito
              saveToDisk(file.name, content).then((saved) => {
                if (saved) {
                  setDiagrams((prev) =>
                    prev.map((d) =>
                      d.id === draft.id ? { ...d, source: 'demo' } : d
                    )
                  )
                }
              })

              resolve(draft)
            }
            reader.readAsText(file)
          })
      )

      Promise.all(readers).then((loaded) => {
        setDiagrams((prev) => {
          const existingNames = new Set(prev.map((d) => d.name))
          const newFiles = loaded.filter((f) => !existingNames.has(f.name))
          return [...prev, ...newFiles]
        })
        if (loaded.length > 0) setSelected(loaded[0])
      })

      e.target.value = ''
    },
    []
  )

  const removeFile = useCallback(
    (id: string) => {
      setDiagrams((prev) => {
        const target = prev.find((d) => d.id === id)
        const next = prev.filter((d) => d.id !== id)

        if (selected?.id === id) {
          setSelected(next[0] ?? null)
        }

        // Elimina de disco solo archivos que estaban en el manifest (source: 'demo')
        if (target?.source === 'demo') {
          deleteFromDisk(target.name)
        }

        return next
      })
    },
    [selected]
  )

  const updateDiagram = useCallback((id: string, content: string) => {
    setDiagrams((prev) => {
      const target = prev.find((d) => d.id === id)
      if (target) saveToDisk(target.name, content)
      return prev.map((d) => (d.id === id ? { ...d, content } : d))
    })
    setSelected((prev) => (prev?.id === id ? { ...prev, content } : prev))
  }, [])

  return {
    diagrams,
    selected,
    setSelected,
    isLoadingDemo,
    handleFileInputChange,
    removeFile,
    updateDiagram,
  }
}
