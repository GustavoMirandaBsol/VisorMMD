import React from 'react'
import ReactDOM from 'react-dom/client'
import mermaid from 'mermaid'
import App from './App'
import './index.css'

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 20,
    actorMargin: 80,
    boxTextMargin: 10,
    noteMargin: 10,
    messageMargin: 35,
    mirrorActors: true,
    useMaxWidth: true,
  },
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
