import CheckIcon from '@mui/icons-material/Check'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Box, ButtonBase, Stack, Typography } from '@mui/material'
import { type ReactNode, useState } from 'react'
import { type Fix, floatFixes, selvedgeFixes, unwovenFixes } from '../fixes'
import type { Miss } from '../selvedge'
import { MONO_FONT } from '../theme'
import type { ViewOptions } from '../viewOptions'
import type { Draft } from '../weave'
import { FixDialog } from './FixDialog'
import { FooterLinks } from './FooterLinks'

interface Props {
  draft: Draft
  floats: { warp: number; weft: number }
  floatLimit: number
  /** Threads that never interlace (0-based). */
  unwoven: { ends: number[]; picks: number[] }
  /** Turns where the weft won't catch the edge end (shuttle starting from `view.shuttleStart`). */
  selvedge: Miss[]
  view: Pick<ViewOptions, 'highlightFloats' | 'floatingSelvedge' | 'shuttleStart'>
  /** Applies a suggested fix. */
  onFix: (fix: Fix) => void
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

/** A warning pill: amber, with an icon; a button that opens its fixes when it has some. */
export function Warning({ children, testId, onClick }: { children: ReactNode; testId: string; onClick?: () => void }) {
  const sx = {
    gap: 1,
    alignItems: 'center',
    px: 1.25,
    py: 0.5,
    borderRadius: 3,
    bgcolor: 'var(--wp-warn-bg)',
    color: 'var(--wp-warn-fg)',
    fontSize: 13,
    display: 'flex',
    textAlign: 'left',
  } as const
  if (onClick)
    return (
      <ButtonBase
        className="wp-enter"
        data-testid={testId}
        aria-haspopup="dialog"
        onClick={onClick}
        sx={{ ...sx, fontFamily: 'inherit', '&:hover': { filter: 'brightness(0.96)' } }}
      >
        <WarningAmberIcon sx={{ fontSize: 16, flex: 'none' }} />
        <span>{children} </span>
        <Box component="span" sx={{ fontWeight: 700, textDecoration: 'underline', flex: 'none' }}>
          Fix…
        </Box>
      </ButtonBase>
    )
  return (
    <Stack direction="row" className="wp-enter" data-testid={testId} sx={sx}>
      <WarningAmberIcon sx={{ fontSize: 16, flex: 'none' }} />
      <span>{children}</span>
    </Stack>
  )
}

type Problem = 'unwoven' | 'selvedge' | 'floats'

const TURN_OFF_FLOATING: Fix = {
  id: 'no-floating-selvedge',
  title: 'Stop using floating selvedges',
  detail: 'Checks again that the weft catches the edge ends at every turn.',
  view: { floatingSelvedge: false },
  resolves: true,
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
  /** A short summary of the checks, read out by screen readers when it changes. */
  announce: string
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
      <span className="sr-only" role="status">
        {p.announce}
      </span>
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
  const [open, setOpen] = useState<Problem | null>(null)
  const longest = Math.max(p.floats.warp, p.floats.weft)
  const turns = Math.max(1, p.draft.picks - 1)
  const dialogs: Record<Problem, { title: string; explain: ReactNode; advice?: string[]; fixes: () => Fix[] }> = {
    unwoven: {
      title: 'Threads not woven in',
      explain:
        'An end that stays up (or down) on every pick, or a pick that passes over (or under) every end, never crosses the other threads: it would lie loose on the cloth or fall out. Usually a shaft isn’t tied to any treadle, is tied to them all, or a pick’s treadle lifts every shaft.',
      advice: [
        'Check the tie-up: every shaft should be tied to some treadles but not all of them.',
        'Rethread the end onto another shaft, or change the pick’s treadle.',
      ],
      fixes: () => unwovenFixes(p.draft),
    },
    selvedge: p.view.floatingSelvedge
      ? {
          title: 'Floating selvedges',
          explain:
            'You’re weaving with floating selvedges: an extra end at each edge, through the reed but not a heddle. Take the shuttle over it going in and under it coming out, and the weft catches it every time, so the edges aren’t checked.',
          fixes: () => [TURN_OFF_FLOATING],
        }
      : {
          title: 'Edges the weft doesn’t catch',
          explain: (
            <>
              Each time the shuttle turns, the weft should wrap round the outermost end. When that end is up (or down)
              for the picks on both sides of the turn, the weft slides past it and the edge end isn’t woven in. Here it
              misses {p.selvedge.length} of {turns} turns, starting from the {p.view.shuttleStart}
              {p.selvedge[0] ? `, first after pick ${p.selvedge[0].pick} at the ${p.selvedge[0].side} edge` : ''}.
            </>
          ),
          advice: [
            'Use a floating selvedge at each edge.',
            'Thread the edge ends so they change between up and down at every turn.',
          ],
          fixes: () => selvedgeFixes(p.draft, p.view.shuttleStart),
        },
    floats: {
      title: 'Long floats',
      explain: `A float is a thread passing over several others without weaving in. Long ones snag and make the cloth loose. The longest here are ${p.floats.warp} in the warp and ${p.floats.weft} in the weft, over your limit of ${p.floatLimit}.`,
      advice: [
        'Add a tie-down: tie the shaft with the long warp float to one more treadle, or the long weft float’s treadle to one more shaft.',
        'Use a shorter threading or treadling repeat, or a tie-up with smaller blocks.',
        'For overshot and other pattern weaves, weave a tabby pick between pattern picks.',
      ],
      fixes: () => floatFixes(p.draft, p.floatLimit, p.view.highlightFloats),
    },
  }
  const current = open ? dialogs[open] : null
  const num = { fontFamily: MONO_FONT, fontWeight: 500, color: 'text.primary' }
  const unwoven = p.unwoven.ends.length + p.unwoven.picks.length
  const announce =
    [
      unwoven > 0 && `${unwoven} ${unwoven === 1 ? 'thread is' : 'threads are'} not woven in`,
      !p.view.floatingSelvedge &&
        p.selvedge.length > 0 &&
        `the weft won't catch the edge at ${p.selvedge.length} turns`,
      longest > p.floatLimit && `floats up to ${longest} long`,
    ]
      .filter(Boolean)
      .join('; ') || 'Edges catch on every turn and every thread is woven in'
  return (
    <StatusFrame
      announce={announce}
      sticky={p.sticky}
      width={p.width}
      links={
        !p.phone && (
          <FooterLinks
            others={[
              { href: './knit/', label: 'Knit Patterner' },
              { href: './sew/', label: 'Sew Patterner' },
            ]}
            onAnalytics={p.onAnalytics}
            onHelp={p.onHelp}
          />
        )
      }
    >
      {longest > p.floatLimit ? (
        <Warning testId="long-floats" onClick={() => setOpen('floats')}>
          <span data-testid="float-stats">
            Longest floats: warp{' '}
            <Box component="span" sx={{ ...num, color: 'inherit' }}>
              {p.floats.warp}
            </Box>
            , weft{' '}
            <Box component="span" sx={{ ...num, color: 'inherit' }}>
              {p.floats.weft}
            </Box>
          </span>{' '}
          (over {p.floatLimit})
        </Warning>
      ) : (
        <Typography component="span" sx={{ fontSize: 13 }} data-testid="float-stats">
          Longest floats: warp{' '}
          <Box component="span" sx={num}>
            {p.floats.warp}
          </Box>
          , weft{' '}
          <Box component="span" sx={num}>
            {p.floats.weft}
          </Box>
        </Typography>
      )}
      {(p.unwoven.ends.length > 0 || p.unwoven.picks.length > 0) && (
        <Warning testId="unwoven" onClick={() => setOpen('unwoven')}>
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
      {p.view.floatingSelvedge ? (
        <ButtonBase
          aria-haspopup="dialog"
          onClick={() => setOpen('selvedge')}
          data-testid="floating-selvedge"
          sx={{
            gap: 0.75,
            alignItems: 'center',
            color: 'var(--wp-ok)',
            fontSize: 13,
            fontFamily: 'inherit',
            borderRadius: 2,
            px: 0.5,
          }}
        >
          <CheckIcon sx={{ fontSize: 16 }} />
          Floating selvedges at both edges
        </ButtonBase>
      ) : p.selvedge.length > 0 ? (
        <Warning testId="selvedge" onClick={() => setOpen('selvedge')}>
          Edges: the weft won't catch the edge end at {p.selvedge.length} of {turns} turns (first after pick{' '}
          {p.selvedge[0].pick}, {p.selvedge[0].side} edge).
        </Warning>
      ) : (
        <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', color: 'var(--wp-ok)' }} data-testid="edges-ok">
          <CheckIcon sx={{ fontSize: 16 }} />
          Edges catch on every turn
        </Stack>
      )}
      {current && (
        <FixDialog
          open
          title={current.title}
          explain={current.explain}
          advice={current.advice}
          fixes={current.fixes()}
          onApply={(f) => {
            setOpen(null)
            p.onFix(f)
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </StatusFrame>
  )
}
