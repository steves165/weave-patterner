import ReplayIcon from '@mui/icons-material/Replay'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import { Box, Button, Chip, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import type { Draft } from '../weave'
import { endInfo, heddleCounts, loadThreadProgress, saveThreadProgress } from '../weaving'

interface Props {
  name: string
  draft: Draft
}

/** How many upcoming ends to list: threaders usually work in small groups. */
const LOOKAHEAD = 8

/**
 * End-by-end threading guide: which shaft each end goes on (and which heddle on that shaft), in its colour, from
 * either side of the loom. Arrow keys, Space and page-turner pedals step through; progress is remembered.
 */
export function ThreadingSteps({ name, draft }: Props) {
  const { ends, shafts } = draft
  const [step, setStep] = useState(() => loadThreadProgress(name, ends))
  const [fromRight, setFromRight] = useState(false)
  const [goTo, setGoTo] = useState('')
  // Step i is end i counting from the side the threader starts.
  const endAt = (i: number) => (fromRight ? ends - 1 - i : i)

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(ends - 1, next))
    saveThreadProgress(name, clamped)
    setStep(clamped)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault()
        go(step + 1)
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        go(step - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const end = endAt(Math.min(step, ends - 1))
  const info = endInfo(draft, end)
  const colourChanges = step > 0 && draft.warpColors[endAt(step - 1)] !== info.color
  const last = step >= ends - 1
  const upcoming = Array.from({ length: LOOKAHEAD }, (_, i) => step + 1 + i)
    .filter((i) => i < ends)
    .map((i) => ({ end: endAt(i), ...endInfo(draft, endAt(i)) }))
  const heddles = heddleCounts(draft)

  return (
    <>
      <Stack sx={{ flexGrow: 1, alignItems: 'center', gap: 3, p: { xs: 2, sm: 4 }, overflow: 'auto' }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={fromRight ? 'right' : 'left'}
          onChange={(_, v) => {
            if (!v) return
            setFromRight(v === 'right')
            go(0)
          }}
          aria-label="Thread from"
        >
          <ToggleButton value="left">From end 1</ToggleButton>
          <ToggleButton value="right">From end {ends}</ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ textAlign: 'center' }} aria-live="polite">
          <Typography variant="h3" component="p" data-testid="end-number">
            End {end + 1}{' '}
            <Typography component="span" variant="h5" color="text.secondary">
              ({step + 1} of {ends})
            </Typography>
          </Typography>
          <Typography variant="h5" sx={{ mt: 1 }} data-testid="thread-instruction">
            {info.shaft === null
              ? 'Leave empty: no heddle for this end'
              : `Shaft ${info.shaft}, heddle ${info.heddle} of ${heddles[info.shaft - 1]}`}
          </Typography>
        </Box>

        <Stack
          direction="row"
          sx={{ gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}
          role="list"
          aria-label="Shafts"
        >
          {Array.from({ length: shafts }, (_, i) => i + 1).map((n) => {
            const on = info.shaft === n
            return (
              <Box
                key={n}
                role="listitem"
                aria-label={`shaft ${n}${on ? ', use' : ''}`}
                data-on={on}
                sx={{
                  width: { xs: 44, sm: 64 },
                  height: { xs: 44, sm: 56 },
                  borderRadius: 2,
                  border: 2,
                  borderColor: on ? 'primary.main' : 'divider',
                  bgcolor: on ? 'primary.main' : 'transparent',
                  color: on ? 'primary.contrastText' : 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: { xs: '1.1rem', sm: '1.5rem' },
                  fontWeight: on ? 700 : 400,
                }}
              >
                {n}
              </Box>
            )
          })}
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{ width: 40, height: 40, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: info.color }}
            aria-hidden
          />
          <Typography data-testid="warp-colour">Warp {info.color}</Typography>
          {colourChanges && <Chip color="warning" label="Colour changes" data-testid="warp-change" />}
        </Stack>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Coming up
          </Typography>
          <Stack
            direction="row"
            sx={{ gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}
            data-testid="upcoming-ends"
          >
            {upcoming.map((u) => (
              <Stack key={u.end} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {u.end + 1}
                </Typography>
                <Typography>{u.shaft ?? '–'}</Typography>
                <Box sx={{ width: 6, height: 16, bgcolor: u.color, border: 1, borderColor: 'divider' }} />
              </Stack>
            ))}
            {upcoming.length === 0 && <Typography>That's the last end</Typography>}
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" data-testid="heddles">
          Heddles needed: {heddles.map((n, s) => `shaft ${s + 1}: ${n}`).join(', ')}
        </Typography>

        <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <TextField
            size="small"
            label="Go to end"
            type="number"
            value={goTo}
            onChange={(e) => setGoTo(e.target.value)}
            onKeyDown={(e) => {
              const n = Number(goTo)
              if (e.key === 'Enter' && Number.isInteger(n) && n >= 1 && n <= ends) {
                // The end number, whichever side threading started from.
                go(fromRight ? ends - n : n - 1)
                setGoTo('')
              }
            }}
            slotProps={{ htmlInput: { min: 1, max: ends } }}
            sx={{ width: 120 }}
          />
          <Button startIcon={<ReplayIcon />} onClick={() => go(0)}>
            Start over
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" sx={{ gap: 1, p: 1, pb: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}>
        <Button
          variant="outlined"
          size="large"
          startIcon={<SkipPreviousIcon />}
          onClick={() => go(step - 1)}
          disabled={step === 0}
          sx={{ flex: 1, py: 2 }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          endIcon={<SkipNextIcon />}
          onClick={() => go(step + 1)}
          disabled={last}
          sx={{ flex: 2, py: 2 }}
        >
          {last ? 'All threaded' : 'Next end'}
        </Button>
      </Stack>
    </>
  )
}
