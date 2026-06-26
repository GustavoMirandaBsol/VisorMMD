import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import type { DiagramFile } from '../types'

interface Props {
  diagram: DiagramFile | null
}

let renderSeq = 0

export default function DiagramViewer({ diagram }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!diagram) {
      setError(null)
      if (containerRef.current) containerRef.current.innerHTML = ''
      return
    }

    let cancelled = false
    const seq = ++renderSeq

    setError(null)
    setIsRendering(true)
    setZoom(1)

    ;(async () => {
      try {
        const { svg, bindFunctions } = await mermaid.render(`mmd-${seq}`, diagram.content)

        if (cancelled || !containerRef.current) return

        containerRef.current.innerHTML = svg
        bindFunctions?.(containerRef.current)

        // setAttribute en lugar de removeAttribute — el SVG rellena el contenedor
        const svgEl = containerRef.current.querySelector('svg')
        if (svgEl) {
          svgEl.setAttribute('width', '100%')
          svgEl.removeAttribute('height')
        }
      } catch (err) {
        if (cancelled) return
        const raw = err instanceof Error ? err.message : String(err)
        setError(raw.replace(/<[^>]+>/g, '').trim() || 'Error al parsear el diagrama.')
        if (containerRef.current) containerRef.current.innerHTML = ''
      } finally {
        if (!cancelled) setIsRendering(false)
      }
    })()

    return () => {
      cancelled = true
      // Limpia los elementos temporales que Mermaid deja en document.body
      document.getElementById(`mmd-${seq}`)?.remove()
    }
  }, [diagram])

  if (!diagram) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <svg className="mx-auto w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
          </svg>
          <p className="text-slate-400 text-sm font-medium">Selecciona un diagrama del panel izquierdo</p>
          <p className="text-slate-300 text-xs">o carga un archivo .mmd desde tu computadora</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h2 className="text-sm font-semibold text-slate-700">{diagram.name}</h2>
          {isRendering && (
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Renderizando...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(z - 0.2, 0.2))}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors" title="Alejar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button onClick={() => setZoom(1)}
            className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors font-mono min-w-[3.5rem] text-center"
            title="Restablecer zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => setZoom((z) => Math.min(z + 0.2, 4))}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors" title="Acercar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Área de diagrama */}
      <div className="flex-1 overflow-auto min-h-0 p-6">
        {/*
          El containerRef div SIEMPRE está en el DOM (nunca condicional).
          Si está oculto con hidden, la ref sigue válida y el render async
          puede escribir en él aunque haya un error activo del diagrama anterior.
        */}
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: '100%' }}
          className={error ? 'hidden' : ''}
        >
          <div ref={containerRef} className="w-full" />
        </div>

        {error && (
          <div className="max-w-2xl">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-700 mb-1">Error de sintaxis Mermaid</p>
                <pre className="text-xs text-red-600 whitespace-pre-wrap break-all font-mono bg-red-100 rounded p-2 mt-2">
                  {error}
                </pre>
                <p className="text-xs text-red-500 mt-2">
                  Revisa la sintaxis del archivo <code className="font-mono">{diagram.name}</code>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
