import { useRef } from 'react'

interface Props {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function FileUploader({ onFileChange }: Props) {
  const singleRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)

  return (
    <div className="p-3 border-b border-slate-700 space-y-2">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">
        Cargar archivos
      </p>

      {/* Cargar archivo individual */}
      <button
        onClick={() => singleRef.current?.click()}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
        </svg>
        Cargar archivo(s) .mmd
      </button>

      {/* Cargar carpeta completa */}
      <button
        onClick={() => folderRef.current?.click()}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
        Cargar carpeta
      </button>

      {/* Inputs ocultos */}
      <input
        ref={singleRef}
        type="file"
        accept=".mmd"
        multiple
        onChange={onFileChange}
        className="hidden"
      />
      <input
        ref={folderRef}
        type="file"
        accept=".mmd"
        multiple
        // @ts-expect-error webkitdirectory no está en tipos estándar
        webkitdirectory=""
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  )
}
