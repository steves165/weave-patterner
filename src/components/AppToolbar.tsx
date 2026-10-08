import BrushIcon from '@mui/icons-material/Brush'
import CalculateIcon from '@mui/icons-material/Calculate'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import GridOnIcon from '@mui/icons-material/GridOn'
import HandymanIcon from '@mui/icons-material/Handyman'
import ImageIcon from '@mui/icons-material/Image'
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
  ListSubheader,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { type MouseEvent, useState } from 'react'
import type { ExportFormat, ImageFormat } from '../exportDraft'
import { useMidWidth, useNarrow } from '../layout'
import { Action, NavTab, PhoneNav, Rule } from './AppBarParts'
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

export function AppToolbar(p: Props) {
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null)
  const [toolsAnchor, setToolsAnchor] = useState<HTMLElement | null>(null)
  // Between tablet and big desktop widths, the file buttons are icons only so the app bar fits on one line.
  const fileCompact = useMidWidth() || p.compact
  // Narrower still, the name drops its wordmark and Tools and 3D cloth lose their labels.
  const narrow = useNarrow() || p.compact
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
    ...(['png', 'svg'] as const).map((f) => (
      <MenuItem key={f} onClick={then(() => p.onExportImage(f))}>
        <ListItemIcon>
          <ImageIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary={`Image (${f.toUpperCase()})`}
          secondary={f === 'png' ? 'Picture of the draft to share' : 'Scalable picture for printing or editing'}
        />
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

  const fileItems = [
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
    <ListSubheader key="print">Print</ListSubheader>,
    ...printItems,
    <Divider key="d2" />,
    <ListSubheader key="export">Export</ListSubheader>,
    ...exportItems,
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
            </Box>
          )}
          {!p.compact && <Rule />}
          <Box
            component="nav"
            aria-label="Studio"
            sx={{ display: 'flex', alignItems: 'center', gap: p.compact ? '2px' : 1, flex: 'none' }}
          >
            {!p.phone && <Action compact={narrow} icon={<HandymanIcon />} label="Tools" onClick={openTools} />}
            {!p.phone && (
              <Action compact={narrow} variant="outlined" icon={<ViewInArIcon />} label="3D cloth" onClick={p.on3d} />
            )}
            {p.compact ? (
              <Tooltip title="Start weaving" describeChild>
                <IconButton
                  aria-label="Start weaving"
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
                onClick={p.onWeave}
              />
            )}
            <ThemeToggle />
          </Box>
          <Menu anchorEl={toolsAnchor} open={toolsAnchor !== null} onClose={close}>
            <ListSubheader disableSticky>Edit</ListSubheader>
            <MenuItem onClick={then(p.onSequenceTools)}>
              <ListItemText
                primary="Sequence tools…"
                secondary="Fill, repeat, mirror, reverse, insert or delete ends and picks"
              />
            </MenuItem>
            <MenuItem onClick={then(p.onTrompAsWrit)}>
              <ListItemText
                primary="Tromp as writ"
                secondary="Treadle as drawn in: copy the threading to the treadling"
              />
            </MenuItem>
            <ListSubheader disableSticky>Design</ListSubheader>
            <MenuItem onClick={then(p.onColors)}>
              <ListItemIcon>
                <PaletteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Colours and presets…"
                secondary="Stripe sequences; houndstooth, log cabin and more"
              />
            </MenuItem>
            <MenuItem onClick={then(p.onCloth)}>
              <ListItemText
                primary="Draw the cloth…"
                secondary="Paint the cloth; get the threading, tie-up and treadling"
              />
            </MenuItem>
            <MenuItem onClick={then(p.onProfile)}>
              <ListItemText
                primary="Block profile…"
                secondary="Design in blocks: overshot, summer and winter, lace, crackle, twill…"
              />
            </MenuItem>
            <MenuItem onClick={then(p.onDoubleCloth)}>
              <ListItemText primary="Double cloth…" secondary="Two layers: separate, tube, double width or blocks" />
            </MenuItem>
            <MenuItem onClick={then(p.onPicture)}>
              <ListItemText primary="Picture to draft…" secondary="Turn a picture into blocks and a draft" />
            </MenuItem>
            <MenuItem onClick={then(p.onEcho)}>
              <ListItemText primary="Echo weave…" secondary="A design line threaded with its echo, in two colours" />
            </MenuItem>
            <MenuItem onClick={then(p.onVariations)}>
              <ListItemText primary="Variations…" secondary="Same threading, other tie-ups and treadlings" />
            </MenuItem>
            <MenuItem onClick={then(p.onColorways)}>
              <ListItemText primary="Colourways…" secondary="The same cloth in other colours, side by side" />
            </MenuItem>
            <ListSubheader disableSticky>Change the whole draft</ListSubheader>
            <MenuItem onClick={then(p.onTransform)}>
              <ListItemText
                primary="Transform draft…"
                secondary="Turn 90°, swap face and back, flip, move the repeat"
              />
            </MenuItem>
            {p.isLiftplan ? (
              <MenuItem onClick={then(p.onToTreadling)}>
                <ListItemText
                  primary="Convert to tie-up and treadling"
                  secondary="One treadle for each different shed, for floor looms"
                />
              </MenuItem>
            ) : (
              <MenuItem onClick={then(p.onToLiftplan)}>
                <ListItemText primary="Convert to lift plan" secondary="Shafts per pick, for dobby looms" />
              </MenuItem>
            )}
            <MenuItem onClick={then(p.onReport)}>
              <ListItemText primary="Cloth report…" secondary="Warp and weft faces, interlacing, floats, firmness" />
            </MenuItem>
            <ListSubheader disableSticky>Plan the warp</ListSubheader>
            <MenuItem onClick={then(p.onWarpPlan)}>
              <ListItemText primary="Warp winding plan…" secondary="Colour order for the warping board, in bouts" />
            </MenuItem>
            <MenuItem onClick={then(p.onCalculator)}>
              <ListItemIcon>
                <CalculateIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Warp calculator…" secondary="Warp length, width in reed and yarn per colour" />
            </MenuItem>
            <MenuItem onClick={then(p.onYarns)}>
              <ListItemText primary="Yarn library…" secondary="Named yarns with grist and price, matched by colour" />
            </MenuItem>
            <ListSubheader disableSticky>Other looms</ListSubheader>
            <MenuItem onClick={then(p.onRigidHeddle)}>
              <ListItemText
                primary="Rigid heddle…"
                secondary="Weave this draft with a rigid heddle and pick-up stick"
              />
            </MenuItem>
            <MenuItem onClick={then(p.onDrawloom)}>
              <ListItemText primary="Drawloom…" secondary="Damask and other pattern-harness designs, drawn in units" />
            </MenuItem>
            <MenuItem onClick={then(p.onTablet)}>
              <ListItemText primary="Tablet weaving…" secondary="Design card-woven bands" />
            </MenuItem>
            <ListSubheader disableSticky>Other crafts</ListSubheader>
            <MenuItem component="a" href="./knit/" onClick={close}>
              <ListItemText primary="Knit Patterner" secondary="Knitting charts, written patterns and colourwork" />
            </MenuItem>
          </Menu>
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
