import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { type CalcInput, calculate, defaultCalcInput, type Units, type YarnAmount } from '../calculator'
import { usePhone } from '../layout'
import type { Draft } from '../weave'
import { type Yarn, yarnFor } from '../yarns'

interface Props {
  open: boolean
  draft: Draft
  /** The yarn library: a yarn's grist and price apply to threads of its colour. */
  yarns: Yarn[]
  onClose: () => void
}

type Fields = Omit<CalcInput, 'units' | 'warpColors' | 'weftColors' | 'yarnFor'>
type FieldKey = keyof Fields
/** Text being typed, so partially entered numbers aren't clobbered. */
type Texts = Record<FieldKey, string>

const STORAGE_KEY = 'weave-calculator'

const LABELS = (units: Units): Record<FieldKey, string> => {
  const short = units === 'metric' ? 'cm' : 'in'
  const per = units === 'metric' ? 'per cm' : 'per inch'
  const grist = units === 'metric' ? 'm per kg' : 'yd per lb'
  const price = units === 'metric' ? 'Price per kg' : 'Price per lb'
  return {
    ends: 'Warp ends',
    sett: `Sett (ends ${per})`,
    ppi: `Picks ${per}`,
    finishedLength: `Finished length (${short})`,
    pieces: 'Pieces',
    allowance: `Fringe/hems per piece (${short})`,
    loomWaste: `Loom waste (${short})`,
    takeUp: 'Take-up (%)',
    shrinkage: 'Shrinkage (%)',
    yarnPerWeight: `Yarn grist (${grist}, optional)`,
    pricePerWeight: `${price} (optional)`,
  }
}

const toTexts = (f: Partial<Fields>): Texts => {
  const keys = Object.keys(LABELS('metric')) as FieldKey[]
  return Object.fromEntries(keys.map((k) => [k, f[k] === undefined ? '' : String(f[k])])) as Texts
}

function loadSaved(): { units: Units; texts: Partial<Texts> } | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}

const fmt = (n: number, digits = 1) => n.toLocaleString(undefined, { maximumFractionDigits: digits })

