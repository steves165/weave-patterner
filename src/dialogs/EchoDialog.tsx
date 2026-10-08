import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { echoDraft, parseTwill } from '../echo'
import { usePhone } from '../layout'
import { parseSequence } from '../tools'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

const COLOR_FIELDS = [
  ['colorA', 'Warp colour A'],
  ['colorB', 'Warp colour B'],
  ['weft', 'Weft'],
] as const

/** Echo weave: a design line threaded with its echo, in two contrasting warp colours. */
export function EchoDialog({ open, onClose, onApply }: Props) {
  const phone = usePhone()
  const [shafts, setShafts] = useState('8')
  const [base, setBase] = useState('1-8 7-2')
  const [shift, setShift] = useState('4')
  const [tieup, setTieup] = useState('3/1/1/3')
  const [colors, setColors] = useState({ colorA: '#b71c1c', colorB: '#1a237e', weft: '#212121' })

  const result = useMemo(() => {
    try {
      return {
        draft: echoDraft({
          base: parseSequence(base),
          shafts: Number(shafts),
          shift: Number(shift),
          tieup: parseTwill(tieup),
          ...colors,
        }),
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [base, shafts, shift, tieup, colors])

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle>Echo weave</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            The design line is threaded alongside a copy of itself a few shafts along, one end of each in turn, in two
            contrasting colours. Set the warp about twice as close as usual. Treadled as the design line is drawn in.
          </Typography>
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              type="number"
              label="Shafts"
              value={shafts}
              onChange={(e) => setShafts(e.target.value)}
              sx={{ width: 100 }}
            />
            <TextField
              size="small"
              type="number"
              label="Echo shift (shafts)"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              helperText="Not 1 or one less than the shafts"
              sx={{ width: 170 }}
            />
            <TextField
              size="small"
              label="Tie-up (up/down)"
              value={tieup}
              onChange={(e) => setTieup(e.target.value)}
              helperText="Adds up to the shafts"
              sx={{ width: 150 }}
            />
          </Stack>
          <TextField
            size="small"
            label="Design line"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            helperText="Shafts in order, e.g. 1-8 7-2 for a point, or a network draw"
          />
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
            {COLOR_FIELDS.map(([key, label]) => (
              <Stack key={key} direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                <input
                  type="color"
                  className="picker"
                  aria-label={label}
                  value={colors[key]}
                  onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                />
                <Typography variant="body2">{label}</Typography>
              </Stack>
            ))}
          </Stack>
          {result.draft && (
            <Typography data-testid="echo-result">
              Makes {result.draft.shafts} shafts, {result.draft.ends} ends × {result.draft.picks} picks
            </Typography>
          )}
          {result.error && <Alert severity="warning">{result.error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!result.draft}
          onClick={() => result.draft && onApply(result.draft, 'Echo weave (replaces the draft)')}
        >
          Create draft
        </Button>
      </DialogActions>
    </Dialog>
  )
}
