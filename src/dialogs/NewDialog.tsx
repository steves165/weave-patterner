import { Button, Dialog, DialogActions, DialogContent, Stack, TextField } from '@mui/material'
import { useEffect, useState } from 'react'
import { DialogTitle } from '../components/DialogTitle'
import { FIELD_GRID, LIMITS, LoomChoice } from '../components/SettingsPanel'
import { usePhone } from '../layout'

export interface NewPattern {
  liftplan: boolean
  shafts: number
  treadles: number
  ends: number
  picks: number
  /** Start from a 2/2 twill (or plain weave on fewer shafts) rather than empty grids. */
  twill: boolean
}

interface Props {
  open: boolean
  /** The loom the current pattern is for, to start from. */
  liftplan: boolean
  shafts: number
  treadles: number
  onClose: () => void
  onCreate: (pattern: NewPattern) => void
}

const clamp = (text: string, [min, max]: readonly [number, number]) =>
  Math.max(min, Math.min(max, Math.round(Number(text)) || min))

/** A new pattern: which loom it's for, how many shafts and treadles, its size, and whether to start empty. */
export function NewDialog(p: Props) {
  const phone = usePhone()
  const [liftplan, setLiftplan] = useState(p.liftplan)
  const [shafts, setShafts] = useState(String(p.shafts))
  const [treadles, setTreadles] = useState(String(p.treadles))
  const [ends, setEnds] = useState('32')
  const [picks, setPicks] = useState('32')
  const [twill, setTwill] = useState(false)
  useEffect(() => {
    if (!p.open) return
    setLiftplan(p.liftplan)
    setShafts(String(p.shafts))
    setTreadles(String(p.treadles))
  }, [p.open, p.liftplan, p.shafts, p.treadles])

  const field = (label: string, value: string, set: (v: string) => void) => (
    <TextField label={label} type="number" size="small" value={value} onChange={(e) => set(e.target.value)} />
  )
  const create = () =>
    p.onCreate({
      liftplan,
      shafts: clamp(shafts, LIMITS.shafts),
      treadles: liftplan ? clamp(shafts, LIMITS.shafts) : clamp(treadles, LIMITS.treadles),
      ends: clamp(ends, LIMITS.ends),
      picks: clamp(picks, LIMITS.picks),
      twill,
    })

  return (
    <Dialog open={p.open} onClose={p.onClose} fullScreen={phone} fullWidth maxWidth="xs">
      <DialogTitle onClose={p.onClose}>New pattern</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          sx={{ gap: 2.5, pt: 1 }}
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
        >
          <LoomChoice
            label="Loom type"
            value={liftplan ? 'liftplan' : 'treadles'}
            options={[
              ['treadles', 'Treadles', 'Floor looms: shafts tied to treadles, one or more treadles a pick.'],
              ['liftplan', 'Lift plan', 'Table and dobby looms: the shafts lifted on each pick, with no tie-up.'],
            ]}
            onChange={(v) => setLiftplan(v === 'liftplan')}
          />
          <Stack sx={FIELD_GRID}>
            {field('Shafts', shafts, setShafts)}
            {!liftplan && field('Treadles', treadles, setTreadles)}
            {field('Ends', ends, setEnds)}
            {field('Picks', picks, setPicks)}
          </Stack>
          <LoomChoice
            label="Start with"
            value={twill ? 'twill' : 'empty'}
            options={[
              ['empty', 'Empty grids', 'Nothing threaded or treadled yet: draw your own.'],
              ['twill', 'A twill', 'A straight draw with a twill tie-up and treadling, to change from.'],
            ]}
            onChange={(v) => setTwill(v === 'twill')}
          />
          <button type="submit" hidden />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={p.onClose}>Cancel</Button>
        <Button variant="contained" onClick={create}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}
