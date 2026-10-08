import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import FlipIcon from '@mui/icons-material/Flip'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import ImageIcon from '@mui/icons-material/Image'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import PrintIcon from '@mui/icons-material/Print'
import RedoIcon from '@mui/icons-material/Redo'
import RemoveIcon from '@mui/icons-material/Remove'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import {
  Alert,
  AppBar,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Slider,
  Snackbar,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { type Consent, GA_ID, loadConsent, saveConsent, startAnalytics, stopAnalytics, track } from '../analytics'
import { ConsentBanner } from '../components/ConsentBanner'
import { Footer } from '../components/Footer'
import { LoomMark } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { download } from '../exportDraft'
import { createHistory, type History, record, redo, undo } from '../history'
import { readImagePixels } from '../imageFile'
import { ChartView } from './ChartView'
import {
  blankChart,
  castOn,
  castOnFor,
  colorLetter,
  type KnitChart,
  longFloats,
  MAX_COLORS,
  MAX_ROWS,
  MAX_STITCHES,
  mirror,
  paint,
  parseChart,
  problems,
  resize,
  rowsOf,
  size,
  widthOf,
} from './chart'
import { writtenPattern, writtenRows } from './instructions'
import { KnitLogo } from './KnitLogo'
import { pictureColors } from './picture'
import { drawChart, drawFabric } from './render'
import { SAMPLES } from './samples'
import { STITCH_IDS, STITCHES, type StitchId } from './stitches'
import './knit.css'

const KEY = 'knit-current'
const VIEW_KEY = 'knit-view'

type Brush = { kind: 'stitch'; id: StitchId } | { kind: 'color'; index: number }

interface Saved {
  name: string
  chart: KnitChart
}

function loadCurrent(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    const chart = parseChart(saved?.chart)
    if (chart) return { name: typeof saved.name === 'string' ? saved.name : 'Untitled', chart }
  } catch {
    // start from a sample
  }
  return { name: SAMPLES[2].name, chart: SAMPLES[2].chart() }
}

interface View {
  cell: number
  toGauge: boolean
  repeats: boolean
}

function loadView(): View {
  try {
    const v = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null')
    if (v && typeof v === 'object')
      return {
        cell: typeof v.cell === 'number' && v.cell >= 10 && v.cell <= 40 ? v.cell : 20,
        toGauge: Boolean(v.toGauge),
        repeats: v.repeats !== false,
      }
  } catch {
    // defaults
  }
  return { cell: 20, toGauge: false, repeats: true }
}

const store = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // not remembered
  }
}

/** A labelled panel. */
function Panel({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid={testId}>
      <Typography variant="subtitle2" component="h2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  )
}

/** The knitted fabric, drawn to the gauge's proportions. */
function FabricPreview({ chart, repeats }: { chart: KnitChart; repeats: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const w = widthOf(chart)
    const rows = rowsOf(chart)
    const across = repeats ? Math.max(1, Math.min(4, Math.ceil(36 / w))) : 1
    const up = repeats ? Math.max(1, Math.min(4, Math.ceil(30 / rows))) : 1
    const stitchW = Math.max(4, Math.min(16, 360 / (w * across)))
    drawFabric(ctx, chart, stitchW, across, up)
  }, [chart, repeats])
  return <canvas ref={ref} className="knit-fabric" role="img" aria-label="Knitted fabric preview" />
}

const number = (text: string, min: number, max: number, fallback: number) => {
  const n = Number(text)
  return Number.isFinite(n) && text !== '' ? Math.max(min, Math.min(max, n)) : fallback
}

/**
 * Knit Patterner: design a knitting chart square by square (stitch symbols and colours), see it as knitted fabric,
 * and read it as written row-by-row instructions, with the stitch counts and floats checked.
 */
