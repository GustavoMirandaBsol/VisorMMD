import { useEffect, useRef, useState, useCallback } from 'react'
import mermaid from 'mermaid'
import type { DiagramFile } from '../types'

interface Props {
  diagram: DiagramFile | null
  onSave: (id: string, content: string) => void
}

interface RenderJob { content: string; seq: number }

let globalSeq = 0

export default function DiagramViewer({ diagram, onSave }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef  = useRef<HTMLDivElement>(null)
  // Captura el pan al inicio del arrastre sin recrear callbacks en cada frame
  const dragRef = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 })
  const panRef  = useRef({ x: 0, y: 0 })

  const [error, setError]           = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [zoom, setZoom]             = useState(1)
  const [pan, setPan]               = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const [editMode, setEditMode]       = useState(false)
  const [editContent, setEditContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [renderJob, setRenderJob]     = useState<RenderJob | null>(null)

  const isDirty = editContent !== savedContent

  // Mantiene panRef sincronizado para que onMouseDown no sea afectado por cierre stale
  useEffect(() => { panRef.current = pan }, [pan])

  // ── Reset completo al cambiar de diagrama ────────────────────────────────────
  useEffect(() => {
    if (!diagram) {
      setRenderJob(null); setError(null)
      setEditContent(''); setSavedContent('')
      setEditMode(false)
      return
    }
    setEditContent(diagram.content)
    setSavedContent(diagram.content)
    setEditMode(false)
    setPan({ x: 0, y: 0 })
    setZoom(1)
    setRenderJob({ content: diagram.content, seq: ++globalSeq })
  }, [diagram?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preview en tiempo real mientras se edita (debounce 500 ms) ──────────────
  useEffect(() => {
    if (!editMode) return
    const t = setTimeout(() =>
      setRenderJob({ content: editContent, seq: ++globalSeq }), 500)
    return () => clearTimeout(t)
  }, [editContent, editMode])

  // ── Render Mermaid ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!renderJob) return
    const { content, seq } = renderJob
    let cancelled = false
    setError(null)
    setIsRendering(true)

    ;(async () => {
      try {
        const { svg, bindFunctions } = await mermaid.render(`mmd-${seq}`, content)
        if (cancelled || !containerRef.current) return
        containerRef.current.innerHTML = svg
        bindFunctions?.(containerRef.current)
        const svgEl = containerRef.current.querySelector('svg')
        if (svgEl) { svgEl.setAttribute('width', '100%'); svgEl.removeAttribute('height') }
      } catch (err) {
        if (cancelled) return
        const raw = err instanceof Error ? err.message : String(err)
        setError(raw.replace(/<[^>]+>/g, '').trim() || 'Error al parsear el diagrama.')
        if (containerRef.current) containerRef.current.innerHTML = ''
      } finally {
        if (!cancelled) setIsRendering(false)
      }
    })()

    return () => { cancelled = true; document.getElementById(`mmd-${seq}`)?.remove() }
  }, [renderJob])

  // ── Zoom con rueda del mouse (passive:false para preventDefault) ─────────────
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => Math.max(0.2, Math.min(4, z - e.deltaY * 0.001)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Handlers de pan ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragRef.current = {
      active: true,
      startX: e.clientX, startY: e.clientY,
      panX: panRef.current.x, panY: panRef.current.y,
    }
    setIsDragging(true)
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.active) return
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
    })
  }, [])

  const stopDrag = useCallback(() => {
    dragRef.current.active = false
    setIsDragging(false)
  }, [])

  // ── Guardar edición ──────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!diagram) return
    setSavedContent(editContent)
    onSave(diagram.id, editContent)
  }, [diagram, editContent, onSave])

  const handleCloseEdit = useCallback(() => {
    setEditContent(savedContent)
    setRenderJob({ content: savedContent, seq: ++globalSeq })
    setEditMode(false)
  }, [savedContent])

  // ── Empty state ──────────────────────────────────────────────────────────────
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

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shrink-0 gap-3">

        {/* Izquierda: nombre + estado */}
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h2 className="text-sm font-semibold text-slate-700 truncate">{diagram.name}</h2>
          {isRendering && (
            <span className="flex items-center gap-1 text-xs text-blue-500 shrink-0">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Renderizando...
            </span>
          )}
          {editMode && isDirty && (
            <span className="text-xs text-amber-500 font-medium shrink-0">● Cambios sin guardar</span>
          )}
        </div>

        {/* Centro / derecha: acciones */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Botón editar / cerrar editor */}
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors"
              title="Editar diagrama"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Editar
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={!isDirty}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                title="Guardar cambios"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                </svg>
                Guardar
              </button>
              <button
                onClick={handleCloseEdit}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Cerrar editor"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Cerrar
              </button>
            </>
          )}

          {/* Separador */}
          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Zoom */}
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors" title="Alejar (scroll también funciona)">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4"/>
            </svg>
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
            className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors font-mono min-w-[3.5rem] text-center"
            title="Restablecer vista">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => setZoom(z => Math.min(4, z + 0.2))}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors" title="Acercar (scroll también funciona)">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Área de trabajo ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* Panel editor (solo visible en editMode) */}
        {editMode && (
          <div className="w-[420px] shrink-0 flex flex-col border-r border-slate-200 bg-white">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Editor MMD</span>
              <span className="text-xs text-slate-400">Preview automático · 500 ms</span>
            </div>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              spellCheck={false}
              className="flex-1 resize-none p-3 font-mono text-xs text-slate-800 leading-relaxed focus:outline-none bg-white"
              placeholder="sequenceDiagram&#10;    A->>B: Mensaje..."
            />
            <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-400">
                {editContent.split('\n').length} líneas
              </span>
              <div className="flex gap-2">
                {isDirty && (
                  <button
                    onClick={() => { setEditContent(savedContent); setRenderJob({ content: savedContent, seq: ++globalSeq }) }}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Descartar
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!isDirty}
                  className="px-3 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Viewport del diagrama (pan + zoom) ────────────────────────────── */}
        <div
          ref={viewportRef}
          className="flex-1 overflow-hidden relative min-h-0 select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
        >
          {/* Capa de transformación: centrado por defecto, desplazable con pan */}
          <div className="absolute inset-0 flex justify-center" style={{ paddingTop: '32px' }}>
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'top center',
                flexShrink: 0,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {/* containerRef SIEMPRE en el DOM — nunca condicional */}
              <div
                ref={containerRef}
                style={{ visibility: error ? 'hidden' : 'visible', minWidth: '200px' }}
              />
            </div>
          </div>

          {/* Error overlay — encima del área de pan */}
          {error && (
            <div className="absolute inset-0 flex items-start justify-center p-8 pointer-events-none">
              <div className="pointer-events-auto max-w-xl w-full">
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                  <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-red-700 mb-1">Error de sintaxis Mermaid</p>
                    <pre className="text-xs text-red-600 whitespace-pre-wrap break-all font-mono bg-red-100 rounded p-2 mt-1">
                      {error}
                    </pre>
                    {!editMode && (
                      <p className="text-xs text-red-500 mt-2">
                        Abre el <button onClick={() => setEditMode(true)}
                          className="underline hover:text-red-700 cursor-pointer">editor</button> para corregir la sintaxis.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hint de controles — solo cuando no hay error y no se está editando */}
          {!error && !editMode && (
            <div className="absolute bottom-3 right-3 text-xs text-slate-300 flex items-center gap-1.5 pointer-events-none select-none">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3"/>
              </svg>
              Arrastrar para mover · Scroll para zoom
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
