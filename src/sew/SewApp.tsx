import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import GridOnIcon from '@mui/icons-material/GridOn'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import IosShareIcon from '@mui/icons-material/IosShare'
import PrintIcon from '@mui/icons-material/Print'
import RedoIcon from '@mui/icons-material/Redo'
import SaveIcon from '@mui/icons-material/Save'
import StraightenIcon from '@mui/icons-material/Straighten'
import UndoIcon from '@mui/icons-material/Undo'
import VideocamIcon from '@mui/icons-material/Videocam'
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
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
import { Action, MenuHeading, NavTab, PHONE_NAV_HEIGHT, PhoneNav, Rule, SkipLink } from '../components/AppBarParts'
import { ConsentBanner } from '../components/ConsentBanner'
import { FooterLinks } from '../components/FooterLinks'
import { WeaveMark } from '../components/Logo'
import { SettingsSheet, SettingsSidebar } from '../components/SettingsFrame'
import { FIELD_GRID } from '../components/SettingsPanel'
import { ShareDialog } from '../components/ShareDialog'
import { StatusFrame, Warning } from '../components/StatusBar'
import { ThemeToggle } from '../components/ThemeToggle'
import { LoadDialog } from '../dialogs/LoadDialog'
import { SaveDialog } from '../dialogs/SaveDialog'
import { download } from '../exportDraft'
import { HelpCenter } from '../help/HelpCenter'
import { SEW_HELP } from '../help/sewHelp'
import { markTourSeen, Tour, TourOffer, tourSeen } from '../help/Tour'
import { SEW_TOUR } from '../help/tours'
import { useHelpKeys } from '../help/useHelpKeys'
import { createHistory, type History, record, redo, undo } from '../history'
import { KnitMark } from '../knit/KnitLogo'
import { useCompact, useMidWidth, useNarrow, usePhone, useRoomForSidebar } from '../layout'
import { linkParam, withoutParam } from '../share'
import { patternStore } from '../storage'
import { MONO_FONT } from '../theme'
import { cuttingLayout, FABRIC_WIDTHS, fabricsOf } from './cutting'
import { DESIGNS } from './designs'
import { svgItems } from './drawing'
import { ExtraDialog } from './ExtraDialog'
import { fabricNeeds, type Paper as PaperSize, patternDxf, patternPdf, patternSvg } from './exports'
import { type Extra, MAX_EXTRAS, newExtra } from './extras'
import { NumberField, OptionField } from './fields'
import { type ChartId, fabricLength, formatLength, fromUnits, MEASUREMENTS, SIZE_CHARTS, toUnits } from './measurements'
import { CSS_PX_PER_CM, PatternView, SizeKey } from './PatternView'
import { ProjectorMode } from './ProjectorMode'
import { FABRIC_NAMES, type Fabric } from './pattern'
import { loadProfiles, type Profile, storeProfiles, withProfile } from './profiles'
import {
  bodyOf,
  decodeProject,
  designOf,
  newProject,
  PROJECT_KEY,
  type Project,
  parseProject,
  projectUrl,
  sizeName,
} from './project'
import { SewLogo } from './SewLogo'
import { sketchPainter } from './sharePicture'
import { drawSheet, layoutSheet } from './sheet'
import { CuttingView, SketchView } from './views'

/** Projects saved by name in this browser, kept apart from the weaving drafts and knitting charts. */
const sewStore = patternStore<Project>('sew-patterner')
const sewLine = (p: Project) => {
  const fixed = parseProject(p)
  return fixed ? `${designOf(fixed).name} · ${sizeName(fixed)}` : 'Sewing pattern'
}
const sewThumb = (p: Project) => {
  const fixed = parseProject(p)
  if (!fixed) return null
  const d = designOf(fixed)
  return <SketchView sketch={d.sketch(bodyOf(fixed), fixed.options)} label={d.name} height={56} />
}

const KEY = 'sew-current'
const VIEW_KEY = 'sew-view'
const DESIGN_KEY = 'design'

interface Saved {
  name: string
  project: Project
}

function loadCurrent(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    const project = parseProject(saved?.project)
    if (project) return { name: typeof saved.name === 'string' ? saved.name : 'Untitled', project }
  } catch {
    // a new one
  }
  return { name: 'My T-shirt', project: newProject() }
}

interface View {
  /** Zoom: CSS px to the cm; 0 fits the pattern to its panel. */
  zoom: number
  grid: boolean
  sidebar: boolean | null
  /** The sketch's fabric colour. */
  colour: string
  /** The cutting layout: which fabric, how wide, one-way. */
  fabric: Fabric
  width: number
  oneWay: boolean
}

function loadView(): View {
  const dflt: View = {
    zoom: 0,
    grid: true,
    sidebar: null,
    colour: '#9fa8da',
    fabric: 'main',
    width: 140,
    oneWay: false,
  }
  try {
    const v = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null')
    if (v && typeof v === 'object')
      return {
        zoom: typeof v.zoom === 'number' && v.zoom >= 0 && v.zoom <= 80 ? v.zoom : 0,
        grid: v.grid !== false,
        sidebar: typeof v.sidebar === 'boolean' ? v.sidebar : null,
        colour: typeof v.colour === 'string' && /^#[0-9a-f]{6}$/i.test(v.colour) ? v.colour : dflt.colour,
        fabric: ['main', 'contrast', 'lining', 'interfacing'].includes(v.fabric) ? v.fabric : 'main',
        width: typeof v.width === 'number' && v.width >= 40 && v.width <= 330 ? v.width : 140,
        oneWay: Boolean(v.oneWay),
      }
  } catch {
    // defaults
  }
  return dflt
}

const store = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // not remembered
  }
}

