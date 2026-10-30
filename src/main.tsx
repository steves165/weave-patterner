import { CssBaseline } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SeasonalTheme } from './SeasonalTheme'
import { swipeMenusToClose } from './swipeClose'
import { WEAVE } from './theme'
import './App.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')
swipeMenusToClose()

createRoot(root).render(
  <StrictMode>
    <SeasonalTheme app="Weave Patterner" base={WEAVE}>
      <CssBaseline />
      <ErrorBoundary whole>
        <App />
      </ErrorBoundary>
    </SeasonalTheme>
  </StrictMode>,
)
