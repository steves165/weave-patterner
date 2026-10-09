import { CssBaseline } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { SeasonalTheme } from './SeasonalTheme'
import { WEAVE } from './theme'
import './App.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <SeasonalTheme app="Weave Patterner" base={WEAVE}>
      <CssBaseline />
      <App />
    </SeasonalTheme>
  </StrictMode>,
)
