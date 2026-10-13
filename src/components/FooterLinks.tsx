import FavoriteIcon from '@mui/icons-material/FavoriteBorder'
import FeedbackIcon from '@mui/icons-material/FeedbackOutlined'
import GitHubIcon from '@mui/icons-material/GitHub'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import PaletteIcon from '@mui/icons-material/PaletteOutlined'
import { Link } from '@mui/material'
import { useState } from 'react'
import { DONATE_URL } from '../donate'
import { FEEDBACK_URL } from '../feedback'
import { DESKTOP, DESKTOP_DOWNLOAD } from '../platform'
import { ThemeDialog } from '../SeasonalTheme'
import { FeedbackDialog } from './FeedbackDialog'

interface Props {
  /** The sister apps: Knit and Sew Patterner from Weave Patterner, and so on. */
  others: { href: string; label: string }[]
  /** Shown when analytics is set up: lets visitors change their analytics choice. */
  onAnalytics?: () => void
  /** Opens the help (also F1). */
  onHelp?: () => void
  fontSize?: number
}

/**
 * The links at the foot of the app: help, the colour theme, feedback, the other app, the analytics choice, donating and
 * the source.
 */
export function FooterLinks({ others, onAnalytics, onHelp, fontSize = 13 }: Props) {
  const [theme, setTheme] = useState(false)
  const [feedback, setFeedback] = useState(false)
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
      {FEEDBACK_URL && (
        <>
          <Link
            component="button"
            onClick={() => setFeedback(true)}
            sx={{ fontSize, display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}
          >
            <FeedbackIcon sx={{ fontSize: 16 }} />
            Feedback
          </Link>
          <FeedbackDialog open={feedback} onClose={() => setFeedback(false)} />
        </>
      )}
      <Link href="./guide/" sx={{ fontSize }}>
        Guides
      </Link>
      {others.map((o) => (
        <Link key={o.href} href={o.href} sx={{ fontSize }}>
          {o.label}
        </Link>
      ))}
      {!DESKTOP && (
        <Link
          href={DESKTOP_DOWNLOAD}
          target="_blank"
          rel="noopener noreferrer"
          title="Download Weave, Knit and Sew Patterner for Windows, macOS or Linux (opens in a new tab)"
          sx={{ fontSize }}
        >
          Desktop app
        </Link>
      )}
      {onAnalytics && (
        <Link component="button" onClick={onAnalytics} sx={{ fontSize }}>
          Analytics
        </Link>
      )}
      {DONATE_URL && (
        <Link
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Support the Patterner apps with a donation through PayPal (opens in a new tab)"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize, fontWeight: 600 }}
        >
          <FavoriteIcon sx={{ fontSize: 16 }} />
          Donate
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
