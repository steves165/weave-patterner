import GitHubIcon from '@mui/icons-material/GitHub'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import PaletteIcon from '@mui/icons-material/PaletteOutlined'
import { Link } from '@mui/material'
import { useState } from 'react'
import { ThemeDialog } from '../SeasonalTheme'

interface Props {
  /** The sister apps: Knit and Sew Patterner from Weave Patterner, and so on. */
  others: { href: string; label: string }[]
  /** Shown when analytics is set up: lets visitors change their analytics choice. */
  onAnalytics?: () => void
  /** Opens the help (also F1). */
  onHelp?: () => void
  fontSize?: number
}

/** The links at the foot of the app: help, the colour theme, the other app, the analytics choice and the source. */
export function FooterLinks({ others, onAnalytics, onHelp, fontSize = 13 }: Props) {
  const [theme, setTheme] = useState(false)
  return (
    <>
      {onHelp && (
        <Link
          component="button"
          onClick={onHelp}
          data-tour="help"
          title="Help (F1)"
          sx={{ fontSize, display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}
        >
          <HelpOutlineIcon sx={{ fontSize: 16 }} />
          Help
        </Link>
      )}
      <Link
        component="button"
        onClick={() => setTheme(true)}
        data-tour="theme"
        sx={{ fontSize, display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}
      >
        <PaletteIcon sx={{ fontSize: 16 }} />
        Theme
      </Link>
      <ThemeDialog open={theme} onClose={() => setTheme(false)} />
      <Link href="./guide/" sx={{ fontSize }}>
        Guides
      </Link>
      {others.map((o) => (
        <Link key={o.href} href={o.href} sx={{ fontSize }}>
          {o.label}
        </Link>
      ))}
      {onAnalytics && (
        <Link component="button" onClick={onAnalytics} sx={{ fontSize }}>
          Analytics
        </Link>
      )}
      <Link
        href="https://github.com/steves165/weave-patterner"
        target="_blank"
        rel="noopener noreferrer"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize }}
      >
        <GitHubIcon sx={{ fontSize: 16 }} />
        Made by steves165
      </Link>
    </>
  )
}
