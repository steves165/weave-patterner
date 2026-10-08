import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import ClearAllIcon from '@mui/icons-material/ClearAll'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FlipIcon from '@mui/icons-material/Flip'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import GridOnIcon from '@mui/icons-material/GridOn'
import HighlightAltIcon from '@mui/icons-material/HighlightAlt'
import ImageIcon from '@mui/icons-material/Image'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import NotesIcon from '@mui/icons-material/Notes'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PrintIcon from '@mui/icons-material/Print'
import RedoIcon from '@mui/icons-material/Redo'
import RemoveIcon from '@mui/icons-material/Remove'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import {
  AppBar,
  Box,
  Button,
  Divider,
  FormControlLabel,
  IconButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
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
} from '@mui/material'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { type Consent, GA_ID, loadConsent, saveConsent, startAnalytics, stopAnalytics, track } from '../analytics'
import { Action, NavTab, PhoneNav, Rule } from '../components/AppBarParts'
import { ConsentBanner } from '../components/ConsentBanner'
import { FooterLinks } from '../components/FooterLinks'
import { WeaveMark } from '../components/Logo'
import { SettingsSheet, SettingsSidebar } from '../components/SettingsFrame'
import { FIELD_GRID, SWITCH_ROW } from '../components/SettingsPanel'
import { StatusFrame, Warning } from '../components/StatusBar'
import { ThemeToggle } from '../components/ThemeToggle'
import { LoadDialog } from '../dialogs/LoadDialog'
import { SaveDialog } from '../dialogs/SaveDialog'
import { download } from '../exportDraft'
import { createHistory, type History, record, redo, undo } from '../history'
import { readImagePixels } from '../imageFile'
import { useCompact, useMidWidth, useNarrow, usePhone, useRoomForSidebar, useTouch } from '../layout'
import { patternStore } from '../storage'
import { MONO_FONT } from '../theme'
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
  repeatStitches,
  resize,
  rowsOf,
  size,
  widthOf,
} from './chart'
import { type Clip, clear, copy, paste, type Rect } from './edit'
import { castOnText, writtenPattern, writtenRows } from './instructions'
import { KnitLogo } from './KnitLogo'
import { KnitThumb } from './KnitThumb'
import { KnittingMode } from './KnittingMode'
import { pictureColors } from './picture'
import { drawChart, drawFabric } from './render'
import { SelectionBar } from './SelectionBar'
import { SAMPLES } from './samples'
import { STITCH_IDS, STITCHES, type StitchId } from './stitches'
import { yarnNeeded } from './yarn'
import './knit.css'

/** Charts saved by name in this browser, like Weave Patterner's patterns but kept apart from them. */
const knitStore = patternStore<KnitChart>('knit-patterner')
const knitThumb = (chart: KnitChart) => <KnitThumb chart={chart} />
const knitLine = (chart: KnitChart) =>
  `${widthOf(chart)} stitches × ${rowsOf(chart)} ${chart.mode === 'round' ? 'rounds' : 'rows'}`

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
  /** Whether the settings sidebar is open, once chosen (until then, open on wide screens). */
  sidebar: boolean | null
}

function loadView(): View {
  try {
    const v = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null')
    if (v && typeof v === 'object')
      return {
        cell: typeof v.cell === 'number' && v.cell >= 10 && v.cell <= 40 ? v.cell : 20,
        toGauge: Boolean(v.toGauge),
        repeats: v.repeats !== false,
        sidebar: typeof v.sidebar === 'boolean' ? v.sidebar : null,
      }
  } catch {
    // defaults
  }
  return { cell: 20, toGauge: false, repeats: true, sidebar: null }
}

const store = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // not remembered
  }
}

