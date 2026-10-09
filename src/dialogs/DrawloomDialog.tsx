import CloseIcon from '@mui/icons-material/Close'
import ImageIcon from '@mui/icons-material/Image'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Grid } from '../components/Grid'
import {
  type DrawloomDesign,
  drawloomCloth,
  drawloomDraft,
  drawSequence,
  GROUNDS,
  type Ground,
  groundTreadling,
  ranges,
  sampleDrawloom,
} from '../drawloom'
import { lightnessGrid, midLightness, twoTone } from '../image'
import { readImagePixels } from '../imageFile'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

const KEY = 'weave-drawloom'
const MAX_UNITS = 80

function load(): DrawloomDesign {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as DrawloomDesign | null
    if (saved?.pattern?.length && saved.pattern[0]?.length && saved.unit > 0 && saved.ground in GROUNDS) return saved
  } catch {
    // start from the sample
  }
  return sampleDrawloom()
}

const resizePattern = (p: boolean[][], rows: number, cols: number) =>
  Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => p[r]?.[c] ?? false))

/** The cloth, thread by thread, in the warp and weft colours. */
function ClothPreview({ design }: { design: DrawloomDesign }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const cloth = useMemo(() => drawloomCloth(design), [design])
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx || cloth.length === 0) return
    const px = Math.max(1, Math.min(3, Math.floor(600 / Math.max(cloth[0].length, cloth.length))))
    ctx.canvas.width = cloth[0].length * px
    ctx.canvas.height = cloth.length * px
    cloth.forEach((row, p) => {
      row.forEach((up, e) => {
        ctx.fillStyle = up ? design.warp : design.weft
        ctx.fillRect(e * px, p * px, px, px)
      })
    })
  }, [cloth, design.warp, design.weft])
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Drawloom cloth"
      style={{ maxWidth: '100%', imageRendering: 'pixelated' }}
    />
  )
}

/**
 * Drawloom designer: paint the pattern in units (each a group of ends lifted by one draw cord), choose the unit
 * size and the ground weave, and get the cloth, the drawing sequence and the ground treadling. Kept in this
 * browser; when the design fits on shafts it can be turned into an ordinary draft.
 */
