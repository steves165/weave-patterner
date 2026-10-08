import ImageIcon from '@mui/icons-material/Image'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MAX_BLOCKS, turnedTwill } from '../blocks'
import { BLOCK_WEAVES, blockWeave } from '../blockWeaves'
import { doubleCloth } from '../doublecloth'
import { lightnessGrid, midLightness, type Pixels, pictureProfile, twoTone } from '../image'
import { readImagePixels } from '../imageFile'
import { usePhone } from '../layout'
import { type Draft, MAX_SHAFTS } from '../weave'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

type Structure = 'summer-winter' | 'taquete' | 'turned-twill' | 'damask' | 'double-cloth' | 'rep'

/** Unit weaves (any block can be pattern on any pick), with their block limits. */
const STRUCTURES: [Structure, string, number][] = [
  ['summer-winter', 'Summer and winter', BLOCK_WEAVES['summer-winter'].maxBlocks],
  ['taquete', 'Taqueté', BLOCK_WEAVES.taquete.maxBlocks],
  ['rep', 'Rep weave', BLOCK_WEAVES.rep.maxBlocks],
  ['turned-twill', 'Turned twill', MAX_BLOCKS],
  // Plain-weave double cloth: 4 shafts a block.
  ['double-cloth', 'Double cloth', Math.floor(MAX_SHAFTS / 4)],
  ['damask', 'Damask', BLOCK_WEAVES.damask.maxBlocks],
]

/** Builds the draft for a structure, with dark showing where the picture is dark. */
function build(
  structure: Structure,
  profile: ReturnType<typeof pictureProfile>['profile'],
  dark: string,
  light: string,
) {
  switch (structure) {
    case 'summer-winter':
      return blockWeave('summer-winter', profile, { warp: light, warp2: light, pattern: dark, tabby: light })
    case 'taquete':
      return blockWeave('taquete', profile, { warp: light, warp2: light, pattern: dark, tabby: light })
    case 'rep':
      return blockWeave('rep', profile, { warp: dark, warp2: light, pattern: light, tabby: light })
    case 'damask':
      return blockWeave('damask', profile, { warp: dark, warp2: dark, pattern: light, tabby: light })
    case 'turned-twill':
      return turnedTwill(profile, [dark], [light])
    case 'double-cloth':
      return doubleCloth({
        structure: 'blocks',
        weave: 'plain',
        repeats: 1,
        warpA: dark,
        weftA: dark,
        warpB: light,
        weftB: light,
        profile,
      })
  }
}

/** Shows a two-tone grid as small squares. */
function GridPreview({ grid, label }: { grid: boolean[][]; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx || grid.length === 0) return
    ctx.canvas.width = grid[0].length
    ctx.canvas.height = grid.length
    grid.forEach((row, y) => {
      row.forEach((on, x) => {
        ctx.fillStyle = on ? '#222' : '#eee'
        ctx.fillRect(x, y, 1, 1)
      })
    })
  }, [grid])
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      style={{ width: 160, height: 160, objectFit: 'contain', imageRendering: 'pixelated', border: '1px solid #ccc' }}
    />
  )
}

/**
 * Turns a picture into a block profile and then a draft: the picture is cut into units, split into dark and
 * light, and alike columns and rows are grouped into blocks and block treadles.
 */
