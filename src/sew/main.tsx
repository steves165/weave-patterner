import { CssBaseline } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SeasonalTheme } from '../SeasonalTheme'
import { SEW } from '../theme'
import SewApp from './SewApp'
import '../App.css'
import './sew.css'

// Sew Patterner's indigo version of the shared design colours (App.css).
document.documentElement.classList.add('sew')

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <SeasonalTheme app="Sew Patterner" base={SEW}>
      <CssBaseline />
      <SewApp />
    </SeasonalTheme>
  </StrictMode>,
)
