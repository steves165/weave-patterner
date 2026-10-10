import BrushIcon from '@mui/icons-material/Brush'
import CalculateIcon from '@mui/icons-material/Calculate'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import GridOnIcon from '@mui/icons-material/GridOn'
import HandymanIcon from '@mui/icons-material/Handyman'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import ImageIcon from '@mui/icons-material/Image'
import IosShareIcon from '@mui/icons-material/IosShare'
import PaletteIcon from '@mui/icons-material/Palette'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PrintIcon from '@mui/icons-material/Print'
import RedoIcon from '@mui/icons-material/Redo'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import {
  AppBar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  MenuList,
  Popover,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { type MouseEvent, type ReactNode, useRef, useState } from 'react'
import type { ExportFormat, ImageFormat } from '../exportDraft'
import { useMidWidth, useNarrow } from '../layout'
import { Action, MenuHeading, NavTab, PhoneNav, Rule } from './AppBarParts'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  name: string | null
  /** "4 shafts · 4 treadles · 32 × 32", under the name. */
  summary: string
  /** The window's width, when the page can scroll sideways (desktop): the bar stays that wide and in view. */
  width?: number
  /** Phone: brings the draft back into view (the Draft tab). */
  onDraft: () => void
  /** Phone: file actions move into a "More" menu. */
  phone: boolean
  /** Phone or narrow tablet: icon-only buttons. */
  compact: boolean
  /** Touch screen: show the drag-to-paint toggle. */
  touch: boolean
  touchPaint: boolean
  onToggleTouchPaint: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onLoad: () => void
  onExport: (format: ExportFormat) => void
  onExportImage: (format: ImageFormat) => void
  onImport: () => void
  /** Opens Share: a link to this pattern, or a picture of it. */
  onShare: () => void
  /** Opens the help. */
  onHelp: () => void
  /** Print the draft, optionally with a page of written instructions. */
  onPrint: (instructions: boolean) => void
  onWeave: () => void
  /** Opens the 3D preview of the cloth. */
  on3d: () => void
  onSequenceTools: () => void
  onTrompAsWrit: () => void
  onCalculator: () => void
  onColors: () => void
  onCloth: () => void
  onProfile: () => void
  onDoubleCloth: () => void
  onTransform: () => void
  onWarpPlan: () => void
  onColorways: () => void
  onVariations: () => void
  onEcho: () => void
  onPicture: () => void
  onReport: () => void
  onRigidHeddle: () => void
  onTablet: () => void
  onDrawloom: () => void
  onYarns: () => void
  onToLiftplan: () => void
  onToTreadling: () => void
  /** The draft is a lift plan (straight tie-up), so offer converting back rather than to a lift plan. */
  isLiftplan: boolean
}

const EXPORTS: { format: ExportFormat; primary: string; secondary: string }[] = [
  { format: 'json', primary: 'Pattern file (.weave.json)', secondary: 'Re-import into Weave Patterner' },
  {
    format: 'wif',
    primary: 'WIF (.wif)',
    secondary: 'Threading, tie-up and treadling for weaving software and treadle looms',
  },
  {
    format: 'liftplan',
    primary: 'WIF lift plan (.wif)',
    secondary: 'Shafts lifted per pick, for computer-dobby looms',
  },
]

const IMAGES: { format: ImageFormat; primary: string; secondary: string }[] = [
  { format: 'png', primary: 'Image (PNG)', secondary: 'Picture of the draft to share' },
  { format: 'svg', primary: 'Image (SVG)', secondary: 'Scalable picture for printing or editing' },
  {
    format: 'bmp',
    primary: 'Bitmap (BMP), black and white',
    secondary: 'One pixel per crossing, black where the warp is up: for jacquard looms such as the TC2',
  },
  {
    format: 'bmp-color',
    primary: 'Bitmap (BMP), colours',
    secondary: 'One pixel per crossing, in the thread colours',
  },
]

