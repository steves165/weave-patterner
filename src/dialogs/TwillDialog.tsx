import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { DialogTitle } from '../components/DialogTitle'
import { PatternThumb } from '../components/PatternThumb'
import { parseTwill } from '../echo'
import { usePhone } from '../layout'
import { type TwillDraw, type TwillOptions, twillDraft, twillName } from '../twill'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  /** The draft is a lift plan, so there is no treadling of its own to keep. */
  liftplan: boolean
  /** How the draft is shown, so the preview's diagonal runs the same way. */
  orient: { endOneRight: boolean; pickOneBottom: boolean }
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

const DRAWS: { value: TwillDraw; label: string }[] = [
  { value: 'keep', label: 'Keep the current one' },
  { value: 'straight', label: 'Straight' },
  { value: 'point', label: 'Point' },
  { value: 'broken', label: 'Broken' },
  { value: 'asDrawn', label: 'As drawn in (tromp as writ)' },
]

/** Builds a twill from up/down counts, as WeavePoint's twill generator does, on the current draft's size. */
export function TwillDialog({ open, draft, liftplan, orient, onClose, onApply }: Props) {
  const phone = usePhone()
  const [counts, setCounts] = useState('2/2')
  const [step, setStep] = useState('1')
  const [direction, setDirection] = useState<TwillOptions['direction']>('Z')
  const [threading, setThreading] = useState<TwillOptions['threading']>('straight')
  const [treadling, setTreadling] = useState<TwillDraw>('straight')
  // A lift plan's picks name shafts, not treadles, so it has no treadling to keep.
  const tread = liftplan && treadling === 'keep' ? 'straight' : treadling

  const result = useMemo(() => {
    try {
      const o: TwillOptions = {
        counts: parseTwill(counts),
        step: Number(step),
        direction,
        threading,
        treadling: tread,
      }
      return { draft: twillDraft(draft, o), name: twillName(o) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [draft, counts, step, direction, threading, tread])

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle onClose={onClose}>Twill generator</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Write the twill as up/down counts: 2/2, 3/1, or 2/1/1/2 for a fancier line. The shafts are the counts added
            up. A step above 1 makes an advanced twill, the line jumping that many shafts each pick. The draft keeps its
            size and colours.
          </Typography>
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Twill (up/down)"
              value={counts}
              onChange={(e) => setCounts(e.target.value)}
              helperText="e.g. 2/2, 1/3, 3/1/1/3"
              sx={{ width: 160 }}
            />
            <TextField
              size="small"
              type="number"
              label="Step (shafts)"
              value={step}
              onChange={(e) => setStep(e.target.value)}
              helperText="1 for a plain twill"
              slotProps={{ htmlInput: { min: 1 } }}
              sx={{ width: 130 }}
            />
            <TextField
              select
              size="small"
              label="Direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value as TwillOptions['direction'])}
              helperText={direction === 'Z' ? 'Rises to the right' : 'Rises to the left'}
              sx={{ width: 140 }}
            >
              <MenuItem value="Z">Z twill</MenuItem>
              <MenuItem value="S">S twill</MenuItem>
            </TextField>
          </Stack>
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
            <TextField
              select
              size="small"
              label="Threading"
              value={threading}
              onChange={(e) => setThreading(e.target.value as TwillOptions['threading'])}
              sx={{ minWidth: 220 }}
            >
              {DRAWS.filter((d) => d.value !== 'asDrawn').map((d) => (
                <MenuItem key={d.value} value={d.value}>
                  {d.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Treadling"
              value={tread}
              onChange={(e) => setTreadling(e.target.value as TwillDraw)}
              sx={{ minWidth: 220 }}
            >
              {DRAWS.filter((d) => !(liftplan && d.value === 'keep')).map((d) => (
                <MenuItem key={d.value} value={d.value}>
                  {d.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          {result.draft && (
            <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
              <PatternThumb draft={result.draft} size={120} orient={orient} />
              <Typography data-testid="twill-result">
                {result.name}: {result.draft.shafts} shafts, {result.draft.ends} ends × {result.draft.picks} picks
              </Typography>
            </Stack>
          )}
          {result.error && <Alert severity="warning">{result.error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!result.draft}
          onClick={() => result.draft && onApply(result.draft, `Made a ${result.name}`)}
        >
          Use this twill
        </Button>
      </DialogActions>
    </Dialog>
  )
}
