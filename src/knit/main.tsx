import { CssBaseline, createTheme, ThemeProvider } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import KnitApp from './KnitApp'
import '../App.css'

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: { palette: { primary: { main: '#00695c' } } },
    dark: { palette: { primary: { main: '#80cbc4' } } },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <KnitApp />
    </ThemeProvider>
  </StrictMode>,
)