/** Works out warp length, width in the reed and yarn needed per colour, with optional weight and cost. */
export function CalculatorDialog({ open, draft, yarns, onClose }: Props) {
  const phone = usePhone()
  const [units, setUnits] = useState<Units>(() => loadSaved()?.units ?? 'metric')
  const [texts, setTexts] = useState<Texts>(() => ({
    ...toTexts(defaultCalcInput(units)),
    ...loadSaved()?.texts,
    ends: String(draft.ends),
  }))

  // Default the number of ends to the draft's each time the calculator opens.
  useEffect(() => {
    if (open) setTexts((t) => ({ ...t, ends: String(draft.ends) }))
  }, [open, draft.ends])

  useEffect(() => {
    try {
      const { ends: _ends, ...rest } = texts
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ units, texts: rest }))
    } catch {
      // settings just won't be remembered
    }
  }, [units, texts])

  const labels = LABELS(units)
  const long = units === 'metric' ? 'm' : 'yd'
  const short = units === 'metric' ? 'cm' : 'in'
  const weightUnit = units === 'metric' ? 'kg' : 'lb'

  const num = (v: string) => (v.trim() === '' ? Number.NaN : Number(v))
  const optional = (v: string) => (v.trim() === '' ? undefined : Number(v))
  const input: CalcInput = {
    units,
    ends: num(texts.ends),
    sett: num(texts.sett),
    ppi: num(texts.ppi),
    finishedLength: num(texts.finishedLength),
    pieces: num(texts.pieces),
    allowance: num(texts.allowance),
    loomWaste: num(texts.loomWaste),
    takeUp: num(texts.takeUp),
    shrinkage: num(texts.shrinkage),
    yarnPerWeight: optional(texts.yarnPerWeight),
    pricePerWeight: optional(texts.pricePerWeight),
    warpColors: draft.warpColors,
    weftColors: draft.weftColors,
    yarnFor: (c) => yarnFor(yarns, c),
  }
  let result: ReturnType<typeof calculate> | null = null
  let error: string | null = null
  try {
    result = calculate(input)
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  // Show weight/cost columns when any colour has one; a dash marks colours (and totals) that can't be worked out.
  const amounts = result ? [...result.warp, ...result.weft] : []
  const showWeight = amounts.some((a) => a.weight !== undefined)
  const showCost = amounts.some((a) => a.cost !== undefined)

  const field = (k: FieldKey) => (
    <TextField
      key={k}
      size="small"
      type="number"
      label={labels[k]}
      value={texts[k]}
      onChange={(e) => setTexts({ ...texts, [k]: e.target.value })}
      slotProps={{ htmlInput: { min: 0, step: 'any' } }}
      sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}
    />
  )

  const yarnRows = (label: string, rows: YarnAmount[]) =>
    rows.map((r, i) => (
      <TableRow key={`${label}-${r.color}`}>
        <TableCell>{i === 0 ? label : ''}</TableCell>
        <TableCell>
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 16, height: 16, bgcolor: r.color, border: 1, borderColor: 'divider' }} />
            {r.yarn ? `${r.yarn} (${r.color})` : r.color}
          </Stack>
        </TableCell>
        <TableCell align="right">
          {fmt(r.length, 0)} {long}
        </TableCell>
        {showWeight && (
          <TableCell align="right">{r.weight === undefined ? '—' : `${fmt(r.weight, 2)} ${weightUnit}`}</TableCell>
        )}
        {showCost && <TableCell align="right">{r.cost === undefined ? '—' : fmt(r.cost, 2)}</TableCell>}
      </TableRow>
    ))

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="md">
      <DialogTitle>Warp calculator</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={units}
            aria-label="Units"
            onChange={(_, v: Units | null) => {
              if (!v || v === units) return
              setUnits(v)
              setTexts({ ...toTexts(defaultCalcInput(v)), ends: texts.ends })
            }}
          >
            <ToggleButton value="metric">Metric (cm, m)</ToggleButton>
            <ToggleButton value="imperial">Imperial (in, yd)</ToggleButton>
          </ToggleButtonGroup>
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
            {(Object.keys(labels) as FieldKey[]).map(field)}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Colours repeat across the warp and weft as in the draft ({draft.ends} ends × {draft.picks} picks per
            repeat).
          </Typography>

          <Divider />
          {error && <Alert severity="warning">{error}</Alert>}
          {result && (
            <>
              <Stack direction="row" sx={{ gap: 3, flexWrap: 'wrap' }} data-testid="calc-summary">
                <Typography>
                  Width in reed:{' '}
                  <strong>
                    {fmt(result.widthInReed)} {short}
                  </strong>
                </Typography>
                <Typography>
                  Warp length:{' '}
                  <strong>
                    {fmt(result.warpLength, 2)} {long}
                  </strong>
                </Typography>
                <Typography>
                  Picks to weave: <strong>{fmt(result.totalPicks, 0)}</strong>
                </Typography>
              </Stack>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" aria-label="Yarn needed">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>Colour</TableCell>
                      <TableCell align="right">Length</TableCell>
                      {showWeight && <TableCell align="right">Weight</TableCell>}
                      {showCost && <TableCell align="right">Cost</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {yarnRows('Warp', result.warp)}
                    {yarnRows('Weft', result.weft)}
                    <TableRow data-testid="calc-total">
                      <TableCell>
                        <strong>Total</strong>
                      </TableCell>
                      <TableCell />
                      <TableCell align="right">
                        <strong>
                          {fmt(result.totalLength, 0)} {long}
                        </strong>
                      </TableCell>
                      {showWeight && (
                        <TableCell align="right">
                          <strong>
                            {result.totalWeight === undefined ? '—' : `${fmt(result.totalWeight, 2)} ${weightUnit}`}
                          </strong>
                        </TableCell>
                      )}
                      {showCost && (
                        <TableCell align="right">
                          <strong>{result.totalCost === undefined ? '—' : fmt(result.totalCost, 2)}</strong>
                        </TableCell>
                      )}
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Estimates only: add a margin for sampling, knots and breakage.
              </Typography>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
