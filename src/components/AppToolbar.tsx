import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import AssessmentIcon from '@mui/icons-material/Assessment'
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic'
import BrushIcon from '@mui/icons-material/Brush'
import CalculateIcon from '@mui/icons-material/Calculate'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DataObjectIcon from '@mui/icons-material/DataObject'
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner'
import DrawIcon from '@mui/icons-material/Draw'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import GestureIcon from '@mui/icons-material/Gesture'
import Grid4x4Icon from '@mui/icons-material/Grid4x4'
import GridOnIcon from '@mui/icons-material/GridOn'
import GridViewIcon from '@mui/icons-material/GridView'
import HandymanIcon from '@mui/icons-material/Handyman'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import ImageIcon from '@mui/icons-material/Image'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import InvertColorsIcon from '@mui/icons-material/InvertColors'
import IosShareIcon from '@mui/icons-material/IosShare'
import LayersIcon from '@mui/icons-material/Layers'
import PaletteIcon from '@mui/icons-material/Palette'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PrintIcon from '@mui/icons-material/Print'
import RedoIcon from '@mui/icons-material/Redo'
import RepeatIcon from '@mui/icons-material/Repeat'
import Rotate90DegreesCwIcon from '@mui/icons-material/Rotate90DegreesCw'
import SaveIcon from '@mui/icons-material/Save'
import StyleIcon from '@mui/icons-material/Style'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import TableRowsIcon from '@mui/icons-material/TableRows'
import UndoIcon from '@mui/icons-material/Undo'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import WavesIcon from '@mui/icons-material/Waves'
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
import { KnitMark } from '../knit/KnitLogo'
import { useMidWidth, useNarrow } from '../layout'
import { SewMark } from '../sew/SewLogo'
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
  /** Opens Print: the printed sheet's options (written instructions, a QR code), then prints. */
  onPrint: () => void
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
  onPaper: () => void
  onDrawloom: () => void
  onYarns: () => void
  onToLiftplan: () => void
  onToTreadling: () => void
  /** The draft is a lift plan (straight tie-up), so offer converting back rather than to a lift plan. */
  isLiftplan: boolean
}

const EXPORTS: { format: ExportFormat; primary: string; secondary: string; icon: ReactNode }[] = [
  {
    format: 'json',
    primary: 'Pattern file (.weave.json)',
    secondary: 'Re-import into Weave Patterner',
    icon: <DataObjectIcon fontSize="small" />,
  },
  {
    format: 'wif',
    primary: 'WIF (.wif)',
    secondary: 'Threading, tie-up and treadling for weaving software and treadle looms',
    icon: <InsertDriveFileIcon fontSize="small" />,
  },
  {
    format: 'liftplan',
    primary: 'WIF lift plan (.wif)',
    secondary: 'Shafts lifted per pick, for computer-dobby looms',
    icon: <TableRowsIcon fontSize="small" />,
  },
]

