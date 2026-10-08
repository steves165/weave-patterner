import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { usePhone } from '../layout'
import { network, parallel, patternLine } from '../network'
import {
  advancing,
  applyRangeOp,
  type Clip,
  copyRange,
  parseSequence,
  pasteClip,
  point,
  type RangeOp,
  straight,
  type Target,
} from '../tools'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  onClose: () => void
  /** Called with the changed draft and a short description of what was done. */
  onApply: (draft: Draft, message: string) => void
  /** Copied ends or picks, kept by the app so they can be pasted again later. */
  clip: Clip | null
  onCopy: (clip: Clip) => void
}

type Generator = 'straight' | 'point' | 'advancing' | 'network' | 'parallel' | 'custom'

const NUMBER_FIELD = { size: 'small' as const, type: 'number', sx: { width: 96 } }

/** Fill, repeat, mirror, reverse, insert and delete runs of ends (threading) or picks (treadling). */
export function ToolsDialog({ open, draft, onClose, onApply, clip, onCopy }: Props) {
  const phone = usePhone()
  const [target, setTarget] = useState<Target>('threading')
  const length = target === 'threading' ? draft.ends : draft.picks
  const n = target === 'threading' ? draft.shafts : draft.treadles
  const [from, setFrom] = useState('1')
  const [to, setTo] = useState(String(length))
  const [generator, setGenerator] = useState<Generator>('point')
  const [run, setRun] = useState('4')
  const [advance, setAdvance] = useState('1')
  const [custom, setCustom] = useState('1 2 3 4 3 2')
  const [line, setLine] = useState('1 8 1')
  const [initial, setInitial] = useState('4')
  const [base, setBase] = useState('1-4')
  const [shift, setShift] = useState('4')
  const [times, setTimes] = useState('1')
  const [count, setCount] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const [pasteAt, setPasteAt] = useState('1')
  const [pasteColors, setPasteColors] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setCopied(null)
    setFrom('1')
    setTo(String(target === 'threading' ? draft.ends : draft.picks))
  }, [open, target, draft.ends, draft.picks])

  const unit = target === 'threading' ? 'end' : 'pick'
  const sequence = (): number[] => {
    switch (generator) {
      case 'straight':
        return straight(n)
      case 'point':
        return point(n)
      case 'advancing':
        return advancing(n, Number(run), Number(advance))
      case 'network':
        // One value per end of the range: the pattern line stretched over it.
        return network(patternLine(parseSequence(line), Math.max(1, Number(to) - Number(from) + 1)), n, Number(initial))
      case 'parallel':
        return parallel(parseSequence(base), n, Number(shift))
      case 'custom':
        return parseSequence(custom)
    }
  }
  let preview = ''
  try {
    const seq = sequence()
    preview = seq.slice(0, 24).join(' ') + (seq.length > 24 ? ' …' : '')
  } catch (e) {
    preview = e instanceof Error ? e.message : String(e)
  }

  const apply = (op: RangeOp, describe: string) => {
    try {
      const a = Number(from)
      const b = op.kind === 'insert' ? a : Number(to)
      onApply(applyRangeOp(draft, target, a, b, op), describe)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  const positiveInt = (v: string, label: string) => {
    const x = Number(v)
    if (!Number.isInteger(x) || x < 1) throw new Error(`${label} must be a whole number of at least 1`)
    return x
  }
  const guarded = (fn: () => void) => () => {
    setError(null)
    try {
      fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  const range = `${unit}s ${from}–${to}`

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle>Sequence tools</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={target}
            onChange={(_, v) => v && setTarget(v)}
            aria-label="Work on"
          >
            <ToggleButton value="threading">Threading (ends)</ToggleButton>
            <ToggleButton value="treadling">Treadling (picks)</ToggleButton>
          </ToggleButtonGroup>

          <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField {...NUMBER_FIELD} label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
            <TextField {...NUMBER_FIELD} label="To" value={to} onChange={(e) => setTo(e.target.value)} />
            <Typography variant="body2" color="text.secondary">
              of {length} {unit}s
            </Typography>
          </Stack>

          <Divider textAlign="left">Fill the range</Divider>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Pattern"
              value={generator}
              onChange={(e) => setGenerator(e.target.value as Generator)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="straight">Straight draw</MenuItem>
              <MenuItem value="point">Point draw</MenuItem>
              <MenuItem value="advancing">Advancing twill</MenuItem>
              <MenuItem value="network">Network (pattern line)</MenuItem>
              <MenuItem value="parallel">Parallel threading</MenuItem>
              <MenuItem value="custom">Custom sequence</MenuItem>
            </TextField>
            {generator === 'advancing' && (
              <>
                <TextField {...NUMBER_FIELD} label="Run" value={run} onChange={(e) => setRun(e.target.value)} />
                <TextField
                  {...NUMBER_FIELD}
                  label="Advance"
                  value={advance}
                  onChange={(e) => setAdvance(e.target.value)}
                />
              </>
            )}
            {generator === 'network' && (
              <>
                <TextField
                  size="small"
                  label="Pattern line points"
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                  helperText={`Heights 1-${n}, spread over the range`}
                  sx={{ flex: 1, minWidth: 160 }}
                />
                <TextField
                  {...NUMBER_FIELD}
                  label="Initial"
                  value={initial}
                  onChange={(e) => setInitial(e.target.value)}
                />
              </>
            )}
            {generator === 'parallel' && (
              <>
                <TextField
                  size="small"
                  label="Base sequence"
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  helperText="Each is followed by a partner"
                  sx={{ flex: 1, minWidth: 160 }}
                />
                <TextField {...NUMBER_FIELD} label="Shift" value={shift} onChange={(e) => setShift(e.target.value)} />
              </>
            )}
            {generator === 'custom' && (
              <TextField
                size="small"
                label={target === 'threading' ? 'Shafts (0 = empty)' : 'Treadles (0 = none)'}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                helperText="e.g. 1 2 3 4 3 2 or 1-4 3-2"
                sx={{ flex: 1, minWidth: 200 }}
              />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" data-testid="sequence-preview">
            {preview}
          </Typography>
          <Button
            variant="contained"
            sx={{ alignSelf: 'flex-start' }}
            onClick={guarded(() => {
              if (generator === 'advancing') {
                positiveInt(run, 'Run')
                positiveInt(advance, 'Advance')
              }
              apply({ kind: 'fill', sequence: sequence() }, `Filled ${range}`)
            })}
          >
            Fill {range}
          </Button>

          <Divider textAlign="left">Change the range</Divider>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField {...NUMBER_FIELD} label="Times" value={times} onChange={(e) => setTimes(e.target.value)} />
            <Button
              variant="outlined"
              onClick={guarded(() => {
                const t = positiveInt(times, 'Times')
                apply({ kind: 'repeat', times: t }, `Repeated ${range} ${t} more time${t > 1 ? 's' : ''}`)
              })}
            >
              Repeat
            </Button>
            <Button variant="outlined" onClick={guarded(() => apply({ kind: 'mirror' }, `Mirrored ${range}`))}>
              Mirror
            </Button>
            <Button variant="outlined" onClick={guarded(() => apply({ kind: 'reverse' }, `Reversed ${range}`))}>
              Reverse
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={guarded(() => apply({ kind: 'delete' }, `Deleted ${range}`))}
            >
              Delete
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Mirror turns the range into a point: 1 2 3 4 becomes 1 2 3 4 3 2 1.
          </Typography>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField {...NUMBER_FIELD} label="Count" value={count} onChange={(e) => setCount(e.target.value)} />
            <Button
              variant="outlined"
              onClick={guarded(() => {
                const c = positiveInt(count, 'Count')
                apply({ kind: 'insert', count: c }, `Inserted ${c} empty ${unit}${c > 1 ? 's' : ''} at ${from}`)
              })}
            >
              Insert empty {unit}s at {from}
            </Button>
          </Stack>

          <Divider textAlign="left">Copy &amp; paste</Divider>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={guarded(() => {
                const c = copyRange(draft, target, Number(from), Number(to))
                onCopy(c)
                setCopied(`Copied ${range}`)
              })}
            >
              Copy {range}
            </Button>
            <Typography variant="body2" color="text.secondary" data-testid="clipboard" aria-live="polite">
              {copied ??
                (clip
                  ? `Clipboard: ${clip.items.length} ${clip.source === 'threading' ? 'end' : 'pick'}${clip.items.length > 1 ? 's' : ''}`
                  : 'Clipboard is empty')}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              {...NUMBER_FIELD}
              label="Paste at"
              value={pasteAt}
              onChange={(e) => setPasteAt(e.target.value)}
            />
            <Button
              variant="outlined"
              disabled={!clip}
              onClick={guarded(() => {
                if (!clip) return
                onApply(
                  pasteClip(draft, target, Number(pasteAt), clip, 'overwrite', pasteColors),
                  `Pasted ${clip.items.length} over ${unit}s from ${pasteAt}`,
                )
              })}
            >
              Paste over
            </Button>
            <Button
              variant="outlined"
              disabled={!clip}
              onClick={guarded(() => {
                if (!clip) return
                onApply(
                  pasteClip(draft, target, Number(pasteAt), clip, 'insert', pasteColors),
                  `Inserted ${clip.items.length} ${unit}${clip.items.length > 1 ? 's' : ''} at ${pasteAt}`,
                )
              })}
            >
              Paste as new {unit}s
            </Button>
            <FormControlLabel
              control={<Checkbox checked={pasteColors} onChange={(e) => setPasteColors(e.target.checked)} />}
              label="With colours"
            />
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
