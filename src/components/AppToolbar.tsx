import BrushIcon from '@mui/icons-material/Brush'
import CalculateIcon from '@mui/icons-material/Calculate'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import HandymanIcon from '@mui/icons-material/Handyman'
import ImageIcon from '@mui/icons-material/Image'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PaletteIcon from '@mui/icons-material/Palette'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import PrintIcon from '@mui/icons-material/Print'
import RedoIcon from '@mui/icons-material/Redo'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import {
  AppBar,
  Button,
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
import { type MouseEvent, type ReactNode, useState } from 'react'
import type { ExportFormat, ImageFormat } from '../exportDraft'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  name: string | null
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

/** A toolbar button: icon + label on wide screens, icon-only with a tooltip on narrow ones. */
function Action(props: {
  compact: boolean
  icon: ReactNode
  label: string
  onClick: (e: MouseEvent<HTMLElement>) => void
  disabled?: boolean
  iconOnly?: boolean
}) {
  const { compact, icon, label, onClick, disabled, iconOnly } = props
  return compact || iconOnly ? (
    <Tooltip title={label} describeChild>
      {/* span keeps the tooltip working while the button is disabled */}
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
}

export function AppToolbar(p: Props) {
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null)
  const [toolsAnchor, setToolsAnchor] = useState<HTMLElement | null>(null)
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null)
  const [printAnchor, setPrintAnchor] = useState<HTMLElement | null>(null)
  const close = () => {
    setExportAnchor(null)
    setToolsAnchor(null)
    setMoreAnchor(null)
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

  return (
    <AppBar position="sticky">
      <Toolbar sx={{ gap: p.compact ? 0.25 : 1, flexWrap: p.compact ? 'nowrap' : 'wrap' }}>
        {!p.phone && (
          <Typography variant="h6" sx={{ mr: 2 }} noWrap>
            Weave Patterner
          </Typography>
        )}
        <Typography variant="body2" sx={{ opacity: 0.8, flexGrow: 1, minWidth: 0 }} noWrap>
          {p.name ?? 'Unsaved pattern'}
        </Typography>

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
        {p.touch && (
          <Tooltip title={p.touchPaint ? 'Drag-painting on: tap to scroll instead' : 'Drag to paint'}>
            <IconButton
              color="inherit"
              aria-label="Drag to paint"
              aria-pressed={p.touchPaint}
              onClick={p.onToggleTouchPaint}
              sx={
                p.touchPaint
                  ? { bgcolor: 'rgba(255,255,255,0.25)', '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' } }
                  : undefined
              }
            >
              <BrushIcon />
            </IconButton>
          </Tooltip>
        )}
        <Action compact={p.compact} icon={<PlayCircleIcon />} label="Weave" onClick={p.onWeave} />
        <Action compact={p.compact} icon={<ViewInArIcon />} label="3D" onClick={p.on3d} />
        <Action
          compact={p.compact}
          icon={<HandymanIcon />}
          label="Tools"
          onClick={(e) => setToolsAnchor(e.currentTarget)}
        />
        <Menu anchorEl={toolsAnchor} open={toolsAnchor !== null} onClose={close}>
          <ListSubheader>Edit</ListSubheader>
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
          <ListSubheader>Design</ListSubheader>
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
          <ListSubheader>Change the whole draft</ListSubheader>
          <MenuItem onClick={then(p.onTransform)}>
            <ListItemText primary="Transform draft…" secondary="Turn 90°, swap face and back, flip, move the repeat" />
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
          <ListSubheader>Plan the warp</ListSubheader>
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
        </Menu>

        {p.phone ? (
          <>
            <Action compact icon={<MoreVertIcon />} label="More" onClick={(e) => setMoreAnchor(e.currentTarget)} />
            <Menu anchorEl={moreAnchor} open={moreAnchor !== null} onClose={close}>
              <MenuItem onClick={then(p.onSave)}>
                <ListItemIcon>
                  <SaveIcon fontSize="small" />
                </ListItemIcon>
                Save
              </MenuItem>
              <MenuItem onClick={then(p.onLoad)}>
                <ListItemIcon>
                  <FolderOpenIcon fontSize="small" />
                </ListItemIcon>
                Load
              </MenuItem>
              <MenuItem onClick={then(p.onImport)}>
                <ListItemIcon>
                  <FileUploadIcon fontSize="small" />
                </ListItemIcon>
                Import
              </MenuItem>
              <Divider />
              <ListSubheader>Print</ListSubheader>
              {printItems}
              <Divider />
              <ListSubheader>Export</ListSubheader>
              {exportItems}
            </Menu>
          </>
        ) : (
          <>
            <Action compact={p.compact} icon={<SaveIcon />} label="Save" onClick={p.onSave} />
            <Action compact={p.compact} icon={<FolderOpenIcon />} label="Load" onClick={p.onLoad} />
            <Action
              compact={p.compact}
              icon={<FileDownloadIcon />}
              label="Export"
              onClick={(e) => setExportAnchor(e.currentTarget)}
            />
            <Menu anchorEl={exportAnchor} open={exportAnchor !== null} onClose={close}>
              {exportItems}
            </Menu>
            <Action compact={p.compact} icon={<FileUploadIcon />} label="Import" onClick={p.onImport} />
            <Action
              compact={p.compact}
              icon={<PrintIcon />}
              label="Print"
              onClick={(e) => setPrintAnchor(e.currentTarget)}
            />
            <Menu anchorEl={printAnchor} open={printAnchor !== null} onClose={close}>
              {printItems}
            </Menu>
          </>
        )}
        <ThemeToggle />
      </Toolbar>
    </AppBar>
  )
}