const IMAGES: { format: ImageFormat; primary: string; secondary: string; icon: ReactNode }[] = [
  {
    format: 'png',
    primary: 'Image (PNG)',
    secondary: 'Picture of the draft to share',
    icon: <ImageIcon fontSize="small" />,
  },
  {
    format: 'svg',
    primary: 'Image (SVG)',
    secondary: 'Scalable picture for printing or editing',
    icon: <GestureIcon fontSize="small" />,
  },
  {
    format: 'bmp',
    primary: 'Bitmap (BMP), black and white',
    secondary: 'One pixel per crossing, black where the warp is up: for jacquard looms such as the TC2',
    icon: <Grid4x4Icon fontSize="small" />,
  },
  {
    format: 'bmp-color',
    primary: 'Bitmap (BMP), colours',
    secondary: 'One pixel per crossing, in the thread colours',
    icon: <GridOnIcon fontSize="small" />,
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
  const close = () => {
    setExportAnchor(null)
    setToolsAnchor(null)
    setFileAnchor(null)
  }
  const then = (fn: () => void) => () => {
    close()
    fn()
  }
  const exportItems = [
    ...EXPORTS.map((x) => (
      <MenuItem key={x.format} onClick={then(() => p.onExport(x.format))}>
        <ListItemIcon>{x.icon}</ListItemIcon>
        <ListItemText primary={x.primary} secondary={x.secondary} />
      </MenuItem>
    )),
    ...IMAGES.map((x) => (
      <MenuItem key={x.format} onClick={then(() => p.onExportImage(x.format))}>
        <ListItemIcon>{x.icon}</ListItemIcon>
        <ListItemText primary={x.primary} secondary={x.secondary} />
      </MenuItem>
    )),
  ]

  // Every tool, by group, so the menu can be searched.
  const tools: {
    group: string
    primary: string
    secondary: string
    onClick: () => void
    icon: ReactNode
    href?: string
  }[] = [
    {
      group: 'Edit',
      primary: 'Sequence tools…',
      secondary: 'Fill, repeat, mirror, reverse, insert or delete ends and picks',
      onClick: p.onSequenceTools,
      icon: <RepeatIcon fontSize="small" />,
    },
    {
      group: 'Edit',
      primary: 'Tromp as writ',
      secondary: 'Treadle as drawn in: copy the threading to the treadling',
      onClick: p.onTrompAsWrit,
      icon: <ContentCopyIcon fontSize="small" />,
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
      primary: 'Draw on the drawdown',
      secondary: 'Swap squares between warp and weft, right on the drawdown',
      onClick: p.onCloth,
      icon: <DrawIcon fontSize="small" />,
    },
    {
      group: 'Design',
      primary: 'Draw on paper…',
      secondary: 'Print a grid to colour in, then scan or photograph it as a new pattern',
      onClick: p.onPaper,
      icon: <DocumentScannerIcon fontSize="small" />,
    },
    {
      group: 'Design',
      primary: 'Block profile…',
      secondary: 'Design in blocks: overshot, summer and winter, lace, crackle, twill…',
      onClick: p.onProfile,
      icon: <ViewModuleIcon fontSize="small" />,
    },
    {
      group: 'Design',
      primary: 'Double cloth…',
      secondary: 'Two layers: separate, tube, double width or blocks',
      onClick: p.onDoubleCloth,
      icon: <LayersIcon fontSize="small" />,
    },
    {
      group: 'Design',
      primary: 'Picture to draft…',
      secondary: 'Turn a picture into blocks and a draft',
      onClick: p.onPicture,
      icon: <AddPhotoAlternateIcon fontSize="small" />,
    },
    {
      group: 'Design',
      primary: 'Echo weave…',
      secondary: 'A design line threaded with its echo, in two colours',
      onClick: p.onEcho,
      icon: <WavesIcon fontSize="small" />,
    },
    {
      group: 'Design',
      primary: 'Variations…',
      secondary: 'Same threading, other tie-ups and treadlings',
      onClick: p.onVariations,
      icon: <AutoAwesomeMosaicIcon fontSize="small" />,
    },
    {
      group: 'Design',
      primary: 'Colourways…',
      secondary: 'The same cloth in other colours, side by side',
      onClick: p.onColorways,
      icon: <InvertColorsIcon fontSize="small" />,
    },
    {
      group: 'Change the whole draft',
      primary: 'Transform draft…',
      secondary: 'Turn 90°, swap face and back, flip, move the repeat',
      onClick: p.onTransform,
      icon: <Rotate90DegreesCwIcon fontSize="small" />,
    },
    p.isLiftplan
      ? {
          group: 'Change the whole draft',
          primary: 'Convert to tie-up and treadling',
          secondary: 'One treadle for each different shed, for floor looms',
          onClick: p.onToTreadling,
          icon: <SwapHorizIcon fontSize="small" />,
        }
      : {
          group: 'Change the whole draft',
          primary: 'Convert to lift plan',
          secondary: 'Shafts per pick, for dobby looms',
          onClick: p.onToLiftplan,
          icon: <SwapHorizIcon fontSize="small" />,
        },
    {
      group: 'Change the whole draft',
      primary: 'Cloth report…',
      secondary: 'Warp and weft faces, interlacing, floats, firmness',
      onClick: p.onReport,
      icon: <AssessmentIcon fontSize="small" />,
    },
    {
      group: 'Plan the warp',
      primary: 'Warp winding plan…',
      secondary: 'Colour order for the warping board, in bouts',
      onClick: p.onWarpPlan,
      icon: <FormatListNumberedIcon fontSize="small" />,
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
      icon: <Inventory2Icon fontSize="small" />,
    },
    {
      group: 'Other looms',
      primary: 'Rigid heddle…',
      secondary: 'Weave this draft with a rigid heddle and pick-up stick',
      onClick: p.onRigidHeddle,
      icon: <ViewColumnIcon fontSize="small" />,
    },
    {
      group: 'Other looms',
      primary: 'Drawloom…',
      secondary: 'Damask and other pattern-harness designs, drawn in units',
      onClick: p.onDrawloom,
      icon: <GridViewIcon fontSize="small" />,
    },
    {
      group: 'Other looms',
      primary: 'Tablet weaving…',
      secondary: 'Design card-woven bands',
      onClick: p.onTablet,
      icon: <StyleIcon fontSize="small" />,
    },
    {
      group: 'Other crafts',
      primary: 'Knit Patterner',
      secondary: 'Knitting charts, written patterns and colourwork',
      onClick: close,
      href: './knit/',
      icon: <KnitMark size={20} />,
    },
    {
      group: 'Other crafts',
      primary: 'Sew Patterner',
      secondary: 'Made-to-measure sewing patterns, printed at home',
      onClick: close,
      href: './sew/',
      icon: <SewMark size={20} />,
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
        <ListItemIcon>{t.icon}</ListItemIcon>
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
        <ListItemIcon>{t.icon}</ListItemIcon>
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
    <MenuItem key="print" onClick={then(p.onPrint)}>
      <ListItemIcon>
        <PrintIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Print…" secondary="The draft, with a QR code and written instructions if you like" />
    </MenuItem>,
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
              <Action compact={fileCompact} icon={<PrintIcon />} label="Print" onClick={p.onPrint} />
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
            slotProps={{
              paper: {
                sx: {
                  maxHeight: '80vh',
                  width: 420,
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
