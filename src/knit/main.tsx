import { CssBaseline, ThemeProvider } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { knitTheme } from '../theme'
import KnitApp from './KnitApp'
import '../App.css'

// Knit Patterner's teal version of the shared design colours (App.css).
document.documentElement.classList.add('knit')

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={knitTheme} defaultMode="system">
      <CssBaseline />
      <KnitApp />
    </ThemeProvider>
  </StrictMode>,
)
