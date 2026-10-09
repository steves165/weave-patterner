import CheckIcon from '@mui/icons-material/Check'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { Miss } from '../selvedge'
import { MONO_FONT } from '../theme'
import { FooterLinks } from './FooterLinks'

interface Props {
  draft: { picks: number }
  floats: { warp: number; weft: number }
  floatLimit: number
  /** Threads that never interlace (0-based). */
  unwoven: { ends: number[]; picks: number[] }
  /** Turns where the weft won't catch the edge end (shuttle starting from the left). */
  selvedge: Miss[]
  /** Shown when analytics is set up: lets visitors change their analytics choice. */
  onAnalytics?: () => void
  /** Opens the help. */
  onHelp?: () => void
  /** Phone: leaves the links out (they're in the settings sheet). */
  phone: boolean
  /** Stays in view at the bottom of the screen (wide screens; narrow ones have the settings bar there). */
  sticky: boolean
  /** The window's width, when the page can scroll sideways: the bar stays that wide and in view. */
  width?: number
}

/** "1, 5, 9 and 3 more" style list of 0-based thread indices, numbered from 1. */
const listThreads = (indices: number[], max = 6) =>
  indices.length > max
    ? `${indices
        .slice(0, max)
        .map((i) => i + 1)
        .join(', ')} and ${indices.length - max} more`
    : indices.map((i) => i + 1).join(', ')

/** A warning pill: amber, with an icon. */
export function Warning({ children, testId }: { children: ReactNode; testId: string }) {
  return (
    <Stack
      direction="row"
      className="wp-enter"
      data-testid={testId}
      sx={{
        gap: 1,
        alignItems: 'center',
        px: 1.25,
        py: 0.5,
        borderRadius: 3,
        bgcolor: 'var(--wp-warn-bg)',
        color: 'var(--wp-warn-fg)',
        fontSize: 13,
      }}
    >
      <WarningAmberIcon sx={{ fontSize: 16, flex: 'none' }} />
      <span>{children}</span>
    </Stack>
  )
}

/**
 * The bar along the bottom of an app: what it reports, then (except on phones) the links, pushed to the right.
 */
export function StatusFrame(p: {
  /** Stays in view at the bottom of the screen (wide screens; narrow ones have the settings bar there). */
  sticky: boolean
  /** The window's width, when the page can scroll sideways: the bar stays that wide and in view. */
  width?: number
  /** The links at the right; left out on phones, where they're in the settings sheet. */
  links?: ReactNode
  /** The help topic F1 opens here. */
  help?: string
  children: ReactNode
}) {
  return (
    <Box
      component="footer"
      data-help={p.help ?? 'checks'}
      sx={{
        position: p.sticky ? 'sticky' : 'static',
        bottom: 0,
        left: 0,
        width: p.width,
        zIndex: 5,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px 20px',
        px: { xs: 1.75, sm: 2.5 },
        py: 1,
        minHeight: 40,
        boxSizing: 'border-box',
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        fontSize: 13,
        color: 'var(--wp-body)',
      }}
    >
      {p.children}
      {p.links && (
        <>
          <Box sx={{ flex: '1 1 0px' }} />
          <Stack
            component="nav"
            aria-label="More"
            direction="row"
            sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
          >
            {p.links}
          </Stack>
        </>
      )}
    </Box>
  )
}

/**
 * The bar along the bottom of the editor: the longest floats, threads that never weave in, and whether the weft
 * catches the edge ends, then the links.
 */
export function StatusBar(p: Props) {
  const longest = Math.max(p.floats.warp, p.floats.weft)
  const num = { fontFamily: MONO_FONT, fontWeight: 500, color: 'text.primary' }
  return (
    <StatusFrame
      sticky={p.sticky}
      width={p.width}
      links={
        !p.phone && (
          <FooterLinks
            other={{ href: './knit/', label: 'Knit Patterner' }}
            onAnalytics={p.onAnalytics}
            onHelp={p.onHelp}
          />
        )
      }
    >
      <Typography
        component="span"
        sx={{ fontSize: 13, color: longest > p.floatLimit ? 'warning.main' : 'inherit' }}
        data-testid="float-stats"
      >
        Longest floats: warp{' '}
        <Box component="span" sx={num}>
          {p.floats.warp}
        </Box>
        , weft{' '}
        <Box component="span" sx={num}>
          {p.floats.weft}
        </Box>
      </Typography>
      {(p.unwoven.ends.length > 0 || p.unwoven.picks.length > 0) && (
        <Warning testId="unwoven">
          Not woven in:{' '}
          {[
            p.unwoven.ends.length > 0 &&
              `${p.unwoven.ends.length === 1 ? 'end' : 'ends'} ${listThreads(p.unwoven.ends)}`,
            p.unwoven.picks.length > 0 &&
              `${p.unwoven.picks.length === 1 ? 'pick' : 'picks'} ${listThreads(p.unwoven.picks)}`,
          ]
            .filter(Boolean)
            .join('; ')}{' '}
          (they never cross over and under)
        </Warning>
      )}
      {p.selvedge.length > 0 ? (
        <Warning testId="selvedge">
          Edges: the weft won't catch the edge end at {p.selvedge.length} of {Math.max(1, p.draft.picks - 1)} turns
          (first after pick {p.selvedge[0].pick}, {p.selvedge[0].side} edge). Use a floating selvedge, or change the
          edge threading.
        </Warning>
      ) : (
        <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', color: 'var(--wp-ok)' }} data-testid="edges-ok">
          <CheckIcon sx={{ fontSize: 16 }} />
          Edges catch on every turn
        </Stack>
      )}
    </StatusFrame>
  )
}