export function PictureDialog({ open, onClose, onApply }: Props) {
  const phone = usePhone()
  const input = useRef<HTMLInputElement>(null)
  const [pixels, setPixels] = useState<Pixels | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cols, setCols] = useState(24)
  const [threshold, setThreshold] = useState<number | null>(null)
  const [invert, setInvert] = useState(false)
  const [structure, setStructure] = useState<Structure>('summer-winter')
  const [dark, setDark] = useState('#1a237e')
  const [light, setLight] = useState('#f5f0e6')
  const maxBlocks = STRUCTURES.find(([s]) => s === structure)?.[2] ?? 4
  const rows = pixels ? Math.max(1, Math.round((cols * pixels.height) / pixels.width)) : cols

  const grid = useMemo(() => (pixels ? lightnessGrid(pixels, cols, rows) : null), [pixels, cols, rows])
  const cut = threshold ?? (grid ? midLightness(grid) : 0.5)
  const picture = useMemo(() => {
    if (!grid) return null
    const tone = twoTone(grid, cut)
    return invert ? tone.map((r) => r.map((v) => !v)) : tone
  }, [grid, cut, invert])
  const result = useMemo(() => {
    if (!picture) return null
    try {
      const { profile, match } = pictureProfile(picture, maxBlocks, maxBlocks)
      const blocked = profile.treadling.map((t) => profile.threading.map((b) => profile.tieup[b - 1][t - 1]))
      return { draft: build(structure, profile, dark, light), match, blocked, blocks: profile.tieup.length }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [picture, maxBlocks, structure, dark, light])

  const load = async (file: File | undefined) => {
    if (!file) return
    try {
      setError(null)
      setPixels(await readImagePixels(file))
      setThreshold(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle>Picture to draft</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Choose a picture: a logo, silhouette or simple drawing works best. It's cut into units, split into dark and
            light, and turned into blocks for the structure you pick.
          </Typography>
          <Box
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              load(e.dataTransfer.files[0])
            }}
            sx={{
              border: 2,
              borderStyle: 'dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
            }}
          >
            <Button variant="outlined" startIcon={<ImageIcon />} onClick={() => input.current?.click()}>
              Choose a picture
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              or drop one here
            </Typography>
            <input
              ref={input}
              type="file"
              accept="image/*"
              hidden
              aria-label="Picture file"
              onChange={(e) => load(e.target.files?.[0])}
            />
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          {pixels && picture && (
            <>
              <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
                <Stack sx={{ alignItems: 'center' }}>
                  <GridPreview grid={picture} label="Picture in dark and light" />
                  <Typography variant="caption">Your picture</Typography>
                </Stack>
                {result?.blocked && (
                  <Stack sx={{ alignItems: 'center' }}>
                    <GridPreview grid={result.blocked} label="Picture as blocks" />
                    <Typography variant="caption">As {result.blocks} blocks</Typography>
                  </Stack>
                )}
              </Stack>
              <Box>
                <Typography variant="caption" color="text.secondary" id="units-label">
                  Units across: {cols} (and {rows} down)
                </Typography>
                <Slider
                  size="small"
                  min={4}
                  max={60}
                  value={cols}
                  onChange={(_, v) => setCols(v as number)}
                  aria-labelledby="units-label"
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" id="threshold-label">
                  Dark below: {Math.round(cut * 100)}% lightness
                </Typography>
                <Slider
                  size="small"
                  min={0}
                  max={100}
                  value={Math.round(cut * 100)}
                  onChange={(_, v) => setThreshold((v as number) / 100)}
                  aria-labelledby="threshold-label"
                />
              </Box>
              <FormControlLabel
                control={<Switch checked={invert} onChange={(e) => setInvert(e.target.checked)} />}
                label="Swap dark and light"
              />
            </>
          )}
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Structure"
              value={structure}
              onChange={(e) => setStructure(e.target.value as Structure)}
              sx={{ minWidth: 200 }}
            >
              {STRUCTURES.map(([value, name, max]) => (
                <MenuItem key={value} value={value}>
                  {name} (up to {max} blocks)
                </MenuItem>
              ))}
            </TextField>
            {(
              [
                ['Dark', dark, setDark],
                ['Light', light, setLight],
              ] as const
            ).map(([label, value, set]) => (
              <Stack key={label} direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                <input
                  type="color"
                  className="picker"
                  aria-label={`${label} colour`}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                />
                <Typography variant="body2">{label}</Typography>
              </Stack>
            ))}
          </Stack>
          {result?.draft && (
            <Typography data-testid="picture-result">
              {Math.round(result.match * 100)}% of the picture kept. Makes {result.draft.shafts} shafts,{' '}
              {result.draft.treadles} treadles, {result.draft.ends} ends × {result.draft.picks} picks
            </Typography>
          )}
          {result?.error && <Alert severity="warning">{result.error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!result?.draft}
          onClick={() => result?.draft && onApply(result.draft, 'Draft made from your picture (replaces the draft)')}
        >
          Create draft
        </Button>
      </DialogActions>
    </Dialog>
  )
}