/** A card holding one part of the pattern. */
function Panel({
  title,
  children,
  testId,
  help,
  action,
  id,
}: {
  title: string
  children: ReactNode
  testId?: string
  help: string
  action?: ReactNode
  id?: string
}) {
  return (
    <Paper
      variant="outlined"
      className="wp-enter"
      data-help={help}
      id={id}
      sx={{
        p: 2.5,
        borderRadius: '20px',
        bgcolor: 'var(--wp-paper)',
        boxShadow: '0 1px 2px var(--wp-shadow-soft)',
        scrollMarginTop: 80,
        minWidth: 0,
      }}
      data-testid={testId}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography variant="h2" sx={{ fontSize: 17, flex: 1 }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Paper>
  )
}

/** A heading and its settings, in the sidebar or sheet. */
function Section({ title, help, children }: { title: string; help: string; children: ReactNode }) {
  return (
    <Stack component="section" sx={{ gap: 2 }} data-help={help}>
      <Typography variant="h2" sx={{ fontSize: 17, m: 0 }}>
        {title}
      </Typography>
      {children}
    </Stack>
  )
}

/** Sizes in a chart, for the nested-size choices. */
const chartSizes = (c: ChartId) => SIZE_CHARTS[c].map((s) => s.name)

/**
 * Sew Patterner: made-to-measure sewing patterns. Choose a design and its style, a size or your measurements, and get
 * the pattern pieces, a sketch, a cutting layout with the fabric to buy, the sewing steps, and PDFs to print.
 */
export default function SewApp() {
  const [{ name: savedName, project: savedProject }] = useState(loadCurrent)
  const [name, setName] = useState(savedName)
  const [history, setHistory] = useState<History<Project>>(() => createHistory(savedProject))
  const project = history.present
  const design = designOf(project)
  const body = bodyOf(project)
  const u = project.units
  const [view, setViewState] = useState(loadView)
  const setView = (patch: Partial<View>) =>
    setViewState((v) => {
      const next = { ...v, ...patch }
      store(VIEW_KEY, next)
      return next
    })
  const [toast, setToast] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'save' | 'load' | 'share' | 'projector' | 'profile' | null>(null)
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null)
  const [fileAnchor, setFileAnchor] = useState<HTMLElement | null>(null)
  const [profilesAnchor, setProfilesAnchor] = useState<HTMLElement | null>(null)
  const [profiles, setProfilesState] = useState<Profile[]>(loadProfiles)
  const [profileName, setProfileName] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Extra | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const patternBox = useRef<HTMLDivElement>(null)
  const [panelWidth, setPanelWidth] = useState(800)
  const compact = useCompact()
  const phone = usePhone()
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

  // Keep the project in this browser, so it's here next time.
  useEffect(() => {
    const t = setTimeout(() => store(KEY, { name, project }), 300)
    return () => clearTimeout(t)
  }, [name, project])
  useEffect(() => {
    const flush = () => store(KEY, { name, project })
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [name, project])

  const update = (next: Project, merge = false) => setHistory((h) => record(h, next, merge))
  const replace = (next: Project, newName?: string) => {
    update(next)
    if (newName !== undefined) setName(newName)
  }
  const pickDesign = (id: string) => {
    if (id === project.design) return
    const d = DESIGNS.find((x) => x.id === id)
    if (!d) return
    replace(
      newProject(id, project),
      name === 'Untitled' || DESIGNS.some((x) => `My ${x.name.toLowerCase()}` === name) || name === `My ${design.name}`
        ? `My ${d.name.toLowerCase()}`
        : name,
    )
    track('sew_design', { design: id })
  }

  // A link to a project (?project=…, from Share) or a design (?design=t-shirt, from the pattern pages) opens it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on opening
  useEffect(() => {
    const { pathname, search, hash } = window.location
    const data = linkParam(PROJECT_KEY, search, hash)
    const slug = linkParam(DESIGN_KEY, search, hash)
    if (!data && !slug) return
    window.history.replaceState(null, '', withoutParam([PROJECT_KEY, DESIGN_KEY], pathname, search, hash))
    if (data) {
      decodeProject(data)
        .then((shared) => {
          replace(shared.project, shared.name)
          setToast(`Opened “${shared.name}” from the link. Undo with Ctrl+Z.`)
        })
        .catch((e: Error) => setToast(e.message))
      return
    }
    const d = DESIGNS.find((x) => x.id === slug)
    if (!d) return setToast("That design wasn't found")
    replace(newProject(d.id, project), `My ${d.name.toLowerCase()}`)
    setToast(`Opened the ${d.name}. Undo with Ctrl+Z.`)
  }, [])

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

  // The pattern panel's width, to fit the pattern to it.
  useEffect(() => {
    const el = patternBox.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setPanelWidth(Math.max(200, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const sheet = useMemo(() => drawSheet(project), [project])
  const laid = useMemo(() => layoutSheet(sheet, 150, 3), [sheet])
  const fitZoom = Math.max(1, Math.min(30, (panelWidth - 8) / (laid.box.w + 4)))
  const zoom = view.zoom || fitZoom
  const fabrics = fabricsOf(sheet.pieces)
  const layoutFabric = fabrics.includes(view.fabric) ? view.fabric : 'main'
  const cutting = useMemo(
    () => cuttingLayout(sheet.pieces, project.allowances, layoutFabric, view.width, { oneWay: view.oneWay }),
    [sheet, project.allowances, layoutFabric, view.width, view.oneWay],
  )
  const needs = useMemo(() => fabricNeeds(project, view.oneWay), [project, view.oneWay])
  const sketch = useMemo(() => design.sketch(body, project.options), [design, body, project.options])
  const steps = useMemo(() => design.steps(project.options), [design, project.options])
  const materials = useMemo(() => design.materials(body, project.options), [design, body, project.options])
  const fileBase = name.trim() || design.name

  // Things worth checking: measurements that don't look right, pieces too big for the fabric.
  const warnings = useMemo(() => {
    const w: string[] = []
    const m = body.m
    const uses = new Set(design.measurements)
    if (project.sizing === 'custom') {
      if (uses.has('waist') && uses.has('hips') && m.waist > m.hips + 15)
        w.push(`The waist (${formatLength(m.waist, u)}) is much bigger than the hips: check them.`)
      if (uses.has('bust') && uses.has('waist') && m.waist > m.bust + 20)
        w.push(`The waist (${formatLength(m.waist, u)}) is much bigger than the bust: check them.`)
      if (uses.has('waistToHip') && uses.has('rise') && m.rise < m.waistToHip - 2)
        w.push('The rise is shorter than waist to hip: check them, or the trousers will be tight in the crotch.')
    }
    for (const p of cutting.missing)
      w.push(
        `The ${p.name.toLowerCase()} is too big for ${formatLength(view.width, u)} fabric: choose wider fabric or a shorter length.`,
      )
    return w
  }, [body, design, project.sizing, cutting, view.width, u])

  const exportAs = (format: PaperSize | 'svg' | 'dxf' | 'file') => {
    setExportAnchor(null)
    setFileAnchor(null)
    track('export', { format: `sew-${format}` })
    if (format === 'svg') {
      download(
        `${fileBase}.svg`,
        patternSvg(project, fileBase, (items) => svgItems(items)),
        'image/svg+xml',
      )
      setToast(`Exported ${fileBase}.svg at full size`)
    } else if (format === 'dxf') {
      download(`${fileBase}.dxf`, patternDxf(project), 'application/dxf')
      setToast(`Exported ${fileBase}.dxf`)
    } else if (format === 'file') {
      download(
        `${fileBase}.sew.json`,
        JSON.stringify({ app: 'Sew Patterner', version: 1, name, project }, null, 1),
        'application/json',
      )
    } else {
      setToast('Making the PDF…')
      patternPdf(project, name.trim(), format)
        .then((blob) => {
          const suffix = { a4: 'A4', letter: 'Letter', a0: 'A0', full: 'full size', projector: 'projector' }[format]
          download(`${fileBase} (${suffix}).pdf`, blob, 'application/pdf')
          setToast(`Exported ${fileBase} (${suffix}).pdf`)
        })
        .catch((e) => setToast(`Couldn't make the PDF: ${e instanceof Error ? e.message : e}`))
    }
  }
  // Print: the home-printer PDF, in the paper size people use where they are.
  const print = () => {
    const us = /^en-(US|CA)|^es-(MX|US)/.test(navigator.language)
    exportAs(us ? 'letter' : 'a4')
  }

  const open = async (file: File | undefined) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      const loaded = parseProject(data?.project ?? data)
      if (!loaded) throw new Error('not a project')
      replace(loaded, typeof data?.name === 'string' ? data.name : file.name.replace(/\.sew\.json$|\.json$/, ''))
      setToast(`Opened ${file.name}`)
    } catch {
      setToast(`${file.name} isn't a Sew Patterner project`)
    }
  }

  const setProfiles = (next: Profile[]) => {
    setProfilesState(next)
    if (!storeProfiles(next)) setToast("Couldn't save the measurements on this device")
  }

  // Help (F1, or the Help link) and the guided tour, offered on a first visit.
  const [help, setHelp] = useState<{ open: boolean; topic: string | null }>({ open: false, topic: null })
  const openHelp = (topic: string | null) => setHelp({ open: true, topic })
  const [touring, setTouring] = useState(false)
  const [offerTour, setOfferTour] = useState(() => !tourSeen('sew'))
  const startTour = () => {
    markTourSeen('sew')
    setOfferTour(false)
    setHelp((x) => ({ ...x, open: false }))
    setDialog(null)
    setSheetOpen(false)
    setTouring(true)
  }
  useHelpKeys(openHelp, !touring)
  const summary = `${design.name} · ${sizeName(project)}`
  const analyticsChoice = GA_ID ? () => setConsent(null) : undefined
  const links = (fontSize?: number) => (
    <FooterLinks
      others={[
        { href: '../', label: 'Weave Patterner' },
        { href: '../knit/', label: 'Knit Patterner' },
      ]}
      onAnalytics={analyticsChoice}
      onHelp={() => openHelp(null)}
      fontSize={fontSize}
    />
  )
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const closeThen = (fn: () => void) => () => {
    setFileAnchor(null)
    fn()
  }
  const setOption = (id: string, v: string | number | boolean) =>
    update({ ...project, options: { ...project.options, [id]: v } })
  const setMeasurement = (id: keyof typeof body.m, cm: number) =>
    update(
      { ...project, sizing: 'custom', custom: { ...body.m, [id]: cm }, figure: body.figure },
      project.sizing === 'custom',
    )
  const newFile = () => replace(newProject(project.design, project), 'Untitled')

  const settings = (
    <Stack sx={{ gap: 2.5 }} divider={<Divider flexItem />}>
      <Section title="Project" help="start">
        <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
        <TextField
          select
          size="small"
          label="Design"
          value={project.design}
          onChange={(e) => pickDesign(e.target.value)}
          fullWidth
        >
          {DESIGNS.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              <ListItemText primary={d.name} secondary={d.category} />
            </MenuItem>
          ))}
        </TextField>
      </Section>
      <Section title="Style" help="designs">
        {design.options
          .filter((o) => !o.when || o.when(project.options))
          .map((o) => (
            <OptionField
              key={o.id}
              option={o}
              options={project.options}
              units={u}
              onChange={(v) => setOption(o.id, v)}
            />
          ))}
      </Section>
      {design.measurements.length > 0 && (
        <Section title="Size" help="sizes">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={project.sizing}
            onChange={(_, s) => s && update({ ...project, sizing: s })}
            aria-label="Sizing"
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
          >
            <ToggleButton value="standard">Standard size</ToggleButton>
            <ToggleButton value="custom">My measurements</ToggleButton>
          </ToggleButtonGroup>
          {project.sizing === 'standard' && (
            <Box sx={FIELD_GRID}>
              <TextField
                select
                size="small"
                label="Size chart"
                value={project.chart}
                onChange={(e) => {
                  const chart = e.target.value as ChartId
                  const list = SIZE_CHARTS[chart]
                  update({
                    ...project,
                    chart,
                    size: list[Math.floor(list.length / 2) - (chart === 'mens' ? 1 : 1)].name,
                    nested: [],
                  })
                }}
              >
                <MenuItem value="womens">Women’s</MenuItem>
                <MenuItem value="mens">Men’s</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Size"
                value={project.size}
                onChange={(e) => update({ ...project, size: e.target.value })}
              >
                {chartSizes(project.chart).map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}
          {project.sizing === 'custom' && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={project.figure}
              onChange={(_, f) => f && update({ ...project, figure: f })}
              aria-label="Shape for"
              sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
            >
              <ToggleButton value="bust">Bust (darts)</ToggleButton>
              <ToggleButton value="chest">Chest (no darts)</ToggleButton>
            </ToggleButtonGroup>
          )}
          <div>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Nested sizes
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }} role="group" aria-label="Nested sizes">
              {chartSizes(project.chart)
                .filter((s) => project.sizing === 'custom' || s !== project.size)
                .map((s) => {
                  const on = project.nested.includes(s)
                  return (
                    <ToggleButton
                      key={s}
                      size="small"
                      value={s}
                      selected={on}
                      onChange={() =>
                        update({
                          ...project,
                          nested: on ? project.nested.filter((x) => x !== s) : [...project.nested, s],
                        })
                      }
                      sx={{ borderRadius: 999, px: 1.25, py: 0.25, border: 0, bgcolor: 'var(--wp-seg)' }}
                    >
                      {s.replace('UK ', '')}
                    </ToggleButton>
                  )
                })}
            </Stack>
          </div>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={u}
            onChange={(_, units) => units && update({ ...project, units })}
            aria-label="Units"
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
          >
            <ToggleButton value="cm">Centimetres</ToggleButton>
            <ToggleButton value="in">Inches</ToggleButton>
          </ToggleButtonGroup>
        </Section>
      )}
      {design.measurements.length > 0 && (
        <Section title="Measurements" help="measuring">
          <Typography variant="body2" color="text.secondary">
            {project.sizing === 'standard'
              ? `The body measurements for ${project.size}. Change any to make it to measure.`
              : 'Your body measurements, without ease. Hover over a box for how to take it.'}
          </Typography>
          <Box sx={FIELD_GRID} data-testid="measurements">
            {design.measurements.map((id) => {
              const def = MEASUREMENTS[id]
              return (
                <NumberField
                  key={id}
                  label={`${def.name} (${u})`}
                  title={def.how}
                  value={toUnits(body.m[id], u)}
                  min={toUnits(def.min, u)}
                  max={toUnits(def.max, u)}
                  step={u === 'in' ? 0.25 : 0.5}
                  onChange={(v) => setMeasurement(id, Math.round(fromUnits(v, u) * 10) / 10)}
                />
              )
            })}
          </Box>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<SaveIcon />}
              onClick={() => {
                setProfileName(project.sizing === 'custom' ? '' : project.size)
                setDialog('profile')
              }}
            >
              Save measurements
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<StraightenIcon />}
              disabled={profiles.length === 0}
              onClick={(e) => setProfilesAnchor(e.currentTarget)}
            >
              Use saved…
            </Button>
          </Stack>
        </Section>
      )}
      <Section title="Seam allowances" help="allowances">
        <FormControlLabel
          control={
            <Switch
              checked={project.allowances.include}
              onChange={(e) => update({ ...project, allowances: { ...project.allowances, include: e.target.checked } })}
            />
          }
          label="Add seam allowances"
        />
        {project.allowances.include && (
          <Box sx={FIELD_GRID}>
            <NumberField
              label={`Seams (${u})`}
              value={toUnits(project.allowances.seam, u)}
              min={0}
              max={toUnits(5, u)}
              step={u === 'in' ? 0.125 : 0.1}
              onChange={(v) => update({ ...project, allowances: { ...project.allowances, seam: fromUnits(v, u) } })}
            />
            <NumberField
              label={`Hems (${u})`}
              value={toUnits(project.allowances.hem, u)}
              min={0}
              max={toUnits(10, u)}
              step={u === 'in' ? 0.125 : 0.5}
              onChange={(v) => update({ ...project, allowances: { ...project.allowances, hem: fromUnits(v, u) } })}
            />
          </Box>
        )}
      </Section>
    </Stack>
  )

  const fileMenuItems = [
    <MenuItem key="share" onClick={closeThen(() => setDialog('share'))}>
      <ListItemIcon>
        <IosShareIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Share…" secondary="A link, or a picture for Instagram and Pinterest" />
    </MenuItem>,
    <MenuItem key="new" onClick={closeThen(newFile)}>
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
      Import a project file…
    </MenuItem>,
    <MenuItem key="print" onClick={closeThen(print)}>
      <ListItemIcon>
        <PrintIcon fontSize="small" />
      </ListItemIcon>
      Print…
    </MenuItem>,
    <MenuItem key="projector" onClick={closeThen(() => setDialog('projector'))}>
      <ListItemIcon>
        <VideocamIcon fontSize="small" />
      </ListItemIcon>
      Projector mode
    </MenuItem>,
    <MenuItem key="help" onClick={closeThen(() => openHelp(null))}>
      <ListItemIcon>
        <HelpOutlineIcon fontSize="small" />
      </ListItemIcon>
      Help
    </MenuItem>,
    <Divider key="d" />,
    <MenuHeading key="export">Export</MenuHeading>,
    ...exportItems(exportAs),
  ]

  const zoomBy = (k: number) => setView({ zoom: Math.max(1, Math.min(80, zoom * k)) })
  const actual = Math.abs(zoom - CSS_PX_PER_CM) < 0.01

  return (
    <>
      <SkipLink target="main">Skip to the pattern</SkipLink>
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
            <SewLogo compact={narrow} />
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
              data-help="files"
              sx={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 'none' }}
            >
              <Action compact={fileCompact} icon={<InsertDriveFileIcon />} label="New" onClick={newFile} />
              <Action compact={fileCompact} icon={<SaveIcon />} label="Save" onClick={() => setDialog('save')} />
              <Action compact={fileCompact} icon={<FolderOpenIcon />} label="Load" onClick={() => setDialog('load')} />
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
              <Action compact={fileCompact} icon={<IosShareIcon />} label="Share" onClick={() => setDialog('share')} />
            </Box>
          )}
          {!compact && <Rule />}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? '2px' : 1, flex: 'none' }}>
            {!phone && (
              <Action
                compact={narrow}
                variant="contained"
                icon={<VideocamIcon />}
                label="Projector"
                tour="projector"
                help="projector"
                onClick={() => setDialog('projector')}
              />
            )}
            <ThemeToggle />
            {!phone && (
              <>
                <Tooltip title="Weave Patterner: weaving drafts">
                  <IconButton component="a" href="../" aria-label="Weave Patterner" sx={{ p: 1 }}>
                    <WeaveMark size={26} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Knit Patterner: knitting charts">
                  <IconButton component="a" href="../knit/" aria-label="Knit Patterner" sx={{ p: 1 }}>
                    <KnitMark size={26} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      {phone && (
        <Box className="screen-only">
          <PhoneNav>
            <NavTab
              current
              icon={<GridOnIcon />}
              label="Pattern"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
            <NavTab icon={<ViewQuiltIcon />} label="Layout" onClick={() => scrollTo('sew-cutting')} />
            <NavTab icon={<FormatListNumberedIcon />} label="Steps" onClick={() => scrollTo('sew-steps')} />
            <NavTab icon={<VideocamIcon />} label="Project" onClick={() => setDialog('projector')} />
            <NavTab icon={<SaveIcon />} label="File" onClick={(e) => setFileAnchor(e.currentTarget)} />
          </PhoneNav>
          <Menu anchorEl={fileAnchor} open={fileAnchor !== null} onClose={() => setFileAnchor(null)}>
            {fileMenuItems}
          </Menu>
        </Box>
      )}
      <SaveDialog
        open={dialog === 'save'}
        draft={project}
        store={sewStore}
        currentName={name.trim() && name !== 'Untitled' ? name.trim() : null}
        onClose={() => setDialog(null)}
        onSaved={(n) => {
          setName(n)
          setDialog(null)
          setToast(`Saved "${n}"`)
        }}
      />
      <LoadDialog
        open={dialog === 'load'}
        store={sewStore}
        thumb={sewThumb}
        describe={sewLine}
        onClose={() => setDialog(null)}
        onLoad={(p) => {
          const loaded = parseProject(p.draft)
          setDialog(null)
          if (!loaded) return setToast(`"${p.name}" couldn't be read`)
          replace(loaded, p.name)
          setToast(`Loaded "${p.name}"`)
        }}
        onRenamed={(from, to) => {
          if (to && name === from) setName(to)
        }}
      />
      <ShareDialog
        open={dialog === 'share'}
        app="sew"
        title={name.trim() && name !== 'Untitled' ? name.trim() : `My ${design.name.toLowerCase()}`}
        link={() => projectUrl(name.trim() || design.name, project)}
        design={sketchPainter(sketch, view.colour)}
        onClose={() => setDialog(null)}
        onToast={setToast}
      />
      {dialog === 'projector' && (
        <ProjectorMode open onClose={() => setDialog(null)} items={laid.items} box={laid.box} />
      )}
      <Dialog open={dialog === 'profile'} onClose={() => setDialog(null)} aria-labelledby="profile-title">
        <DialogTitle id="profile-title">Save these measurements</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Keep them under a name in this browser, to use with any design.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Whose measurements"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!profileName.trim()}
            onClick={() => {
              setProfiles(withProfile(profiles, { name: profileName.trim(), m: { ...body.m }, figure: body.figure }))
              setDialog(null)
              setToast(`Saved the measurements as “${profileName.trim()}”`)
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Menu anchorEl={profilesAnchor} open={profilesAnchor !== null} onClose={() => setProfilesAnchor(null)}>
        {profiles.map((p) => (
          <MenuItem
            key={p.name}
            onClick={() => {
              setProfilesAnchor(null)
              update({ ...project, sizing: 'custom', custom: { ...p.m }, figure: p.figure })
              setToast(`Using ${p.name}’s measurements`)
            }}
          >
            <ListItemText
              primary={p.name}
              secondary={`Bust ${formatLength(p.m.bust, u)} · waist ${formatLength(p.m.waist, u)} · hips ${formatLength(p.m.hips, u)}`}
            />
          </MenuItem>
        ))}
        <Divider />
        {profiles.map((p) => (
          <MenuItem
            key={`del-${p.name}`}
            onClick={() => {
              setProfiles(profiles.filter((x) => x !== p))
              if (profiles.length <= 1) setProfilesAnchor(null)
            }}
          >
            <ListItemText primary={`Forget ${p.name}`} />
          </MenuItem>
        ))}
      </Menu>
      <ExtraDialog
        extra={editing}
        units={u}
        allowances={project.allowances}
        onClose={() => setEditing(null)}
        onSave={(x) => {
          const exists = project.extras.some((y) => y.id === x.id)
          update({
            ...project,
            extras: exists ? project.extras.map((y) => (y.id === x.id ? x : y)) : [...project.extras, x],
          })
          setEditing(null)
          setToast(exists ? `Changed ${x.name}` : `Added ${x.name} to the pattern`)
        }}
      />
      <Menu anchorEl={exportAnchor} open={exportAnchor !== null} onClose={() => setExportAnchor(null)}>
        {exportItems(exportAs)}
      </Menu>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label="Project file to open"
        onChange={(e) => {
          open(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <Box
        className="screen-only"
        sx={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          pb: phone ? PHONE_NAV_HEIGHT : 0,
        }}
      >
        <Box sx={{ flex: '1 0 auto', display: 'flex', alignItems: 'stretch' }}>
          <Box component="main" id="main" tabIndex={-1} sx={{ flex: '1 1 auto', minWidth: 0, outline: 'none' }}>
            <h1 className="sr-only">Sew Patterner: sewing pattern designer</h1>
            {/* The designs, with a sketch of each. */}
            <Box
              sx={{ px: { xs: 1.25, sm: 3 }, py: 1.5, borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }}
              data-tour="designs"
              data-help="designs"
            >
              <ToggleButtonGroup
                exclusive
                value={project.design}
                onChange={(_, id) => id && pickDesign(id)}
                aria-label="Design"
                sx={{ gap: 1, flexWrap: 'nowrap', bgcolor: 'transparent', p: 0 }}
              >
                {DESIGNS.map((d) => (
                  <ToggleButton
                    key={d.id}
                    value={d.id}
                    aria-label={d.name}
                    sx={{
                      flexDirection: 'column',
                      gap: 0.5,
                      width: 96,
                      flex: 'none',
                      borderRadius: '14px !important',
                      border: '1px solid var(--wp-line) !important',
                      bgcolor: 'var(--wp-paper)',
                      py: 1,
                    }}
                  >
                    <DesignThumb id={d.id} colour={view.colour} />
                    <Typography component="span" sx={{ fontSize: 12, lineHeight: 1.2, fontWeight: 600 }}>
                      {d.name}
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              sx={{ gap: { xs: 2, sm: 3 }, alignItems: 'flex-start', px: { xs: 1.25, sm: 3 }, py: { xs: 1.5, sm: 3 } }}
            >
              <Stack sx={{ gap: 2, flex: { lg: '1 1 0' }, width: { xs: '100%', lg: 'auto' }, minWidth: 0 }}>
                <Paper
                  variant="outlined"
                  data-tour="pattern"
                  data-help="reading"
                  sx={{
                    p: { xs: 1.5, sm: 2.5 },
                    width: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    borderRadius: { xs: '20px', sm: '26px' },
                    bgcolor: 'var(--wp-paper)',
                    boxShadow: '0 1px 2px var(--wp-shadow-soft), 0 12px 32px var(--wp-shadow)',
                  }}
                  className="wp-enter"
                >
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="h2" sx={{ fontSize: 17, flex: 1 }}>
                      Pattern
                    </Typography>
                    <Tooltip title="Zoom out">
                      <IconButton aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>
                        <ZoomOutIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Zoom in">
                      <IconButton aria-label="Zoom in" onClick={() => zoomBy(1.25)}>
                        <ZoomInIcon />
                      </IconButton>
                    </Tooltip>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={view.zoom === 0 ? 'fit' : actual ? 'actual' : null}
                      onChange={(_, z) => z && setView({ zoom: z === 'fit' ? 0 : CSS_PX_PER_CM })}
                      aria-label="Pattern size"
                    >
                      <ToggleButton value="fit">Fit</ToggleButton>
                      <ToggleButton value="actual">Actual size</ToggleButton>
                    </ToggleButtonGroup>
                    <Tooltip title="A 5 cm grid behind the pieces">
                      <ToggleButton
                        size="small"
                        value="grid"
                        selected={view.grid}
                        onChange={() => setView({ grid: !view.grid })}
                        aria-label="Grid"
                        sx={{ borderRadius: 999, border: 0, bgcolor: 'var(--wp-seg)' }}
                      >
                        <GridOnIcon fontSize="small" />
                      </ToggleButton>
                    </Tooltip>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} data-testid="sew-summary">
                    {sheet.pieces.length} pieces ·{' '}
                    {project.allowances.include
                      ? `${formatLength(project.allowances.seam, u)} seams and ${formatLength(project.allowances.hem, u)} hems included`
                      : 'no seam allowances (sewing lines only)'}
                    {project.nested.length > 0 && (
                      <>
                        {' · '}
                        <SizeKey
                          names={project.nested.filter((n) => project.sizing === 'custom' || n !== project.size)}
                          current={sizeName(project)}
                        />
                      </>
                    )}
                  </Typography>
                  <Box
                    ref={patternBox}
                    sx={{ overflow: 'auto', maxHeight: '75vh', borderRadius: 2, border: 1, borderColor: 'divider' }}
                    tabIndex={0}
                    aria-label="Pattern pieces, scrollable"
                  >
                    <PatternView
                      items={laid.items}
                      box={laid.box}
                      scale={zoom}
                      grid={view.grid}
                      label={`${design.name} pattern, ${sizeName(project)}: ${sheet.pieces.map((p) => `${p.name} (${p.cut} to cut)`).join(', ')}`}
                    />
                  </Box>
                </Paper>
                <Panel
                  title="Your own pieces"
                  help="own"
                  testId="sew-own"
                  action={
                    <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                      {(['rect', 'circle', 'drawn'] as const).map((shape) => (
                        <Button
                          key={shape}
                          size="small"
                          variant="outlined"
                          color="inherit"
                          startIcon={<AddIcon />}
                          disabled={project.extras.length >= MAX_EXTRAS}
                          onClick={() => setEditing(newExtra(shape, project.extras.length + 1))}
                        >
                          {{ rect: 'Rectangle', circle: 'Circle', drawn: 'Draw one' }[shape]}
                        </Button>
                      ))}
                    </Stack>
                  }
                >
                  {project.extras.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Add bands, ties, ruffles, pockets, appliqué or any shape you draw: they get allowances, grainlines
                      and labels, and go in the cutting layout and the PDFs with the rest.
                    </Typography>
                  ) : (
                    <Stack sx={{ gap: 0.5 }} component="ul" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {project.extras.map((x) => (
                        <Stack component="li" key={x.id} direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            <strong>{x.name}</strong> ·{' '}
                            {x.shape === 'rect'
                              ? `${formatLength(x.w, u)} × ${formatLength(x.h, u)}`
                              : x.shape === 'circle'
                                ? `${formatLength(x.w, u)} across`
                                : `${x.points.length} points`}{' '}
                            · cut {x.cut}
                            {x.onFold ? ' on the fold' : ''}
                          </Typography>
                          <Button size="small" onClick={() => setEditing(x)} aria-label={`Edit ${x.name}`}>
                            Edit
                          </Button>
                          <Tooltip title={`Remove ${x.name}`}>
                            <IconButton
                              aria-label={`Remove ${x.name}`}
                              onClick={() => update({ ...project, extras: project.extras.filter((y) => y !== x) })}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Panel>
              </Stack>

              <Stack sx={{ gap: 2, flex: { lg: '0 0 400px' }, width: { xs: '100%', lg: 400 }, minWidth: 0 }}>
                <Panel
                  title="Sketch"
                  help="sewing"
                  testId="sew-sketch"
                  action={
                    <input
                      type="color"
                      className="picker"
                      aria-label="Fabric colour for the sketch"
                      value={view.colour}
                      onChange={(e) => setView({ colour: e.target.value })}
                      style={{ width: 32, height: 32, padding: 2 }}
                    />
                  }
                >
                  <SketchView
                    sketch={sketch}
                    label={`Sketch of the ${design.name.toLowerCase()} from the front`}
                    colour={view.colour}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {design.about} {design.level}.
                  </Typography>
                </Panel>
                <Panel title="Cutting layout" help="cutting" testId="sew-cutting" id="sew-cutting">
                  <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
                    {fabrics.length > 1 && (
                      <TextField
                        select
                        size="small"
                        label="Fabric"
                        value={layoutFabric}
                        onChange={(e) => setView({ fabric: e.target.value as Fabric })}
                        sx={{ minWidth: 140 }}
                      >
                        {fabrics.map((f) => (
                          <MenuItem key={f} value={f}>
                            {FABRIC_NAMES[f]}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                    <TextField
                      select
                      size="small"
                      label="Fabric width"
                      value={FABRIC_WIDTHS.includes(view.width) ? view.width : view.width}
                      onChange={(e) => setView({ width: Number(e.target.value) })}
                      sx={{ minWidth: 130 }}
                    >
                      {[...new Set([...FABRIC_WIDTHS, 180, 240, view.width])]
                        .sort((a, b) => a - b)
                        .map((w) => (
                          <MenuItem key={w} value={w}>
                            {formatLength(w, u)}
                          </MenuItem>
                        ))}
                    </TextField>
                    <FormControlLabel
                      control={<Switch checked={view.oneWay} onChange={(e) => setView({ oneWay: e.target.checked })} />}
                      label="One-way fabric"
                    />
                  </Stack>
                  <CuttingView
                    layout={cutting}
                    label={`Cutting layout on ${formatLength(view.width, u)} ${FABRIC_NAMES[layoutFabric].toLowerCase()}, ${cutting.folded ? 'folded' : 'single layer'}: ${cutting.placements.map((p) => p.piece.name).join(', ')}`}
                  />
                  <Typography variant="body2" sx={{ mt: 1 }} data-testid="sew-buy">
                    Buy <strong>{fabricLength(cutting.length + 10, u)}</strong> of {formatLength(view.width, u)}{' '}
                    {FABRIC_NAMES[layoutFabric].toLowerCase()}
                    {cutting.folded ? ', folded selvedge to selvedge' : ', cut in a single layer'}.
                  </Typography>
                  <Box
                    component="table"
                    sx={{
                      borderCollapse: 'collapse',
                      fontSize: 14,
                      mt: 1.5,
                      '& td, & th': { py: 0.5, pr: 2, textAlign: 'left' },
                    }}
                    data-testid="sew-needs"
                  >
                    <thead>
                      <tr>
                        <th>Fabric</th>
                        {needs[0]?.widths.map((w) => (
                          <th key={w.width} style={{ fontWeight: 600 }}>
                            {formatLength(w.width, u)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {needs.map((n) => (
                        <tr key={n.fabric}>
                          <td>{n.fabric}</td>
                          {n.widths.map((w) => (
                            <td
                              key={w.width}
                              style={{ fontFamily: MONO_FONT }}
                              colSpan={n.widths.length === 1 ? needs[0].widths.length : 1}
                            >
                              {fabricLength(w.length, u)}
                              {n.widths.length === 1 ? ` (${formatLength(w.width, u)} wide)` : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Box>
                </Panel>
                <Panel title="Materials" help="sewing" testId="sew-materials">
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Fabric:</strong> {design.fabrics}
                  </Typography>
                  <ul className="sew-list">
                    {materials.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </Panel>
                <Panel
                  title="Instructions"
                  help="sewing"
                  testId="sew-steps"
                  id="sew-steps"
                  action={
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      startIcon={<ContentCopyIcon />}
                      onClick={() =>
                        navigator.clipboard
                          ?.writeText(steps.map((s, i) => `${i + 1}. ${s}`).join('\n'))
                          .then(() => setToast('Instructions copied'))
                          .catch(() => setToast("Couldn't copy: use Export instead"))
                      }
                    >
                      Copy
                    </Button>
                  }
                >
                  <ol className="sew-list">
                    {steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </Panel>
              </Stack>
            </Stack>
          </Box>
          {!compact && (
            <SettingsSidebar open={view.sidebar ?? roomForSidebar} onToggle={(o) => setView({ sidebar: o })}>
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
            links={phone && links(14)}
          >
            {settings}
          </SettingsSheet>
        )}
        <StatusFrame
          sticky={!compact}
          links={!phone && links()}
          help="sizes"
          announce={warnings.length ? `${warnings.length} things to check` : 'The measurements and pieces look right'}
        >
          <Typography component="span" sx={{ fontSize: 13 }}>
            {sheet.pieces.length} pieces · buy{' '}
            <Box component="span" sx={{ fontFamily: MONO_FONT, fontWeight: 500, color: 'text.primary' }}>
              {fabricLength(needs[0]?.widths.find((w) => w.width === 140)?.length ?? cutting.length + 10, u)}
            </Box>{' '}
            of {formatLength(140, u)} fabric
          </Typography>
          {warnings.length ? (
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }} data-testid="sew-warnings">
              {warnings.map((w) => (
                <Warning key={w} testId="sew-warning">
                  {w}
                </Warning>
              ))}
            </Stack>
          ) : (
            <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', color: 'var(--wp-ok)' }}>
              <CheckIcon sx={{ fontSize: 16 }} />
              Measurements and pieces look right
            </Stack>
          )}
        </StatusFrame>
      </Box>

      <HelpCenter
        open={help.open}
        app="Sew Patterner"
        topics={SEW_HELP}
        topic={help.topic}
        onClose={() => setHelp((x) => ({ ...x, open: false }))}
        onTour={startTour}
      />
      <Tour open={touring} steps={SEW_TOUR} onClose={() => setTouring(false)} />
      {offerTour && !(GA_ID && consent === null) && dialog === null && !help.open && !touring && (
        <TourOffer
          app="Sew Patterner"
          text="Take a one-minute tour of choosing a design and size, the pattern, and printing it."
          onStart={startTour}
          onDismiss={() => {
            markTourSeen('sew')
            setOfferTour(false)
          }}
        />
      )}
      {GA_ID && consent === null && (
        <ConsentBanner app="Sew Patterner" onChoose={(allow) => setConsent(allow ? 'granted' : 'denied')} />
      )}
      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        // Not on a click elsewhere: that click may be what just set a new message.
        onClose={(_, reason) => reason !== 'clickaway' && setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={phone ? { bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' } : undefined}
      />
    </>
  )
}

/** The export choices, for the Export menu and the phone's File menu. */
function exportItems(exportAs: (f: PaperSize | 'svg' | 'dxf' | 'file') => void) {
  return [
    <MenuItem key="a4" onClick={() => exportAs('a4')}>
      <ListItemText
        primary="PDF for home printing (A4)"
        secondary="Booklet, test square and the pattern tiled over pages"
      />
    </MenuItem>,
    <MenuItem key="letter" onClick={() => exportAs('letter')}>
      <ListItemText primary="PDF for home printing (US Letter)" />
    </MenuItem>,
    <MenuItem key="a0" onClick={() => exportAs('a0')}>
      <ListItemText primary="PDF for a copy shop (A0)" secondary="The pattern on large sheets" />
    </MenuItem>,
    <MenuItem key="full" onClick={() => exportAs('full')}>
      <ListItemText primary="Full-size PDF" secondary="One big page, for a plotter or wide-format printer" />
    </MenuItem>,
    <MenuItem key="projector" onClick={() => exportAs('projector')}>
      <ListItemText primary="Projector PDF" secondary="Full size, light lines on black" />
    </MenuItem>,
    <MenuItem key="svg" onClick={() => exportAs('svg')}>
      <ListItemText primary="SVG" secondary="Full size, for Inkscape or Illustrator" />
    </MenuItem>,
    <MenuItem key="dxf" onClick={() => exportAs('dxf')}>
      <ListItemText primary="DXF (AAMA)" secondary="For pattern CAD and cutting machines" />
    </MenuItem>,
    <MenuItem key="file" onClick={() => exportAs('file')}>
      <SaveIcon fontSize="small" sx={{ mr: 1 }} />
      Project file (to open again)
    </MenuItem>,
  ]
}

/** A small sketch of a design in its default style, for the design picker. */
function DesignThumb({ id, colour }: { id: string; colour: string }) {
  const sketch = useMemo(() => {
    const p = newProject(id)
    const d = designOf(p)
    return d.sketch(bodyOf(p), p.options)
  }, [id])
  return (
    <Box sx={{ width: 64, height: 56 }} aria-hidden>
      <SketchView sketch={sketch} label="" colour={colour} height={56} />
    </Box>
  )
}
