import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import App from './App.tsx'
import './App.css'

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: { palette: { primary: { main: '#8b0a0a' } } },
    dark: { palette: { primary: { main: '#ef9a9a' } } },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