/** A card holding one part of the pattern: its size, the knitted preview or the written pattern. */
function Panel({
  title,
  children,
  testId,
  delay = 0,
}: {
  title: string
  children: ReactNode
  testId?: string
  /** When it eases in, in ms after the chart. */
  delay?: number
}) {
  return (
    <Paper
      variant="outlined"
      className="wp-enter"
      style={{ ['--delay' as string]: `${delay}ms` }}
      sx={{ p: 2.5, borderRadius: '20px', bgcolor: 'var(--wp-paper)', boxShadow: '0 1px 2px var(--wp-shadow-soft)' }}
      data-testid={testId}
    >
      <Typography variant="h2" sx={{ fontSize: 17, mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  )
}

/** A heading and its settings, in the sidebar or sheet. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    // Room above each outlined field for its floating label.
    <Stack component="section" sx={{ gap: 2 }}>
      <Typography variant="h2" sx={{ fontSize: 17, m: 0 }}>
        {title}
      </Typography>
      {children}
    </Stack>
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
    // Drawn about 900px wide (sharper on high-density screens) and shown filling the panel.
    const stitchW = Math.max(8, Math.min(48, 900 / (w * across)))
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
  const [dialog, setDialog] = useState<'save' | 'load' | 'knitting' | null>(null)
  const [fileAnchor, setFileAnchor] = useState<HTMLElement | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  // Selecting squares instead of painting them, what's selected, and what's been copied.
  const [selecting, setSelecting] = useState(false)
  const [selection, setSelection] = useState<Rect | null>(null)
  const [clip, setClip] = useState<Clip | null>(null)
  const [printImage, setPrintImage] = useState<string | null>(null)
  const [target, setTarget] = useState({ width: '50', edges: '0', length: '60', ball: '200' })
  const fileInput = useRef<HTMLInputElement>(null)
  const pictureInput = useRef<HTMLInputElement>(null)
  // Whether the current paint stroke has made a step in the history yet (later squares of the stroke join it).
  const stroke = useRef(false)
  const compact = useCompact()
  const phone = usePhone()
  const touch = useTouch()
  const narrow = useNarrow() || compact
  const fileCompact = useMidWidth() || compact
  const roomForSidebar = useRoomForSidebar()

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

  // Shortcuts for the selection: copy, cut, paste, clear and done.
  useEffect(() => {
    if (!selection) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, [role="dialog"]')) return
      const k = e.key.toLowerCase()
      const mod = e.ctrlKey || e.metaKey
      if (e.key === 'Escape') setSelection(null)
      else if (e.key === 'Delete' || e.key === 'Backspace') update(clear(chart, selection))
      else if (mod && k === 'c') setClip(copy(chart, selection))
      else if (mod && k === 'x') {
        setClip(copy(chart, selection))
        update(clear(chart, selection))
      } else if (mod && k === 'v' && clip) update(paste(chart, clip, selection.r0, selection.c0))
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

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
  // Written rows the last change rewrote, so they flash (not when most of them change, as for a new chart).
  const lastRows = useRef<Map<number, string> | null>(null)
  const [rewritten, setRewritten] = useState<Set<number>>(() => new Set())
  useEffect(() => {
    const texts = new Map(rows.map((r) => [r.row, `${r.text}${r.stitches}`]))
    const last = lastRows.current
    lastRows.current = texts
    const diff = new Set<number>()
    if (last && last.size === texts.size) for (const [row, text] of texts) if (last.get(row) !== text) diff.add(row)
    if (diff.size === 0 || diff.size > texts.size / 2) {
      setRewritten((d) => (d.size ? new Set() : d))
      return
    }
    setRewritten(diff)
    const done = setTimeout(() => setRewritten(new Set()), 1250)
    return () => clearTimeout(done)
  }, [rows])
  const w = widthOf(chart)
  const h = rowsOf(chart)
  const cast = castOn(chart)
  const dims = size(chart)
  const cellH = view.toGauge ? Math.round((view.cell * chart.gauge.stitches) / chart.gauge.rows) : view.cell
  // Casting on for a width: whole repeats (of the repeat box, or else the whole chart), plus any edge stitches.
  const boxed = repeatStitches(chart)
  const unit = boxed?.repeat ?? cast
  const extra = Math.round(number(target.edges, 0, 50, 0)) + (boxed?.edges ?? 0)
  const wanted = castOnFor(number(target.width, 1, 1000, 50), chart.gauge.stitches, unit, extra)

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

  const summary = `${w} stitches × ${h} ${chart.mode === 'round' ? 'rounds' : 'rows'} · ${chart.mode === 'round' ? 'in the round' : 'flat'}`
  const analyticsChoice = GA_ID ? () => setConsent(null) : undefined
  const weaveLinks = (fontSize?: number) => (
    <FooterLinks other={{ href: '../', label: 'Weave Patterner' }} onAnalytics={analyticsChoice} fontSize={fontSize} />
  )
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const closeThen = (fn: () => void) => () => {
    setFileAnchor(null)
    fn()
  }

  const settings = (
    <Stack sx={{ gap: 2.5 }} divider={<Divider flexItem />}>
      <Section title="Chart">
        <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
        <Box sx={FIELD_GRID}>
          <TextField
            size="small"
            type="number"
            label="Stitches"
            value={w}
            onChange={(e) => update(resize(chart, number(e.target.value, 1, MAX_STITCHES, w), h))}
            slotProps={{ htmlInput: { min: 1, max: MAX_STITCHES } }}
          />
          <TextField
            size="small"
            type="number"
            label="Rows"
            value={h}
            onChange={(e) => update(resize(chart, w, number(e.target.value, 1, MAX_ROWS, h)))}
            slotProps={{ htmlInput: { min: 1, max: MAX_ROWS } }}
          />
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={chart.mode}
          onChange={(_, mode) => mode && update({ ...chart, mode })}
          aria-label="Knitted"
          sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
        >
          <ToggleButton value="flat">Flat</ToggleButton>
          <ToggleButton value="round">In the round</ToggleButton>
        </ToggleButtonGroup>
      </Section>
      <Section title="Gauge">
        <Box sx={FIELD_GRID}>
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
          />
          <TextField
            size="small"
            type="number"
            label="Rows per 10 cm"
            value={chart.gauge.rows}
            onChange={(e) =>
              update({ ...chart, gauge: { ...chart.gauge, rows: number(e.target.value, 1, 150, chart.gauge.rows) } })
            }
          />
        </Box>
        <FormControlLabel
          labelPlacement="start"
          control={<Switch checked={view.toGauge} onChange={(e) => setView({ toGauge: e.target.checked })} />}
          label="Squares to gauge"
          sx={SWITCH_ROW}
        />
      </Section>
      <Section title="Colourwork">
        <TextField
          size="small"
          type="number"
          label="Longest float"
          value={chart.floatLimit}
          onChange={(e) =>
            update({ ...chart, floatLimit: Math.round(number(e.target.value, 1, 50, chart.floatLimit)) })
          }
          helperText="stitches, before the yarn behind needs catching"
          fullWidth
        />
      </Section>
      <Section title="View">
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, minHeight: 40 }}>
          <Typography id="knit-zoom" sx={{ flex: 'none', width: 56, fontWeight: 500 }}>
            Zoom
          </Typography>
          <Slider
            size="small"
            min={10}
            max={40}
            value={view.cell}
            onChange={(_, v) => setView({ cell: v as number })}
            aria-labelledby="knit-zoom"
            sx={{ flex: '1 1 auto' }}
          />
          <Typography
            color="text.secondary"
            sx={{ flex: 'none', width: 44, textAlign: 'right', fontFamily: MONO_FONT, fontSize: 13 }}
          >
            {view.cell} px
          </Typography>
        </Stack>
      </Section>
      <Section title="Change the chart">
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<FlipIcon />}
            onClick={() => update(mirror(chart))}
          >
            Mirror
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<ImageIcon />}
            onClick={() => pictureInput.current?.click()}
          >
            Colours from a picture
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<ClearAllIcon />}
            onClick={() => {
              const blank = blankChart(w, h)
              update({ ...chart, stitch: blank.stitch, color: blank.color })
            }}
          >
            Clear
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {touch
            ? 'Pick a stitch or colour, then tap squares to paint them; swipe to move around the chart.'
            : 'Pick a stitch or colour, then click or drag across the chart; arrow keys and Space work too. Ctrl+Z undoes.'}
        </Typography>
      </Section>
    </Stack>
  )

  const fileMenuItems = [
    <MenuItem key="new" onClick={closeThen(() => replace(blankChart(), 'Untitled'))}>
      <ListItemIcon>
        <InsertDriveFileIcon fontSize="small" />
      </ListItemIcon>
      New
    </MenuItem>,
    <MenuItem key="save" onClick={closeThen(() => setDialog('save'))}>
      <ListItemIcon>
        <SaveIcon fontSize="small" />
      </ListItemIcon>
      Save
    </MenuItem>,
    <MenuItem key="load" onClick={closeThen(() => setDialog('load'))}>
      <ListItemIcon>
        <FolderOpenIcon fontSize="small" />
      </ListItemIcon>
      Load
    </MenuItem>,
    <MenuItem key="import" onClick={closeThen(() => fileInput.current?.click())}>
      <ListItemIcon>
        <FileUploadIcon fontSize="small" />
      </ListItemIcon>
      Import a chart file…
    </MenuItem>,
    <MenuItem key="print" onClick={closeThen(print)}>
      <ListItemIcon>
        <PrintIcon fontSize="small" />
      </ListItemIcon>
      Print…
    </MenuItem>,
    <Divider key="d" />,
    <ListSubheader key="export">Export</ListSubheader>,
    <MenuItem key="png" onClick={closeThen(() => exportAs('png'))}>
      Chart image (PNG)
    </MenuItem>,
    <MenuItem key="text" onClick={closeThen(() => exportAs('text'))}>
      Written pattern (text)
    </MenuItem>,
    <MenuItem key="file" onClick={closeThen(() => exportAs('file'))}>
      Chart file (to open again)
    </MenuItem>,
  ]

  return (
    <>
      <AppBar position="sticky" className="screen-only">
        <Toolbar
          sx={{
            gap: compact ? 0.25 : 1,
            flexWrap: 'nowrap',
            py: 1,
            px: { xs: 1, sm: 2.5 },
            minHeight: { xs: 60, sm: 64 },
          }}
        >
          <Box sx={{ display: 'flex', flex: 'none', ml: phone ? 0.5 : 0 }}>
            <KnitLogo compact={narrow} />
          </Box>
          {!compact && <Rule />}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              flex: compact ? '1 1 auto' : '0 1 auto',
              ml: compact ? 1 : 0,
            }}
          >
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, fontSize: 15 }}>
              {name.trim() || 'Untitled'}
            </Typography>
            <Typography variant="caption" noWrap color="text.secondary">
              {summary}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flex: 'none' }}>
            <Action
              compact
              iconOnly
              icon={<UndoIcon />}
              label="Undo"
              onClick={() => setHistory(undo)}
              disabled={history.past.length === 0}
            />
            <Action
              compact
              iconOnly
              icon={<RedoIcon />}
              label="Redo"
              onClick={() => setHistory(redo)}
              disabled={history.future.length === 0}
            />
          </Box>
          {!compact && <Box sx={{ flex: '1 1 0px' }} />}
          {!phone && (
            <Box
              component="nav"
              aria-label="File"
              sx={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 'none' }}
            >
              <Action
                compact={fileCompact}
                icon={<InsertDriveFileIcon />}
                label="New"
                onClick={() => replace(blankChart(), 'Untitled')}
              />
              <Action compact={fileCompact} icon={<SaveIcon />} label="Save" onClick={() => setDialog('save')} />
              <Action compact={fileCompact} icon={<FolderOpenIcon />} label="Load" onClick={() => setDialog('load')} />
              <Action
                compact={fileCompact}
                icon={<LibraryBooksIcon />}
                label="Samples"
                onClick={(e) => setSamplesAnchor(e.currentTarget)}
              />
              <Action
                compact={fileCompact}
                icon={<FileUploadIcon />}
                label="Import"
                onClick={() => fileInput.current?.click()}
              />
              <Action
                compact={fileCompact}
                icon={<DownloadIcon />}
                label="Export"
                onClick={(e) => setExportAnchor(e.currentTarget)}
              />
              <Action compact={fileCompact} icon={<PrintIcon />} label="Print" onClick={print} />
            </Box>
          )}
          {!compact && <Rule />}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? '2px' : 1, flex: 'none' }}>
            {compact ? (
              <Tooltip title="Start knitting" describeChild>
                <IconButton
                  aria-label="Start knitting"
                  onClick={() => setDialog('knitting')}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 3,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <PlayArrowIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Action
                compact={false}
                variant="contained"
                icon={<PlayArrowIcon />}
                label="Start knitting"
                onClick={() => setDialog('knitting')}
              />
            )}
            <ThemeToggle />
            <Tooltip title="Weave Patterner: weaving drafts">
              <IconButton component="a" href="../" aria-label="Weave Patterner" sx={{ p: 1 }}>
                <WeaveMark size={26} />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      {phone && (
        <Box className="screen-only">
          <PhoneNav>
            <NavTab
              current
              icon={<GridOnIcon />}
              label="Chart"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
            <NavTab icon={<LibraryBooksIcon />} label="Samples" onClick={(e) => setSamplesAnchor(e.currentTarget)} />
            <NavTab icon={<NotesIcon />} label="Pattern" onClick={() => scrollTo('knit-written-pattern')} />
            <NavTab icon={<SaveIcon />} label="File" onClick={(e) => setFileAnchor(e.currentTarget)} />
          </PhoneNav>
          <Menu anchorEl={fileAnchor} open={fileAnchor !== null} onClose={() => setFileAnchor(null)}>
            {fileMenuItems}
          </Menu>
        </Box>
      )}
      <SaveDialog
        open={dialog === 'save'}
        draft={chart}
        store={knitStore}
        currentName={name.trim() && name !== 'Untitled' ? name.trim() : null}
        onClose={() => setDialog(null)}
        onSaved={(n) => {
          setName(n)
          setDialog(null)
          setToast(`Saved "${n}"`)
        }}
      />
      <KnittingMode
        open={dialog === 'knitting'}
        chart={chart}
        name={name.trim() || 'Untitled'}
        onClose={() => setDialog(null)}
      />
      <LoadDialog
        open={dialog === 'load'}
        store={knitStore}
        thumb={knitThumb}
        describe={knitLine}
        onClose={() => setDialog(null)}
        onLoad={(p) => {
          const loaded = parseChart(p.draft)
          setDialog(null)
          if (!loaded) return setToast(`"${p.name}" couldn't be read`)
          replace(loaded, p.name)
          setToast(`Loaded "${p.name}"`)
        }}
        onRenamed={(from, to) => {
          if (to && name === from) setName(to)
        }}
      />
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

      <Box
        className="screen-only"
        sx={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          pb: phone ? 'calc(70px + env(safe-area-inset-bottom, 0px))' : 0,
        }}
      >
        <Box sx={{ flex: '1 0 auto', display: 'flex', alignItems: 'stretch' }}>
          <Box component="main" sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ position: 'absolute', left: -10000 }}>
              Knit Patterner: knitting chart designer
            </Typography>
            {/* The palette: the stitch or colour to paint with. */}
            <Stack sx={{ gap: 1.25, px: { xs: 1.75, sm: 3 }, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60, fontWeight: 600 }}>
                  Stitches
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  aria-label="Stitch to paint"
                  value={brush.kind === 'stitch' && !selecting ? brush.id : null}
                  onChange={(_, id) => {
                    if (!id) return
                    setBrush({ kind: 'stitch', id })
                    setSelecting(false)
                    setSelection(null)
                  }}
                  // Softer corners than a pill, since it wraps onto more lines on small screens.
                  sx={{ borderRadius: '22px' }}
                >
                  {STITCH_IDS.map((id) => {
                    const s = STITCHES[id]
                    return (
                      <Tooltip key={id} title={`${s.name}${s.rs ? ` (${s.rs})` : ''}`}>
                        <ToggleButton value={id} aria-label={s.name} sx={{ px: 0.75, minWidth: 36 }}>
                          <StitchSwatch id={id} />
                        </ToggleButton>
                      </Tooltip>
                    )
                  })}
                </ToggleButtonGroup>
                <Tooltip
                  title="Select squares to copy, paste, flip, repeat or make the pattern repeat (or Shift and the arrow keys)"
                  describeChild
                >
                  <ToggleButton
                    size="small"
                    value="select"
                    selected={selecting}
                    onChange={() => {
                      setSelecting(!selecting)
                      if (selecting) setSelection(null)
                    }}
                    sx={{ gap: 0.75, px: 1.5, borderRadius: 999, border: 0, bgcolor: 'var(--wp-seg)' }}
                  >
                    <HighlightAltIcon fontSize="small" />
                    Select
                  </ToggleButton>
                </Tooltip>
              </Stack>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60, fontWeight: 600 }}>
                  Colours
                </Typography>
                {chart.colors.map((color, i) => (
                  <Stack
                    // biome-ignore lint/suspicious/noArrayIndexKey: colours are numbered by position
                    key={i}
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      gap: 0.5,
                      p: '3px',
                      pr: 0.75,
                      borderRadius: 999,
                      bgcolor: 'var(--wp-seg)',
                    }}
                  >
                    <ToggleButton
                      size="small"
                      value={i}
                      selected={brush.kind === 'color' && brush.index === i && !selecting}
                      onChange={() => {
                        setBrush({ kind: 'color', index: i })
                        setSelecting(false)
                        setSelection(null)
                      }}
                      aria-label={`Paint colour ${colorLetter(i)}`}
                      sx={{ px: 1.25, gap: 0.75, border: 0, borderRadius: 999 }}
                    >
                      <Box
                        sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: color, border: '1px solid #888' }}
                      />
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
                      style={{ width: 32, height: 32, padding: 2 }}
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
            </Stack>

            {selection && (
              <Box sx={{ px: { xs: 1.25, sm: 3 }, pt: { xs: 1.5, sm: 2 } }}>
                <SelectionBar
                  chart={chart}
                  selection={selection}
                  clip={clip}
                  onChange={(next, message, moved) => {
                    update(next)
                    if (moved !== undefined) setSelection(moved)
                    setToast(message)
                  }}
                  onClip={(c) => {
                    setClip(c)
                    setToast(`Copied ${c.stitch[0].length} × ${c.stitch.length} squares`)
                  }}
                  onDone={() => setSelection(null)}
                />
              </Box>
            )}

            <Stack
              direction={{ xs: 'column', xl: 'row' }}
              sx={{ gap: { xs: 2, sm: 3 }, alignItems: 'flex-start', px: { xs: 1.25, sm: 3 }, py: { xs: 1.5, sm: 3 } }}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.5, sm: 3 },
                  overflow: 'auto',
                  maxWidth: '100%',
                  flex: 'none',
                  boxSizing: 'border-box',
                  borderRadius: { xs: '20px', sm: '26px' },
                  bgcolor: 'var(--wp-paper)',
                  boxShadow: '0 1px 2px var(--wp-shadow-soft), 0 12px 32px var(--wp-shadow)',
                  alignSelf: { xs: 'center', xl: 'flex-start' },
                }}
                className="wp-enter"
              >
                <ChartView
                  chart={chart}
                  cell={view.cell}
                  cellH={cellH}
                  flagged={flagged}
                  onPaint={onPaint}
                  selecting={selecting}
                  selection={selection}
                  onSelect={setSelection}
                />
              </Paper>
              <Stack sx={{ gap: 2, flex: 1, minWidth: 0, width: { xs: '100%', xl: 'auto' } }}>
                <Panel title="Size" testId="knit-size" delay={60}>
                  <Typography variant="body2">
                    Cast on {cast} stitches. The chart is {w} stitches by {h}{' '}
                    {chart.mode === 'round' ? 'rounds' : 'rows'}: about {dims.width.toFixed(1)} ×{' '}
                    {dims.height.toFixed(1)} cm at {chart.gauge.stitches} stitches and {chart.gauge.rows} rows to 10 cm.
                  </Typography>
                  <Stack direction="row" sx={{ gap: 1.5, mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                      size="small"
                      type="number"
                      label="Finished width (cm)"
                      value={target.width}
                      onChange={(e) => setTarget((t) => ({ ...t, width: e.target.value }))}
                      sx={{ width: 160 }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="Edge stitches"
                      value={target.edges}
                      onChange={(e) => setTarget((t) => ({ ...t, edges: e.target.value }))}
                      sx={{ width: 130 }}
                    />
                    <Typography variant="body2" data-testid="knit-cast-on">
                      Cast on {wanted} stitches ({Math.round((wanted - extra) / Math.max(1, unit))} repeats of {unit}
                      {extra > 0 ? ` + ${extra}` : ''}), about {((wanted * 10) / chart.gauge.stitches).toFixed(1)} cm.
                    </Typography>
                  </Stack>
                </Panel>
                <Panel title="Yarn needed" testId="knit-yarn" delay={90}>
                  <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
                    <TextField
                      size="small"
                      type="number"
                      label="Length (cm)"
                      value={target.length}
                      onChange={(e) => setTarget((t) => ({ ...t, length: e.target.value }))}
                      sx={{ width: 130 }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="Metres per ball"
                      value={target.ball}
                      onChange={(e) => setTarget((t) => ({ ...t, ball: e.target.value }))}
                      sx={{ width: 150 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      For a piece {number(target.width, 1, 1000, 50)} × {number(target.length, 1, 1000, 60)} cm at this
                      gauge.
                    </Typography>
                  </Stack>
                  <Box component="table" sx={{ borderCollapse: 'collapse', fontSize: 14, '& td': { py: 0.5, pr: 3 } }}>
                    <tbody>
                      {yarnNeeded(chart, number(target.width, 1, 1000, 50), number(target.length, 1, 1000, 60)).map(
                        (y) => {
                          const perBall = number(target.ball, 1, 10000, 200)
                          return (
                            <tr key={y.color} data-color={colorLetter(y.color)}>
                              <td>
                                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                                  <Box
                                    sx={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: '50%',
                                      bgcolor: chart.colors[y.color],
                                      border: '1px solid #888',
                                    }}
                                  />
                                  Colour {colorLetter(y.color)}
                                </Stack>
                              </td>
                              <td style={{ fontFamily: MONO_FONT }}>{Math.ceil(y.metres)} m</td>
                              <td>
                                {Math.ceil(y.metres / perBall)} {Math.ceil(y.metres / perBall) === 1 ? 'ball' : 'balls'}
                              </td>
                            </tr>
                          )
                        },
                      )}
                    </tbody>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    An estimate from the gauge, the stitches and any stranded floats, with 10% extra. Knit and weigh a
                    swatch for a closer figure.
                  </Typography>
                </Panel>
                <Panel title="Knitted preview" delay={120}>
                  <FabricPreview chart={chart} repeats={view.repeats} />
                  <FormControlLabel
                    sx={{ display: 'flex', mt: 1.5 }}
                    control={<Switch checked={view.repeats} onChange={(e) => setView({ repeats: e.target.checked })} />}
                    label="Show repeats"
                  />
                </Panel>
                <Box id="knit-written-pattern" sx={{ scrollMarginTop: 80 }}>
                  <Panel title="Written pattern" testId="knit-written" delay={180}>
                    <Stack direction="row" sx={{ gap: 1, mb: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
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
                    <Typography variant="body2" sx={{ mb: 1 }} data-testid="knit-cast-on-text">
                      {castOnText(chart)}
                      {chart.mode === 'round' ? ' Join in the round.' : ' Row 1 is a right-side row.'}
                    </Typography>
                    <ol className="knit-written">
                      {[...rows].reverse().map((r) => (
                        <li key={r.row} data-row={r.row} className={rewritten.has(r.row) ? 'changed' : undefined}>
                          <strong>
                            {r.label}
                            {r.side ? ` (${r.side})` : ''}:
                          </strong>{' '}
                          {r.text}.{r.stitches !== null && ` (${r.stitches} sts)`}
                        </li>
                      ))}
                    </ol>
                  </Panel>
                </Box>
              </Stack>
            </Stack>
          </Box>
          {!compact && (
            <SettingsSidebar open={view.sidebar ?? roomForSidebar} onToggle={(open) => setView({ sidebar: open })}>
              {settings}
            </SettingsSidebar>
          )}
        </Box>
        {compact && (
          <SettingsSheet
            open={sheetOpen}
            onOpen={setSheetOpen}
            summary={summary}
            phone={phone}
            links={phone && weaveLinks(14)}
          >
            {settings}
          </SettingsSheet>
        )}
        <StatusFrame sticky={!compact} links={!phone && weaveLinks()}>
          <Typography component="span" sx={{ fontSize: 13 }}>
            Cast on{' '}
            <Box component="span" sx={{ fontFamily: MONO_FONT, fontWeight: 500, color: 'text.primary' }}>
              {cast}
            </Box>{' '}
            · about {dims.width.toFixed(1)} × {dims.height.toFixed(1)} cm
          </Typography>
          {issues.length > 0 || floats.length > 0 ? (
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }} data-testid="knit-problems">
              {issues.slice(0, 3).map((p) => (
                <Warning key={`${p.row}-${p.message}`} testId="knit-issue">
                  {p.message}
                </Warning>
              ))}
              {issues.length > 3 && <Warning testId="knit-issue">…and {issues.length - 3} more.</Warning>}
              {floats.slice(0, 2).map((f) => (
                <Warning key={f.row} testId="knit-float">
                  Row {f.row}: colour {colorLetter(f.color)} floats behind {f.length} stitches (about{' '}
                  {((f.length * 10) / chart.gauge.stitches).toFixed(1)} cm). Catch it every {chart.floatLimit} stitches
                  or so.
                </Warning>
              ))}
              {floats.length > 2 && (
                <Warning testId="knit-float">…and {floats.length - 2} more rows with long floats.</Warning>
              )}
            </Stack>
          ) : (
            <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', color: 'var(--wp-ok)' }}>
              <CheckIcon sx={{ fontSize: 16 }} />
              Stitch counts add up, row to row
            </Stack>
          )}
        </StatusFrame>
      </Box>

      <div className="print-only knit-print">
        <h1>{fileBase}</h1>
        {printImage && <img src={printImage} alt={`${fileBase} chart`} />}
        <pre>{writtenPattern(chart, fileBase)}</pre>
      </div>

      {GA_ID && consent === null && (
        <ConsentBanner app="Knit Patterner" onChoose={(allow) => setConsent(allow ? 'granted' : 'denied')} />
      )}
      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        // Above the phone's bottom navigation.
        sx={phone ? { bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' } : undefined}
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
