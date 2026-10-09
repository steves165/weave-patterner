import CloseIcon from '@mui/icons-material/Close'
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
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type Card,
  formatTurns,
  MAX_CARDS,
  parseTurns,
  simulate,
  TABLET_PRESETS,
  type TabletDesign,
  tabletWarpCounts,
  toggleFlip,
} from '../tablet'

interface Props {
  open: boolean
  onClose: () => void
}

const KEY = 'weave-tablet'
const HOLES = ['A', 'B', 'C', 'D'] as const
const DEFAULT_PALETTE = ['#1a237e', '#f5f0e6', '#b71c1c', '#f9a825']

function load(): { design: TabletDesign; palette: string[] } {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved?.design?.cards?.length && Array.isArray(saved.design.turns)) return saved
  } catch {
    // start fresh
  }
  return { design: TABLET_PRESETS[0].build(DEFAULT_PALETTE[0], DEFAULT_PALETTE[1], 12), palette: DEFAULT_PALETTE }
}

/** The band as woven: each stitch a short slanted stroke in its colour. */
function BandPreview({
  rows,
  flipped,
  onFlip,
}: {
  rows: ReturnType<typeof simulate>
  /** "row,card" keys of stitches turned the other way, marked with a dot. */
  flipped: string[]
  onFlip: (row: number, card: number) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const cell = 14
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx || rows.length === 0) return
    ctx.canvas.width = rows[0].length * cell
    ctx.canvas.height = rows.length * cell
    ctx.fillStyle = '#888'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.lineCap = 'round'
    ctx.lineWidth = cell * 0.55
    rows.forEach((row, r) => {
      row.forEach((s, c) => {
        const [x, y] = [c * cell, r * cell]
        ctx.strokeStyle = s.color
        ctx.beginPath()
        if (s.slant === '/') {
          ctx.moveTo(x + cell * 0.25, y + cell * 0.85)
          ctx.lineTo(x + cell * 0.75, y + cell * 0.15)
        } else {
          ctx.moveTo(x + cell * 0.25, y + cell * 0.15)
          ctx.lineTo(x + cell * 0.75, y + cell * 0.85)
        }
        ctx.stroke()
        if (flipped.includes(`${r},${c}`)) {
          ctx.fillStyle = '#ff6d00'
          ctx.beginPath()
          ctx.arc(x + cell - 3, y + 3, 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    })
  }, [rows, flipped])
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Woven band"
      data-cell={cell}
      onClick={(e) => {
        const box = e.currentTarget.getBoundingClientRect()
        const scale = e.currentTarget.width / box.width
        const card = Math.floor(((e.clientX - box.left) * scale) / cell)
        const row = Math.floor(((e.clientY - box.top) * scale) / cell)
        if (row >= 0 && row < rows.length && card >= 0 && card < (rows[0]?.length ?? 0)) onFlip(row, card)
      }}
      style={{ maxWidth: '100%', imageRendering: 'pixelated', cursor: 'pointer' }}
    />
  )
}

/**
 * Tablet (card) weaving designer: colour each card's four holes, set its threading direction, and give the turning
 * sequence; the band is shown as it will weave. Kept in this browser, separate from the shaft-loom draft.
 */
export default function TabletDialog({ open, onClose }: Props) {
  const [{ design, palette }, setState] = useState(load)
  const [paint, setPaint] = useState(0)
  const [turnsText, setTurnsText] = useState(() => formatTurns(design.turns))
  const [turnsError, setTurnsError] = useState<string | null>(null)
  const rows = useMemo(() => simulate(design), [design])
  const counts = useMemo(() => tabletWarpCounts(design.cards), [design.cards])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ design, palette }))
    } catch {
      // not remembered
    }
  }, [design, palette])

  const setDesign = (next: TabletDesign) => setState((s) => ({ ...s, design: next }))
  const setCard = (c: number, card: Card) =>
    setDesign({ ...design, cards: design.cards.map((x, i) => (i === c ? card : x)) })
  const setCount = (n: number) => {
    const count = Math.max(2, Math.min(MAX_CARDS, n || 2))
    const cards = Array.from({ length: count }, (_, i) => design.cards[i] ?? design.cards[i % design.cards.length])
    setDesign({ ...design, cards })
  }

  return (
    <Dialog fullScreen open={open} onClose={onClose} aria-labelledby="tablet-title">
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
          <IconButton edge="start" aria-label="Close tablet weaving" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <Typography id="tablet-title" variant="h6" sx={{ flexGrow: 1 }}>
            Tablet weaving
          </Typography>
          <TextField
            select
            size="small"
            label="Start from"
            value=""
            onChange={(e) => {
              const preset = TABLET_PRESETS.find((p) => p.name === e.target.value)
              if (!preset) return
              const next = preset.build(palette[0], palette[1], design.cards.length)
              setDesign(next)
              setTurnsText(formatTurns(next.turns))
              setTurnsError(null)
            }}
            sx={{ width: 160 }}
          >
            {TABLET_PRESETS.map((p) => (
              <MenuItem key={p.name} value={p.name}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
        </Toolbar>
      </AppBar>
      <Stack sx={{ p: { xs: 2, sm: 3 }, gap: 2, overflow: 'auto' }}>
        <Typography variant="body2" color="text.secondary">
          Each card has four holes, A to D, each threaded with one warp end. Pick a colour, then click a hole to thread
          it. S and Z set which way each card is threaded, and so which way its stitches lean.
        </Typography>
        <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            type="number"
            label="Cards"
            value={design.cards.length}
            onChange={(e) => setCount(Number(e.target.value))}
            slotProps={{ htmlInput: { min: 2, max: MAX_CARDS } }}
            sx={{ width: 100 }}
          />
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }} role="radiogroup" aria-label="Thread colour">
            {palette.map((c, i) => (
              <Stack key={i} sx={{ alignItems: 'center' }}>
                <Box
                  role="radio"
                  aria-checked={paint === i}
                  aria-label={`Colour ${i + 1}`}
                  tabIndex={0}
                  onClick={() => setPaint(i)}
                  onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setPaint(i)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: c,
                    cursor: 'pointer',
                    border: 3,
                    borderColor: paint === i ? 'primary.main' : 'divider',
                  }}
                />
                <input
                  type="color"
                  className="picker"
                  aria-label={`Change colour ${i + 1}`}
                  value={c}
                  onChange={(e) =>
                    setState((s) => {
                      const old = s.palette[i]
                      const next = e.target.value
                      // Recolour the threads already in this colour.
                      const cards = s.design.cards.map((card) => ({
                        ...card,
                        holes: card.holes.map((h) => (h === old ? next : h)) as Card['holes'],
                      }))
                      return { design: { ...s.design, cards }, palette: s.palette.map((p, j) => (j === i ? next : p)) }
                    })
                  }
                  style={{ width: 24, height: 16, marginTop: 4 }}
                />
              </Stack>
            ))}
          </Stack>
        </Stack>

        <Box sx={{ overflowX: 'auto' }}>
          <Box
            role="group"
            aria-label="Card threading"
            sx={{ display: 'grid', gridTemplateColumns: `40px repeat(${design.cards.length}, 28px)`, gap: '2px' }}
          >
            <Box />
            {design.cards.map((_, c) => (
              <Typography key={c} variant="caption" sx={{ textAlign: 'center' }}>
                {c + 1}
              </Typography>
            ))}
            {HOLES.map((hole, h) => (
              <Box key={hole} sx={{ display: 'contents' }}>
                <Typography variant="caption" sx={{ alignSelf: 'center' }}>
                  {hole}
                </Typography>
                {design.cards.map((card, c) => (
                  <Box
                    key={c}
                    component="button"
                    type="button"
                    aria-label={`Card ${c + 1}, hole ${hole}`}
                    onClick={() => {
                      const holes = [...card.holes] as Card['holes']
                      holes[h] = palette[paint]
                      setCard(c, { ...card, holes })
                    }}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: card.holes[h],
                      border: 1,
                      borderColor: 'divider',
                      cursor: 'pointer',
                      p: 0,
                    }}
                  />
                ))}
              </Box>
            ))}
            <Typography variant="caption" sx={{ alignSelf: 'center' }}>
              S/Z
            </Typography>
            {design.cards.map((card, c) => (
              <Button
                key={c}
                size="small"
                variant="outlined"
                aria-label={`Card ${c + 1} threaded ${card.threading}`}
                onClick={() => setCard(c, { ...card, threading: card.threading === 'S' ? 'Z' : 'S' })}
                sx={{ minWidth: 0, width: 28, height: 28, p: 0 }}
              >
                {card.threading}
              </Button>
            ))}
            <Typography variant="caption" sx={{ alignSelf: 'center' }}>
              Turns
            </Typography>
            {design.cards.map((card, c) => (
              <Button
                key={c}
                size="small"
                variant={card.opposite ? 'contained' : 'outlined'}
                aria-label={`Card ${c + 1} turns ${card.opposite ? 'opposite to' : 'with'} the pack`}
                title={card.opposite ? 'Turns against the pack' : 'Turns with the pack'}
                onClick={() => setCard(c, { ...card, opposite: !card.opposite })}
                sx={{ minWidth: 0, width: 28, height: 28, p: 0 }}
              >
                {card.opposite ? '⇅' : '·'}
              </Button>
            ))}
          </Box>
        </Box>

        <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField
            size="small"
            label="Turning"
            value={turnsText}
            onChange={(e) => {
              setTurnsText(e.target.value)
              try {
                setDesign({ ...design, turns: parseTurns(e.target.value) })
                setTurnsError(null)
              } catch (err) {
                setTurnsError(err instanceof Error ? err.message : String(err))
              }
            }}
            helperText="F forward, B back, with counts: e.g. 8F 8B"
            sx={{ minWidth: 220 }}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value=""
            onChange={(_, v) => {
              if (!v) return
              const turns = parseTurns(v)
              setDesign({ ...design, turns })
              setTurnsText(formatTurns(turns))
              setTurnsError(null)
            }}
            aria-label="Quick turning"
          >
            <ToggleButton value="16F">All forward</ToggleButton>
            <ToggleButton value="8F 8B">8 forward, 8 back</ToggleButton>
            <ToggleButton value="4F 4B 4F 4B">4 and 4</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {turnsError && <Alert severity="warning">{turnsError}</Alert>}

        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 3 }}>
          <Box>
            <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
              The band ({rows.length} rows)
            </Typography>
            <BandPreview
              rows={rows}
              flipped={design.flipped ?? []}
              onFlip={(row, card) => setDesign(toggleFlip(design, row, card))}
            />
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1, maxWidth: 360 }}>
              Click a stitch to turn that card the other way on that row (marked with a dot). An S-threaded card turned
              forward makes a Z twist, leaning /; Z-threaded, it leans \.
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" component="h3">
              Warp
            </Typography>
            <Typography variant="body2" data-testid="tablet-warp">
              {design.cards.length * 4} ends: {counts.map((c) => `${c.count} × ${c.color}`).join(', ')}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Dialog>
  )
}
