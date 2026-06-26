import Sidebar from './components/Sidebar'
import DiagramViewer from './components/DiagramViewer'
import { useDiagrams } from './hooks/useDiagrams'

export default function App() {
  const {
    diagrams,
    selected,
    setSelected,
    isLoadingDemo,
    handleFileInputChange,
    removeFile,
    updateDiagram,
  } = useDiagrams()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900">
      <Sidebar
        diagrams={diagrams}
        selected={selected}
        onSelect={setSelected}
        onRemove={removeFile}
        isLoadingDemo={isLoadingDemo}
        onFileChange={handleFileInputChange}
      />
      <DiagramViewer diagram={selected} onSave={updateDiagram} />
    </div>
  )
}
