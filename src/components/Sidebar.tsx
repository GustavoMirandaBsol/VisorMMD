import { useState } from 'react'
import type { DiagramFile } from '../types'
import FileUploader from './FileUploader'

interface Props {
  diagrams: DiagramFile[]
  selected: DiagramFile | null
  onSelect: (diagram: DiagramFile) => void
  onRemove: (id: string) => void
  isLoadingDemo: boolean
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function Sidebar({
  diagrams,
  selected,
  onSelect,
  onRemove,
  isLoadingDemo,
  onFileChange,
}: Props) {
  const [query, setQuery] = useState('')

  const filtered = diagrams.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase())
  )

  const displayName = (name: string) =>
    name.replace(/\.mmd$/i, '').replace(/[-_]/g, ' ')

  return (
    <aside className="w-72 shrink-0 flex flex-col h-full bg-slate-900 border-r border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <span className="text-white font-semibold text-sm">Visor MMD</span>
        </div>
        <p className="text-slate-400 text-xs">
          {diagrams.length} diagrama{diagrams.length !== 1 ? 's' : ''} cargado{diagrams.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Uploader */}
      <FileUploader onFileChange={onFileChange} />

      {/* Buscador */}
      <div className="p-3 border-b border-slate-700">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar diagrama..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-800 text-slate-200 text-sm rounded-md pl-8 pr-3 py-2 placeholder-slate-500 border border-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Lista de archivos */}
      <nav className="flex-1 overflow-y-auto py-2">
        {isLoadingDemo && (
          <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Cargando demos...
          </div>
        )}

        {!isLoadingDemo && filtered.length === 0 && (
          <div className="py-8 px-4 text-center text-slate-500 text-sm">
            {query ? 'Sin resultados para esta búsqueda.' : 'Carga un archivo .mmd para comenzar.'}
          </div>
        )}

        {filtered.map((diagram) => {
          const isActive = selected?.id === diagram.id
          return (
            <div
              key={diagram.id}
              className={`group flex items-center gap-2 mx-2 mb-0.5 rounded-md cursor-pointer transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <button
                onClick={() => onSelect(diagram)}
                className="flex-1 flex items-center gap-2 px-3 py-2 text-left min-w-0"
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-200' : 'text-slate-500 group-hover:text-slate-300'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="truncate text-sm font-medium leading-tight">
                  {displayName(diagram.name)}
                </span>
                {diagram.source === 'upload' && (
                  <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                    isActive ? 'bg-yellow-500 text-yellow-950' : 'bg-yellow-900 text-yellow-400'
                  }`} title="Guardando en manifest.json...">
                    ↑
                  </span>
                )}
              </button>

              {/* Botón eliminar — solo visible al hover */}
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(diagram.id) }}
                title="Eliminar"
                className={`mr-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  isActive
                    ? 'hover:bg-blue-500 text-blue-200'
                    : 'hover:bg-slate-700 text-slate-500 hover:text-slate-300'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700 text-xs text-slate-500 text-center">
        Soporta archivos <code className="text-slate-400">.mmd</code> · Mermaid v10
      </div>
    </aside>
  )
}