export function AppToolbar(p: Props) {
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null)
  const [toolsAnchor, setToolsAnchor] = useState<HTMLElement | null>(null)
  const toolList = useRef<HTMLUListElement>(null)
  const toolSearch = useRef<HTMLInputElement>(null)
  // Between tablet and big desktop widths, the file buttons are icons only so the app bar fits on one line.
  const fileCompact = useMidWidth() || p.compact
  // Narrower still, the name drops its wordmark and Tools and 3D cloth lose their labels.
  const narrow = useNarrow() || p.compact
  const [toolQuery, setToolQuery] = useState('')
  const [fileAnchor, setFileAnchor] = useState<HTMLElement | null>(null)
  const [printAnchor, setPrintAnchor] = useState<HTMLElement | null>(null)
  const close = () => {
    setExportAnchor(null)
    setToolsAnchor(null)
    setFileAnchor(null)
    setPrintAnchor(null)
  }
  const then = (fn: () => void) => () => {
    close()
    fn()
  }
  const exportItems = [
    ...EXPORTS.map((x) => (
      <MenuItem key={x.format} onClick={then(() => p.onExport(x.format))}>
        <ListItemText primary={x.primary} secondary={x.secondary} />
      </MenuItem>
    )),
    ...IMAGES.map((x) => (
      <MenuItem key={x.format} onClick={then(() => p.onExportImage(x.format))}>
        <ListItemIcon>
          <ImageIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={x.primary} secondary={x.secondary} />
      </MenuItem>
    )),
  ]
  const printItems = [
    <MenuItem key="draft" onClick={then(() => p.onPrint(false))}>
      <ListItemText primary="Print draft" />
    </MenuItem>,
    <MenuItem key="instructions" onClick={then(() => p.onPrint(true))}>
      <ListItemText primary="Print draft and written instructions" secondary="Adds threading and treadling lists" />
    </MenuItem>,
  ]

  // Every tool, by group, so the menu can be searched.
  const tools: {
    group: string
    primary: string
    secondary: string
    onClick: () => void
    icon?: ReactNode
    href?: string
  }[] = [
    {
      group: 'Edit',
      primary: 'Sequence tools…',
      secondary: 'Fill, repeat, mirror, reverse, insert or delete ends and picks',
      onClick: p.onSequenceTools,
    },
    {
      group: 'Edit',
      primary: 'Tromp as writ',
      secondary: 'Treadle as drawn in: copy the threading to the treadling',
      onClick: p.onTrompAsWrit,
    },
    {
      group: 'Design',
      primary: 'Colours and presets…',
      secondary: 'Stripe sequences; houndstooth, log cabin and more',
      onClick: p.onColors,
      icon: <PaletteIcon fontSize="small" />,
    },
    {
      group: 'Design',
      primary: 'Draw the cloth…',
      secondary: 'Paint the cloth; get the threading, tie-up and treadling',
      onClick: p.onCloth,
    },
    {
      group: 'Design',
      primary: 'Block profile…',
      secondary: 'Design in blocks: overshot, summer and winter, lace, crackle, twill…',
      onClick: p.onProfile,
    },
    {
      group: 'Design',
      primary: 'Double cloth…',
      secondary: 'Two layers: separate, tube, double width or blocks',
      onClick: p.onDoubleCloth,
    },
    {
      group: 'Design',
      primary: 'Picture to draft…',
      secondary: 'Turn a picture into blocks and a draft',
      onClick: p.onPicture,
    },
    {
      group: 'Design',
      primary: 'Echo weave…',
      secondary: 'A design line threaded with its echo, in two colours',
      onClick: p.onEcho,
    },
    {
      group: 'Design',
      primary: 'Variations…',
      secondary: 'Same threading, other tie-ups and treadlings',
      onClick: p.onVariations,
    },
    {
      group: 'Design',
      primary: 'Colourways…',
      secondary: 'The same cloth in other colours, side by side',
      onClick: p.onColorways,
    },
    {
      group: 'Change the whole draft',
      primary: 'Transform draft…',
      secondary: 'Turn 90°, swap face and back, flip, move the repeat',
      onClick: p.onTransform,
    },
    p.isLiftplan
      ? {
          group: 'Change the whole draft',
          primary: 'Convert to tie-up and treadling',
          secondary: 'One treadle for each different shed, for floor looms',
          onClick: p.onToTreadling,
        }
      : {
          group: 'Change the whole draft',
          primary: 'Convert to lift plan',
          secondary: 'Shafts per pick, for dobby looms',
          onClick: p.onToLiftplan,
        },
    {
      group: 'Change the whole draft',
      primary: 'Cloth report…',
      secondary: 'Warp and weft faces, interlacing, floats, firmness',
      onClick: p.onReport,
    },
    {
      group: 'Plan the warp',
      primary: 'Warp winding plan…',
      secondary: 'Colour order for the warping board, in bouts',
      onClick: p.onWarpPlan,
    },
    {
      group: 'Plan the warp',
      primary: 'Warp calculator…',
      secondary: 'Warp length, width in reed and yarn per colour',
      onClick: p.onCalculator,
      icon: <CalculateIcon fontSize="small" />,
    },
    {
      group: 'Plan the warp',
      primary: 'Yarn library…',
      secondary: 'Named yarns with grist and price, matched by colour',
      onClick: p.onYarns,
    },
    {
      group: 'Other looms',
      primary: 'Rigid heddle…',
      secondary: 'Weave this draft with a rigid heddle and pick-up stick',
      onClick: p.onRigidHeddle,
    },
    {
      group: 'Other looms',
      primary: 'Drawloom…',
      secondary: 'Damask and other pattern-harness designs, drawn in units',
      onClick: p.onDrawloom,
    },
    { group: 'Other looms', primary: 'Tablet weaving…', secondary: 'Design card-woven bands', onClick: p.onTablet },
    {
      group: 'Other crafts',
      primary: 'Knit Patterner',
      secondary: 'Knitting charts, written patterns and colourwork',
      onClick: close,
      href: './knit/',
    },
    {
      group: 'Other crafts',
      primary: 'Sew Patterner',
      secondary: 'Made-to-measure sewing patterns, printed at home',
      onClick: close,
      href: './sew/',
    },
  ]
  const words = toolQuery.toLowerCase().split(/\s+/).filter(Boolean)
  const found = tools.filter((t) =>
    words.every((w) => `${t.group} ${t.primary} ${t.secondary}`.toLowerCase().includes(w)),
  )
  const toolItems = found.flatMap((t, i) => [
    ...(i === 0 || found[i - 1].group !== t.group
      ? [
          <MenuHeading key={`g-${t.group}`} sticky={false}>
            {t.group}
          </MenuHeading>,
        ]
      : []),
    t.href ? (
      <MenuItem key={t.primary} component="a" href={t.href} onClick={t.onClick}>
        <ListItemText primary={t.primary} secondary={t.secondary} />
      </MenuItem>
    ) : (
      <MenuItem
        key={t.primary}
        onClick={() => {
          close()
          setToolQuery('')
          t.onClick()
        }}
      >
        {t.icon && <ListItemIcon>{t.icon}</ListItemIcon>}
        <ListItemText primary={t.primary} secondary={t.secondary} />
      </MenuItem>
    ),
  ])

  const fileItems = [
    <MenuItem key="share" onClick={then(p.onShare)}>
      <ListItemIcon>
        <IosShareIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Share…" secondary="A link, or a picture for Instagram and Pinterest" />
    </MenuItem>,
    <MenuItem key="save" onClick={then(p.onSave)}>
      <ListItemIcon>
        <SaveIcon fontSize="small" />
      </ListItemIcon>
      Save
    </MenuItem>,
    <MenuItem key="load" onClick={then(p.onLoad)}>
      <ListItemIcon>
        <FolderOpenIcon fontSize="small" />
      </ListItemIcon>
      Load
    </MenuItem>,
    <MenuItem key="import" onClick={then(p.onImport)}>
      <ListItemIcon>
        <FileUploadIcon fontSize="small" />
      </ListItemIcon>
      Import
    </MenuItem>,
    <Divider key="d1" />,
    <MenuHeading key="print">Print</MenuHeading>,
    ...printItems,
    <Divider key="d2" />,
    <MenuHeading key="export">Export</MenuHeading>,
    ...exportItems,
    <Divider key="d3" />,
    <MenuItem key="help" onClick={then(p.onHelp)}>
      <ListItemIcon>
        <HelpOutlineIcon fontSize="small" />
      </ListItemIcon>
      Help
    </MenuItem>,
  ]
  const openTools = (e: MouseEvent<HTMLElement>) => setToolsAnchor(e.currentTarget)

  return (
    <>
      <AppBar
        position="sticky"
        // When the page scrolls sideways to show a wide draft, the bar stays put across the window.
        sx={p.width ? { left: 0, width: p.width } : undefined}
      >
        <Toolbar
          sx={{
            gap: p.compact ? 0.25 : 1.5,
            rowGap: 1,
            flexWrap: p.compact ? 'nowrap' : 'wrap',
            py: 1,
            px: { xs: 1, sm: 2.5 },
            minHeight: { xs: 60, sm: 64 },
          }}
        >
          <Box sx={{ display: 'flex', flex: 'none', ml: p.phone ? 0.5 : 0 }}>
            <Logo compact={narrow} />
          </Box>
          {!p.compact && <Rule />}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              flex: p.compact ? '1 1 auto' : '0 1 auto',
              ml: p.compact ? 1 : 0,
            }}
          >
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, fontSize: 15 }}>
              {p.name ?? 'Unsaved pattern'}
            </Typography>
            <Typography variant="caption" noWrap color="text.secondary" data-testid="draft-summary">
              {p.summary}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flex: 'none' }}>
            <Action
              compact={p.compact}
              iconOnly
              icon={<UndoIcon />}
              label="Undo"
              onClick={p.onUndo}
              disabled={!p.canUndo}
            />
            <Action
              compact={p.compact}
              iconOnly
              icon={<RedoIcon />}
              label="Redo"
              onClick={p.onRedo}
              disabled={!p.canRedo}
            />
          </Box>
          {p.touch && (
            <Tooltip title={p.touchPaint ? 'Drag-painting on: tap to scroll instead' : 'Drag to paint'}>
              <IconButton
                color={p.touchPaint ? 'primary' : 'inherit'}
                aria-label="Drag to paint"
                aria-pressed={p.touchPaint}
                onClick={p.onToggleTouchPaint}
                sx={p.touchPaint ? { bgcolor: 'var(--wp-hover)' } : undefined}
              >
                <BrushIcon />
              </IconButton>
            </Tooltip>
          )}
          {!p.compact && <Box sx={{ flex: '1 1 0px' }} />}

          {!p.phone && (
            <Box
              component="nav"
              aria-label="File"
              data-help="files"
              sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px', flex: 'none' }}
            >
              <Action compact={fileCompact} icon={<SaveIcon />} label="Save" onClick={p.onSave} />
              <Action compact={fileCompact} icon={<FolderOpenIcon />} label="Load" onClick={p.onLoad} />
              <Action compact={fileCompact} icon={<FileUploadIcon />} label="Import" onClick={p.onImport} />
              <Action
                compact={fileCompact}
                icon={<FileDownloadIcon />}
                label="Export"
                onClick={(e) => setExportAnchor(e.currentTarget)}
              />
              <Menu anchorEl={exportAnchor} open={exportAnchor !== null} onClose={close}>
                {exportItems}
              </Menu>
              <Action
                compact={fileCompact}
                icon={<PrintIcon />}
                label="Print"
                onClick={(e) => setPrintAnchor(e.currentTarget)}
              />
              <Menu anchorEl={printAnchor} open={printAnchor !== null} onClose={close}>
                {printItems}
              </Menu>
              <Action compact={fileCompact} icon={<IosShareIcon />} label="Share" onClick={p.onShare} />
            </Box>
          )}
          {!p.compact && <Rule />}
          <Box
            component="nav"
            aria-label="Studio"
            sx={{ display: 'flex', alignItems: 'center', gap: p.compact ? '2px' : 1, flex: 'none' }}
          >
            {!p.phone && (
              <Action
                compact={narrow}
                icon={<HandymanIcon />}
                label="Tools"
                onClick={openTools}
                tour="tools"
                help="tools"
              />
            )}
            {!p.phone && (
              <Action
                compact={narrow}
                variant="outlined"
                icon={<ViewInArIcon />}
                label="3D cloth"
                onClick={p.on3d}
                tour="3d"
                help="3d"
              />
            )}
            {p.compact ? (
              <Tooltip title="Start weaving" describeChild>
                <IconButton
                  aria-label="Start weaving"
                  data-tour="weave"
                  data-help="weaving"
                  onClick={p.onWeave}
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
                label="Start weaving"
                tour="weave"
                help="weaving"
                onClick={p.onWeave}
              />
            )}
            <ThemeToggle />
          </Box>
          {/* A popover rather than a menu: the search box sits above the menu of tools, not inside it. */}
          <Popover
            anchorEl={toolsAnchor}
            open={toolsAnchor !== null}
            onClose={() => {
              close()
              setToolQuery('')
            }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            // The search box takes focus as it opens, not the popover itself.
            disableAutoFocus
            slotProps={{
              transition: { onEntering: () => toolSearch.current?.focus() },
              paper: {
                sx: {
                  maxHeight: '80vh',
                  width: 380,
                  maxWidth: 'calc(100vw - 16px)',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                },
              },
            }}
          >
            <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
              <TextField
                inputRef={toolSearch}
                fullWidth
                size="small"
                placeholder="Find a tool"
                value={toolQuery}
                onChange={(e) => setToolQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Down arrow (or Enter) goes from the search to the tools found.
                  if (e.key !== 'ArrowDown' && e.key !== 'Enter') return
                  e.preventDefault()
                  toolList.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
                }}
                slotProps={{ htmlInput: { 'aria-label': 'Find a tool', 'aria-controls': 'tool-list' } }}
              />
            </Box>
            {toolItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 1.5 }} role="status">
                No tool matches "{toolQuery}".
              </Typography>
            ) : (
              <MenuList id="tool-list" ref={toolList} aria-label="Tools" sx={{ overflowY: 'auto', pt: 0 }}>
                {toolItems}
              </MenuList>
            )}
          </Popover>
        </Toolbar>
      </AppBar>
      {p.phone && (
        <>
          <PhoneNav>
            <NavTab current icon={<GridOnIcon />} label="Draft" onClick={p.onDraft} />
            <NavTab icon={<ViewInArIcon />} label="3D cloth" onClick={p.on3d} />
            <NavTab icon={<HandymanIcon />} label="Tools" onClick={openTools} />
            <NavTab icon={<SaveIcon />} label="File" onClick={(e) => setFileAnchor(e.currentTarget)} />
          </PhoneNav>
          <Menu anchorEl={fileAnchor} open={fileAnchor !== null} onClose={close}>
            {fileItems}
          </Menu>
        </>
      )}
    </>
  )
}