export default function KnitApp() {
  const [{ name: savedName, chart: savedChart }] = useState(loadCurrent)
  const [name, setName] = useState(savedName)
  const [history, setHistory] = useState<History<KnitChart>>(() => createHistory(savedChart))
  const chart = history.present
  const [brush, setBrush] = useState<Brush>({ kind: 'stitch', id: 'p' })
  const [view, setViewState] = useState(loadView)
  const setView = (patch: Partial<View>) =>
    setViewState((v) => {
      const next = { ...v, ...patch }
      store(VIEW_KEY, next)
      return next
    })
  const [toast, setToast] = useState<string | null>(null)
  const [samplesAnchor, setSamplesAnchor] = useState<HTMLElement | null>(null)
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null)
  const [printImage, setPrintImage] = useState<string | null>(null)
  const [target, setTarget] = useState({ width: '50', edges: '0' })
  const fileInput = useRef<HTMLInputElement>(null)
  const pictureInput = useRef<HTMLInputElement>(null)
  // Whether the current paint stroke has made a step in the history yet (later squares of the stroke join it).
  const stroke = useRef(false)
  const compact = useMediaQuery('(max-width:899px)')
  const phone = useMediaQuery('(max-width:599px)')

  const [consent, setConsentState] = useState<Consent | null>(loadConsent)
  const setConsent = (c: Consent | null) => {
    saveConsent(c)
    setConsentState(c)
  }
  useEffect(() => {
    if (consent === 'granted') startAnalytics()
    else if (consent === 'denied') stopAnalytics()
  }, [consent])

  // Keep the chart in this browser, so it's here next time.
  useEffect(() => {
    const t = setTimeout(() => store(KEY, { name, chart }), 300)
    return () => clearTimeout(t)
  }, [name, chart])
  useEffect(() => {
    const flush = () => store(KEY, { name, chart })
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [name, chart])

  const update = (next: KnitChart, merge = false) => setHistory((h) => record(h, next, merge))
  const replace = (next: KnitChart, newName?: string) => {
    update(next)
    if (newName !== undefined) setName(newName)
  }

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea')) return
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        setHistory(undo)
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault()
        setHistory(redo)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The latest history, for painting: a fast drag paints several squares before React renders again.
  const latest = useRef(history)
  latest.current = history
  const onPaint = (r: number, c: number, start: boolean) => {
    if (start) stroke.current = false
    const h = latest.current
    const next = paint(h.present, r, c, brush.kind === 'stitch' ? { stitch: brush.id } : { color: brush.index })
    if (next === h.present) return
    latest.current = record(h, next, stroke.current)
    stroke.current = true
    setHistory(latest.current)
  }

  const issues = useMemo(() => problems(chart), [chart])
  const floats = useMemo(() => longFloats(chart), [chart])
  const flagged = useMemo(() => {
    const m = new Map<number, string>()
    for (const f of floats) m.set(f.row, `A float of ${f.length} stitches in colour ${colorLetter(f.color)}`)
    for (const p of issues) m.set(p.row, p.message)
    return m
  }, [issues, floats])
  const rows = useMemo(() => writtenRows(chart), [chart])
  const w = widthOf(chart)
  const h = rowsOf(chart)
  const cast = castOn(chart)
  const dims = size(chart)
  const cellH = view.toGauge ? Math.round((view.cell * chart.gauge.stitches) / chart.gauge.rows) : view.cell
  const wanted = castOnFor(
    number(target.width, 1, 1000, 50),
    chart.gauge.stitches,
    cast,
    Math.round(number(target.edges, 0, 50, 0)),
  )

  const chartPng = (cell = 20) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('This browser cannot draw images')
    drawChart(ctx, chart, { cell, cellH: view.toGauge ? (cell * chart.gauge.stitches) / chart.gauge.rows : cell })
    return canvas
  }
  const fileBase = name.trim() || 'Knitting chart'

  const exportAs = (format: 'png' | 'text' | 'file') => {
    setExportAnchor(null)
    track('export', { format: `knit-${format}` })
    if (format === 'file')
      download(
        `${fileBase}.knit.json`,
        JSON.stringify({ app: 'Knit Patterner', version: 1, name, chart }, null, 1),
        'application/json',
      )
    else if (format === 'text') download(`${fileBase}.txt`, writtenPattern(chart, fileBase), 'text/plain')
    else
      chartPng().toBlob((blob) => {
        if (blob) download(`${fileBase}.png`, blob, 'image/png')
      })
  }

  const open = async (file: File | undefined) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      const loaded = parseChart(data?.chart ?? data)
      if (!loaded) throw new Error('not a chart')
      replace(loaded, typeof data?.name === 'string' ? data.name : file.name.replace(/\.knit\.json$|\.json$/, ''))
      setToast(`Opened ${file.name}`)
    } catch {
      setToast(`${file.name} isn't a Knit Patterner chart`)
    }
  }

  const fromPicture = async (file: File | undefined) => {
    if (!file) return
    try {
      const count = Math.max(2, chart.colors.length)
      const { colors, grid } = pictureColors(await readImagePixels(file), w, h, count)
      update({ ...chart, colors, color: grid })
      setToast(`Coloured from ${file.name}, in ${colors.length} colours`)
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e))
    }
  }

  const print = () => {
    setPrintImage(chartPng(16).toDataURL('image/png'))
    track('export', { format: 'knit-print' })
  }
  useEffect(() => {
    if (printImage) window.print()
  }, [printImage])

  const removeColor = (index: number) => {
    if (chart.colors.length < 2) return
    update({
      ...chart,
      colors: chart.colors.filter((_, i) => i !== index),
      color: chart.color.map((row) => row.map((v) => (v === index ? 0 : v > index ? v - 1 : v))),
    })
    setBrush({ kind: 'color', index: 0 })
  }

  const action = (
    label: string,
    icon: ReactNode,
    onClick: (e: React.MouseEvent<HTMLElement>) => void,
    disabled = false,
  ) =>
    compact ? (
      <Tooltip title={label}>
        <span>
          <IconButton color="inherit" aria-label={label} onClick={onClick} disabled={disabled}>
            {icon}
          </IconButton>
        </span>
      </Tooltip>
    ) : (
      <Button color="inherit" startIcon={icon} onClick={onClick} disabled={disabled}>
        {label}
      </Button>
    )

  return (
    <>
      <AppBar position="sticky" className="screen-only">
        <Toolbar sx={{ gap: { xs: 0, sm: 0.5 }, px: { xs: 1, sm: 2 } }}>
          <KnitLogo compact={compact} />
          <Box sx={{ flexGrow: 1 }} />
          {action('New', <InsertDriveFileIcon />, () => replace(blankChart(), 'Untitled'))}
          {action('Samples', <LibraryBooksIcon />, (e) => setSamplesAnchor(e.currentTarget))}
          {!phone && action('Open', <FolderOpenIcon />, () => fileInput.current?.click())}
          {action('Export', <DownloadIcon />, (e) => setExportAnchor(e.currentTarget))}
          {!phone && action('Print', <PrintIcon />, print)}
          {action('Undo', <UndoIcon />, () => setHistory(undo), history.past.length === 0)}
          {action('Redo', <RedoIcon />, () => setHistory(redo), history.future.length === 0)}
          <ThemeToggle />
          <Tooltip title="Weave Patterner: weaving drafts">
            <IconButton color="inherit" component="a" href="../" aria-label="Weave Patterner">
              <LoomMark size={26} />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Menu anchorEl={samplesAnchor} open={samplesAnchor !== null} onClose={() => setSamplesAnchor(null)}>
        {SAMPLES.map((s) => (
          <MenuItem
            key={s.name}
            onClick={() => {
              setSamplesAnchor(null)
              replace(s.chart(), s.name)
            }}
          >
            <ListItemText primary={s.name} secondary={s.about} />
          </MenuItem>
        ))}
      </Menu>
      <Menu anchorEl={exportAnchor} open={exportAnchor !== null} onClose={() => setExportAnchor(null)}>
        <MenuItem onClick={() => exportAs('png')}>Chart image (PNG)</MenuItem>
        <MenuItem onClick={() => exportAs('text')}>Written pattern (text)</MenuItem>
        <MenuItem onClick={() => exportAs('file')}>
          <SaveIcon fontSize="small" sx={{ mr: 1 }} />
          Chart file (to open again)
        </MenuItem>
        {phone && (
          <MenuItem
            onClick={() => {
              setExportAnchor(null)
              fileInput.current?.click()
            }}
          >
            Open a chart file…
          </MenuItem>
        )}
        {phone && (
          <MenuItem
            onClick={() => {
              setExportAnchor(null)
              print()
            }}
          >
            Print…
          </MenuItem>
        )}
      </Menu>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label="Chart file to open"
        onChange={(e) => {
          open(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={pictureInput}
        type="file"
        accept="image/*"
        hidden
        aria-label="Picture for the colours"
        onChange={(e) => {
          fromPicture(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <Box component="main" className="screen-only" sx={{ p: { xs: 1.5, sm: 2, md: 3 }, pb: 10 }}>
        <Typography variant="h5" component="h1" sx={{ position: 'absolute', left: -10000 }}>
          Knit Patterner: knitting chart designer
        </Typography>
        <Stack sx={{ gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ width: 200 }}
              />
              <TextField
                size="small"
                type="number"
                label="Stitches"
                value={w}
                onChange={(e) => update(resize(chart, number(e.target.value, 1, MAX_STITCHES, w), h))}
                slotProps={{ htmlInput: { min: 1, max: MAX_STITCHES } }}
                sx={{ width: 100 }}
              />
              <TextField
                size="small"
                type="number"
                label="Rows"
                value={h}
                onChange={(e) => update(resize(chart, w, number(e.target.value, 1, MAX_ROWS, h)))}
                slotProps={{ htmlInput: { min: 1, max: MAX_ROWS } }}
                sx={{ width: 100 }}
              />
              <ToggleButtonGroup
                size="small"
                exclusive
                value={chart.mode}
                onChange={(_, mode) => mode && update({ ...chart, mode })}
                aria-label="Knitted"
              >
                <ToggleButton value="flat">Flat</ToggleButton>
                <ToggleButton value="round">In the round</ToggleButton>
              </ToggleButtonGroup>
              <TextField
                size="small"
                type="number"
                label="Stitches per 10 cm"
                value={chart.gauge.stitches}
                onChange={(e) =>
                  update({
                    ...chart,
                    gauge: { ...chart.gauge, stitches: number(e.target.value, 1, 100, chart.gauge.stitches) },
                  })
                }
                sx={{ width: 150 }}
              />
              <TextField
                size="small"
                type="number"
                label="Rows per 10 cm"
                value={chart.gauge.rows}
                onChange={(e) =>
                  update({
                    ...chart,
                    gauge: { ...chart.gauge, rows: number(e.target.value, 1, 150, chart.gauge.rows) },
                  })
                }
                sx={{ width: 140 }}
              />
              <TextField
                size="small"
                type="number"
                label="Longest float"
                value={chart.floatLimit}
                onChange={(e) =>
                  update({ ...chart, floatLimit: Math.round(number(e.target.value, 1, 50, chart.floatLimit)) })
                }
                helperText="stitches"
                sx={{ width: 120 }}
              />
              <FormControlLabel
                control={<Switch checked={view.toGauge} onChange={(e) => setView({ toGauge: e.target.checked })} />}
                label="Squares to gauge"
              />
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, width: 180 }}>
                <Typography variant="body2" id="knit-zoom">
                  Zoom
                </Typography>
                <Slider
                  size="small"
                  min={10}
                  max={40}
                  value={view.cell}
                  onChange={(_, v) => setView({ cell: v as number })}
                  aria-labelledby="knit-zoom"
                />
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack sx={{ gap: 1.5 }}>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ minWidth: 60 }}>
                  Stitches
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  aria-label="Stitch to paint"
                  value={brush.kind === 'stitch' ? brush.id : null}
                  onChange={(_, id) => id && setBrush({ kind: 'stitch', id })}
                  sx={{ flexWrap: 'wrap' }}
                >
                  {STITCH_IDS.map((id) => {
                    const s = STITCHES[id]
                    return (
                      <Tooltip key={id} title={`${s.name}${s.rs ? ` (${s.rs})` : ''}`}>
                        <ToggleButton value={id} aria-label={s.name} sx={{ px: 0.75 }}>
                          <StitchSwatch id={id} />
                        </ToggleButton>
                      </Tooltip>
                    )
                  })}
                </ToggleButtonGroup>
              </Stack>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ minWidth: 60 }}>
                  Colours
                </Typography>
                {chart.colors.map((color, i) => (
                  <Stack
                    // biome-ignore lint/suspicious/noArrayIndexKey: colours are numbered by position
                    key={i}
                    direction="row"
                    sx={{ alignItems: 'center', gap: 0.5 }}
                  >
                    <ToggleButton
                      size="small"
                      value={i}
                      selected={brush.kind === 'color' && brush.index === i}
                      onChange={() => setBrush({ kind: 'color', index: i })}
                      aria-label={`Paint colour ${colorLetter(i)}`}
                      sx={{ px: 1, gap: 0.75 }}
                    >
                      <Box sx={{ width: 18, height: 18, bgcolor: color, border: '1px solid #888' }} />
                      {colorLetter(i)}
                    </ToggleButton>
                    <input
                      type="color"
                      className="picker"
                      aria-label={`Colour ${colorLetter(i)}`}
                      value={color}
                      onChange={(e) =>
                        update({ ...chart, colors: chart.colors.map((c, j) => (j === i ? e.target.value : c)) })
                      }
                    />
                  </Stack>
                ))}
                <Tooltip title="Add a colour">
                  <span>
                    <IconButton
                      aria-label="Add a colour"
                      disabled={chart.colors.length >= MAX_COLORS}
                      onClick={() => update({ ...chart, colors: [...chart.colors, '#888888'] })}
                    >
                      <AddIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                {brush.kind === 'color' && chart.colors.length > 1 && (
                  <Tooltip title={`Remove colour ${colorLetter(brush.index)} (its squares become A)`}>
                    <IconButton aria-label="Remove the selected colour" onClick={() => removeColor(brush.index)}>
                      <RemoveIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                <Button size="small" variant="outlined" startIcon={<FlipIcon />} onClick={() => update(mirror(chart))}>
                  Mirror
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  onClick={() => pictureInput.current?.click()}
                >
                  Colours from a picture
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const blank = blankChart(w, h)
                    update({ ...chart, stitch: blank.stitch, color: blank.color })
                  }}
                >
                  Clear
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ gap: 2, alignItems: 'flex-start' }}>
            <Paper variant="outlined" sx={{ p: 1, overflow: 'auto', maxWidth: '100%', flex: 'none' }}>
              <ChartView chart={chart} cell={view.cell} cellH={cellH} flagged={flagged} onPaint={onPaint} />
            </Paper>
            <Stack sx={{ gap: 2, flex: 1, minWidth: 0, width: { xs: '100%', lg: 'auto' } }}>
              {(issues.length > 0 || floats.length > 0) && (
                <Stack sx={{ gap: 1 }} data-testid="knit-problems">
                  {issues.slice(0, 5).map((p) => (
                    <Alert key={`${p.row}-${p.message}`} severity="warning">
                      {p.message}
                    </Alert>
                  ))}
                  {issues.length > 5 && <Alert severity="warning">…and {issues.length - 5} more.</Alert>}
                  {floats.slice(0, 3).map((f) => (
                    <Alert key={f.row} severity="info">
                      Row {f.row}: colour {colorLetter(f.color)} floats behind {f.length} stitches (about{' '}
                      {((f.length * 10) / chart.gauge.stitches).toFixed(1)} cm). Catch it every {chart.floatLimit}{' '}
                      stitches or so.
                    </Alert>
                  ))}
                  {floats.length > 3 && (
                    <Alert severity="info">…and {floats.length - 3} more rows with long floats.</Alert>
                  )}
                </Stack>
              )}
              <Panel title="Size" testId="knit-size">
                <Typography variant="body2">
                  Cast on {cast} stitches. The chart is {w} stitches by {h} {chart.mode === 'round' ? 'rounds' : 'rows'}
                  : about {dims.width.toFixed(1)} × {dims.height.toFixed(1)} cm at {chart.gauge.stitches} stitches and{' '}
                  {chart.gauge.rows} rows to 10 cm.
                </Typography>
                <Stack direction="row" sx={{ gap: 1.5, mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    type="number"
                    label="Finished width (cm)"
                    value={target.width}
                    onChange={(e) => setTarget((t) => ({ ...t, width: e.target.value }))}
                    sx={{ width: 150 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Edge stitches"
                    value={target.edges}
                    onChange={(e) => setTarget((t) => ({ ...t, edges: e.target.value }))}
                    sx={{ width: 120 }}
                  />
                  <Typography variant="body2" data-testid="knit-cast-on">
                    Cast on {wanted} stitches (
                    {Math.round((wanted - Math.round(number(target.edges, 0, 50, 0))) / Math.max(1, cast))} repeats of{' '}
                    {cast}
                    {Number(target.edges) > 0 ? ` + ${Math.round(number(target.edges, 0, 50, 0))}` : ''}), about{' '}
                    {((wanted * 10) / chart.gauge.stitches).toFixed(1)} cm.
                  </Typography>
                </Stack>
              </Panel>
              <Panel title="Knitted preview">
                <FabricPreview chart={chart} repeats={view.repeats} />
                <FormControlLabel
                  control={<Switch checked={view.repeats} onChange={(e) => setView({ repeats: e.target.checked })} />}
                  label="Show repeats"
                />
              </Panel>
              <Panel title="Written pattern" testId="knit-written">
                <Stack direction="row" sx={{ gap: 1, mb: 1 }}>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText(writtenPattern(chart, fileBase))
                        .then(() => setToast('Written pattern copied'))
                        .catch(() => setToast("Couldn't copy: use Export instead"))
                    }
                  >
                    Copy
                  </Button>
                </Stack>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Cast on {cast} stitches
                  {chart.mode === 'round' ? ' and join in the round.' : '. Row 1 is a right-side row.'}
                </Typography>
                <ol className="knit-written">
                  {[...rows].reverse().map((r) => (
                    <li key={r.row} data-row={r.row}>
                      <strong>
                        {r.label}
                        {r.side ? ` (${r.side})` : ''}:
                      </strong>{' '}
                      {r.text}.{r.stitches !== null && ` (${r.stitches} sts)`}
                    </li>
                  ))}
                </ol>
              </Panel>
            </Stack>
          </Stack>
        </Stack>
      </Box>

      <div className="print-only knit-print">
        <h1>{fileBase}</h1>
        {printImage && <img src={printImage} alt={`${fileBase} chart`} />}
        <pre>{writtenPattern(chart, fileBase)}</pre>
      </div>

      <Box className="screen-only">
        <Footer onAnalytics={GA_ID ? () => setConsent(null) : undefined} />
      </Box>
      {GA_ID && consent === null && (
        <ConsentBanner app="Knit Patterner" onChoose={(allow) => setConsent(allow ? 'granted' : 'denied')} />
      )}
      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  )
}

/** A stitch's chart symbol, as on the chart, for the palette. */
function StitchSwatch({ id }: { id: StitchId }) {
  const s = STITCHES[id]
  if (s.cable)
    return (
      <span className="knit-palette-symbol" style={{ width: 11 * s.cable, fontSize: 10 }}>
        {s.rs}
      </span>
    )
  return (
    <span
      className="knit-palette-symbol"
      style={id === 'none' ? { background: '#9e9e9e' } : { fontSize: s.symbol.length > 1 ? 10 : 15 }}
    >
      {s.symbol}
    </span>
  )
}
