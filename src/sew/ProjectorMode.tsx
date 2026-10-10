import CloseIcon from '@mui/icons-material/Close'
import FlipIcon from '@mui/icons-material/Flip'
import {
  Box,
  Button,
  Dialog,
  FormControlLabel,
  IconButton,
  Slider,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import type { Item } from './drawing'
import type { Box as Rect } from './geometry'
import { CSS_PX_PER_CM, ItemsSvg } from './PatternView'

const KEY = 'sew-projector'

interface Settings {
  /** Screen pixels to the centimetre on the cutting mat, set by measuring the test square. */
  pxPerCm: number
  mirror: boolean
  thick: boolean
}

function load(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (s && typeof s.pxPerCm === 'number' && s.pxPerCm > 1 && s.pxPerCm < 200)
      return { pxPerCm: s.pxPerCm, mirror: Boolean(s.mirror), thick: s.thick !== false }
  } catch {
    // defaults
  }
  return { pxPerCm: CSS_PX_PER_CM, mirror: false, thick: true }
}

/**
 * Projector mode: the pattern full screen in light lines on black, at the scale set by measuring a 10 cm square on
 * the cutting mat, to cut straight from the projection without printing. Drag, or use the arrow keys, to move it.
 */
export function ProjectorMode({
  open,
  onClose,
  items,
  box,
}: {
  open: boolean
  onClose: () => void
  items: Item[]
  box: Rect
}) {
  const [s, setS] = useState(load)
  const [calibrating, setCalibrating] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const save = (next: Settings) => {
    setS(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // not remembered
    }
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [step, 0],
        ArrowRight: [-step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      }
      const m = moves[e.key]
      if (!m) return
      e.preventDefault()
      setPan((p) => ({ x: p.x + m[0], y: p.y + m[1] }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const k = s.pxPerCm
  const down = (e: PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }
  const move = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    setPan({ x: d.px + ((e.clientX - d.x) / k) * (s.mirror ? -1 : 1), y: d.py + (e.clientY - d.y) / k })
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      aria-labelledby="projector-title"
      slotProps={{ paper: { sx: { bgcolor: '#000', color: '#fff' } } }}
    >
      <h2 id="projector-title" className="sr-only">
        Projector mode
      </h2>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          touchAction: 'none',
          cursor: 'grab',
          ['--sew-ink' as string]: '#ffffff',
          ['--sew-mark' as string]: '#ffd54f',
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null
        }}
        data-testid="projection"
      >
        {calibrating ? (
          <Box
            data-testid="calibration-square"
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 10 * k,
              height: 10 * k,
              transform: 'translate(-50%, -50%)',
              border: '3px solid #fff',
            }}
          >
            <Typography sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 20 }}>
              10 cm
            </Typography>
          </Box>
        ) : (
          <svg
            width={(box.w + 4) * k}
            height={(box.h + 4) * k}
            viewBox={`${box.x - 2} ${box.y - 2} ${box.w + 4} ${box.h + 4}`}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${pan.x * k}px, ${pan.y * k}px)${s.mirror ? ' scaleX(-1)' : ''}`,
              transformOrigin: 'center',
              fontFamily: 'sans-serif',
            }}
            role="img"
            aria-label="The pattern, projected at full size"
          >
            <ItemsSvg items={items} minStroke={(s.thick ? 3 : 1.5) / k} />
          </svg>
        )}
      </Box>
      <Stack
        direction="row"
        sx={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
          bgcolor: 'rgba(30,30,40,0.85)',
          borderRadius: 3,
          px: 2,
          py: 1,
          color: '#fff',
        }}
      >
        <Button
          variant={calibrating ? 'contained' : 'outlined'}
          color="inherit"
          onClick={() => setCalibrating(!calibrating)}
        >
          {calibrating ? 'Done' : 'Set the scale'}
        </Button>
        {calibrating && (
          <Stack direction="row" sx={{ alignItems: 'center', gap: 2, minWidth: 260, flex: 1 }}>
            <Typography variant="body2">Measure the square on the mat and adjust it to 10 cm:</Typography>
            <Slider
              aria-label="Projection scale"
              min={5}
              max={120}
              step={0.1}
              value={k}
              onChange={(_, v) => save({ ...s, pxPerCm: v as number })}
              sx={{ color: '#fff', minWidth: 160, flex: 1 }}
            />
          </Stack>
        )}
        <Tooltip title="Mirror it, to cut with the fabric’s wrong side up">
          <FormControlLabel
            control={<Switch checked={s.mirror} onChange={(e) => save({ ...s, mirror: e.target.checked })} />}
            label={
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                <FlipIcon fontSize="small" /> Mirror
              </Stack>
            }
          />
        </Tooltip>
        <FormControlLabel
          control={<Switch checked={s.thick} onChange={(e) => save({ ...s, thick: e.target.checked })} />}
          label="Thick lines"
        />
        <Typography variant="body2" sx={{ opacity: 0.8, flex: '1 1 200px' }}>
          Drag or use the arrow keys to move the pattern (Shift for 10 cm at a time).
        </Typography>
        <IconButton aria-label="Close projector mode" color="inherit" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
    </Dialog>
  )
}
