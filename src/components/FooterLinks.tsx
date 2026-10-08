import GitHubIcon from '@mui/icons-material/GitHub'
import { Link } from '@mui/material'

interface Props {
  /** The sister app: Knit Patterner from Weave Patterner, and back. */
  other: { href: string; label: string }
  /** Shown when analytics is set up: lets visitors change their analytics choice. */
  onAnalytics?: () => void
  fontSize?: number
}

/** The links at the foot of the app: the other app, the analytics choice and the source code. */
export function FooterLinks({ other, onAnalytics, fontSize = 13 }: Props) {
  return (
    <>
      <Link href={other.href} sx={{ fontSize }}>
        {other.label}
      </Link>
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
