import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DialogTitle } from '../components/DialogTitle'
import type { Pixels } from '../image'
import { usePhone } from '../layout'
import { blankChart, type KnitChart, longFloats, MAX_COLORS, MAX_ROWS, MAX_STITCHES } from './chart'
import { pictureColors, pictureRows, tidyColors } from './picture'

interface Props {
  /** The picture, and its file name; the dialog is open while there is one. */
  picture: { pixels: Pixels; name: string } | null
  chart: KnitChart
  onClose: () => void
  onApply: (next: KnitChart, message: string) => void
}

/**
 * Turns a picture into a colourwork chart: as many stitches wide as chosen, as many rows as keep its shape at the
 * gauge, in a few of its main colours, with stray single stitches tidied away.
 */
export function PictureDialog({ picture, chart, onClose, onApply }: Props) {
  const phone = usePhone()
  const [stitches, setStitches] = useState(40)
  const [count, setCount] = useState(2)
  const [tidy, setTidy] = useState(true)
  // Start from the chart's width and colours each time a picture comes in.
  useEffect(() => {
    if (!picture) return
    setStitches(Math.max(8, Math.min(MAX_STITCHES, chart.stitch[0]?.length ?? 40)))
    setCount(Math.max(2, Math.min(MAX_COLORS, chart.colors.length)))
  }, [picture, chart.stitch, chart.colors.length])

  const result = useMemo(() => {
    if (!picture) return null
    const rows = pictureRows(picture.pixels, stitches, chart.gauge, MAX_ROWS)
    const { colors, grid } = pictureColors(picture.pixels, stitches, rows, count)
    const blank = blankChart(stitches, rows, colors)
    const next: KnitChart = {
      ...chart,
      stitch: blank.stitch,
      color: tidy ? tidyColors(grid) : grid,
      colors,
      repeat: undefined,
      panels: undefined,
    }
    return { chart: next, rows, floats: longFloats(next).length }
  }, [picture, stitches, count, tidy, chart])

  // The preview: one square per stitch, to gauge (a stitch is wider than a row is tall).
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx || !result) return
    const k = result.chart
    const w = k.stitch[0].length
    const cw = Math.max(2, Math.floor(480 / w))
    const ch = Math.max(1, (cw * chart.gauge.stitches) / chart.gauge.rows)
    ctx.canvas.width = w * cw
    ctx.canvas.height = Math.ceil(result.rows * ch)
    for (let r = 0; r < result.rows; r++)
      for (let c = 0; c < w; c++) {
        ctx.fillStyle = k.colors[k.color[r][c]]
        ctx.fillRect(c * cw, (result.rows - 1 - r) * ch, cw, Math.ceil(ch))
      }
  }, [result, chart.gauge])

  return (
    <Dialog open={Boolean(picture)} onClose={onClose} fullScreen={phone} maxWidth="sm" fullWidth>
      <DialogTitle onClose={onClose}>Colourwork from a picture</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {picture?.name} becomes a chart in its main colours, all knit stitches. The rows follow the picture's shape at
          your gauge of {chart.gauge.stitches} stitches and {chart.gauge.rows} rows to 10 cm. This replaces the chart:
          undo to go back.
        </Typography>
        <Stack sx={{ gap: 1 }}>
          <Typography id="picture-stitches" variant="body2" sx={{ fontWeight: 600 }}>
            Stitches across: {stitches}
            {result && ` (${result.rows} rows)`}
          </Typography>
          <Slider
            size="small"
            min={8}
            max={MAX_STITCHES}
            value={stitches}
            onChange={(_, v) => setStitches(v as number)}
            aria-labelledby="picture-stitches"
          />
          <Typography id="picture-colours" variant="body2" sx={{ fontWeight: 600 }}>
            Colours: {count}
          </Typography>
          <Slider
            size="small"
            min={2}
            max={MAX_COLORS}
            step={1}
            marks
            value={count}
            onChange={(_, v) => setCount(v as number)}
            aria-labelledby="picture-colours"
          />
          <FormControlLabel
            control={<Switch checked={tidy} onChange={(e) => setTidy(e.target.checked)} />}
            label="Tidy away lone stitches of colour"
          />
        </Stack>
        <Box
          sx={{
            mt: 1.5,
            p: 1,
            borderRadius: 1,
            bgcolor: 'var(--wp-seg)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <canvas
            ref={canvas}
            data-testid="picture-preview"
            aria-label="Preview of the chart"
            style={{ maxWidth: '100%', maxHeight: 360, imageRendering: 'pixelated' }}
          />
        </Box>
        {result && result.floats > 0 && chart.colorwork !== 'intarsia' && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            {result.floats} {result.floats === 1 ? 'row has' : 'rows have'} floats longer than {chart.floatLimit}{' '}
            stitches. Fewer colours, fewer stitches or intarsia (settings) can help.
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
              `Made a ${stitches} × ${result.rows} chart from ${picture?.name}, in ${result.chart.colors.length} colours. Undo to go back.`,
            )
          }
        >
          Make the chart
        </Button>
      </DialogActions>
    </Dialog>
  )
}
