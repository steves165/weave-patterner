import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { usePhone } from '../layout'
import { colorLetter, type KnitChart, rowsOf } from './chart'
import { mosaic } from './mosaic'

interface Props {
  open: boolean
  chart: KnitChart
  onClose: () => void
  onApply: (next: KnitChart, message: string) => void
}

/** Turns the chart's colour design into mosaic knitting: one colour per pair of rows, the other slipped. */
export function MosaicDialog({ open, chart, onClose, onApply }: Props) {
  const phone = usePhone()
  const [garter, setGarter] = useState(true)
  const result = useMemo(() => (open ? mosaic(chart, garter) : null), [open, chart, garter])
  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} maxWidth="sm" fullWidth>
      <DialogTitle>Make a mosaic</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Mosaic knitting makes two-colour patterns with one colour at a time. Each row of your design becomes two rows,
          a right-side row and a wrong-side row back, in colour {colorLetter(0)} or {colorLetter(1)} in turn. Stitches
          meant to be the other colour are slipped with the yarn behind, so the colour below shows through. Squares in
          colour {colorLetter(0)} are the first colour; any other colour counts as the second.
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={garter ? 'garter' : 'stockinette'}
          onChange={(_, v) => v && setGarter(v === 'garter')}
          aria-label="Fabric"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="garter">Garter ridges (traditional)</ToggleButton>
          <ToggleButton value="stockinette">Smooth stockinette</ToggleButton>
        </ToggleButtonGroup>
        {result && (
          <Alert severity={result.missed ? 'warning' : 'success'} data-testid="mosaic-result">
            {rowsOf(chart)} design rows make {rowsOf(result.chart)} mosaic rows.{' '}
            {result.missed
              ? `${result.missed} squares can't show their colour: mosaic can only show the other colour where it was knitted in the row pair below.`
              : 'Every square shows its colour.'}
            {result.longSlips > 0 &&
              ` ${result.longSlips} stitches are slipped over two row pairs running, which pulls the fabric up a little.`}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!result}
          onClick={() =>
            result &&
            onApply(
              result.chart,
              `Made a mosaic: ${rowsOf(result.chart)} rows, one colour each pair. Undo to go back to the design.`,
            )
          }
        >
          Make the mosaic
        </Button>
      </DialogActions>
    </Dialog>
  )
}
