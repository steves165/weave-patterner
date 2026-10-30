import { CssBaseline } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { SeasonalTheme } from '../SeasonalTheme'
import { swipeMenusToClose } from '../swipeClose'
import { KNIT } from '../theme'
import KnitApp from './KnitApp'
import '../App.css'

// Knit Patterner's teal version of the shared design colours (App.css).
document.documentElement.classList.add('knit')

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')
swipeMenusToClose()

createRoot(root).render(
  <StrictMode>
    <SeasonalTheme app="Knit Patterner" base={KNIT}>
      <CssBaseline />
      <ErrorBoundary whole>
        <KnitApp />
      </ErrorBoundary>
    </SeasonalTheme>
  </StrictMode>,
)