export default function DrawloomDialog({ open, onClose, onApply }: Props) {
  const [design, setDesign] = useState(load)
  const [error, setError] = useState<string | null>(null)
  const picture = useRef<HTMLInputElement>(null)
  const rows = design.pattern.length
  const cols = design.pattern[0].length
  const { shafts } = GROUNDS[design.ground]
  const sequence = useMemo(() => drawSequence(design), [design])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(design))
    } catch {
      // not remembered
    }
  }, [design])

  const update = (patch: Partial<DrawloomDesign>) => setDesign((d) => ({ ...d, ...patch }))
  const size = (text: string, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number(text)) || min))
  const fromPicture = async (file: File | undefined) => {
    if (!file) return
    try {
      setError(null)
      const grid = lightnessGrid(await readImagePixels(file), cols, rows)
      update({ pattern: twoTone(grid, midLightness(grid)) })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Dialog fullScreen open={open} onClose={onClose} aria-labelledby="drawloom-title">
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" aria-label="Close drawloom" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <Typography id="drawloom-title" variant="h6" sx={{ flexGrow: 1 }}>
            Drawloom
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              try {
                setError(null)
                onApply(drawloomDraft(design), 'Drawloom design as a shaft draft (replaces the draft)')
              } catch (e) {
                setError(
                  `${e instanceof Error ? e.message : String(e)}. It weaves on a drawloom, but is too varied for shafts.`,
                )
              }
            }}
          >
            Make a shaft draft
          </Button>
        </Toolbar>
      </AppBar>
      <Stack sx={{ p: { xs: 2, sm: 3 }, gap: 2, overflow: 'auto' }}>
        <Typography variant="body2" color="text.secondary">
          On a drawloom each unit of the pattern is a group of ends lifted together by one draw cord, so the design
          isn't limited by shafts. Paint the pattern below: filled units weave the pattern face, empty ones the ground.
        </Typography>
        <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            type="number"
            label="Units across"
            value={cols}
            onChange={(e) =>
              update({ pattern: resizePattern(design.pattern, rows, size(e.target.value, 2, MAX_UNITS)) })
            }
            sx={{ width: 120 }}
          />
          <TextField
            size="small"
            type="number"
            label="Units down"
            value={rows}
            onChange={(e) =>
              update({ pattern: resizePattern(design.pattern, size(e.target.value, 2, MAX_UNITS), cols) })
            }
            sx={{ width: 120 }}
          />
          <TextField
            size="small"
            type="number"
            label="Unit size (ends)"
            value={design.unit}
            onChange={(e) => update({ unit: size(e.target.value, 2, 20) })}
            helperText="The découpure"
            sx={{ width: 140 }}
          />
          <TextField
            select
            size="small"
            label="Ground weave"
            value={design.ground}
            onChange={(e) => update({ ground: e.target.value as Ground })}
            sx={{ width: 200 }}
          >
            {(Object.keys(GROUNDS) as Ground[]).map((g) => (
              <MenuItem key={g} value={g}>
                {GROUNDS[g].name}
              </MenuItem>
            ))}
          </TextField>
          {(
            [
              ['warp', 'Warp'],
              ['weft', 'Weft'],
            ] as const
          ).map(([key, label]) => (
            <Stack key={key} direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              <input
                type="color"
                className="picker"
                aria-label={label}
                value={design[key]}
                onChange={(e) => update({ [key]: e.target.value })}
              />
              <Typography variant="body2">{label}</Typography>
            </Stack>
          ))}
        </Stack>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<ImageIcon />} onClick={() => picture.current?.click()}>
            From a picture
          </Button>
          <input
            ref={picture}
            type="file"
            accept="image/*"
            hidden
            aria-label="Picture for the pattern"
            onChange={(e) => fromPicture(e.target.files?.[0])}
          />
          <Button variant="outlined" onClick={() => update({ pattern: design.pattern.map((r) => r.map((v) => !v)) })}>
            Invert
          </Button>
          <Button variant="outlined" onClick={() => update({ pattern: design.pattern.map((r) => r.map(() => false)) })}>
            Clear
          </Button>
        </Stack>
        {error && <Alert severity="warning">{error}</Alert>}
        <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ gap: 3, alignItems: 'flex-start' }}>
          <Box sx={{ overflow: 'auto', maxWidth: '100%' }} style={{ ['--cell' as string]: '14px' }}>
            <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
              Pattern ({cols} × {rows} units)
            </Typography>
            <Grid
              rows={rows}
              cols={cols}
              isOn={(r, c) => design.pattern[r][c]}
              onPaint={(r, c, v) =>
                setDesign((d) => ({
                  ...d,
                  pattern: d.pattern.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)),
                }))
              }
              label="Drawloom pattern"
              cellLabel={(r, c) => `Unit row ${r + 1}, draw cord ${c + 1}`}
            />
          </Box>
          <Box>
            <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
              The cloth ({cols * design.unit} ends × {rows * design.unit} picks)
            </Typography>
            <ClothPreview design={design} />
          </Box>
        </Stack>
        <Box>
          <Typography variant="subtitle2" component="h3">
            Setting up
          </Typography>
          <Typography variant="body2" data-testid="drawloom-setup">
            Pattern harness: {cols} draw cords, each lifting {design.unit} ends. Ground harness: {shafts} shafts,
            threaded in a straight draw ({cols * design.unit} ends). {GROUNDS[design.ground].name}.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }} data-testid="drawloom-ground">
            For each row, weave {design.unit} picks working the ground shafts in turn:{' '}
            {groundTreadling(design).join(', ')}. In pattern units the ground shaft sinks its ends; in the ground it
            lifts them.
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" component="h3">
            Drawing sequence
          </Typography>
          <Box
            component="ol"
            data-testid="drawloom-sequence"
            aria-label="Cords to draw, row by row"
            tabIndex={0}
            sx={{ maxHeight: 260, overflow: 'auto', m: 0, pl: 4, fontSize: '0.875rem' }}
          >
            {sequence.map((s) => (
              <li key={s.row}>
                {s.same ? 'As before' : s.cords.length ? `Draw cords ${ranges(s.cords)}` : 'No cords: ground only'}
              </li>
            ))}
          </Box>
        </Box>
      </Stack>
    </Dialog>
  )
}
