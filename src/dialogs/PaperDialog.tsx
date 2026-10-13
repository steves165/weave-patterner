import CameraAltIcon from '@mui/icons-material/CameraAlt'
import DownloadIcon from '@mui/icons-material/Download'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PrintIcon from '@mui/icons-material/Print'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '../analytics'
import { DialogTitle } from '../components/DialogTitle'
import { PatternThumb } from '../components/PatternThumb'
import { FIELD_GRID } from '../components/SettingsPanel'
import { download } from '../exportDraft'
import { readImagePixels } from '../imageFile'
import { usePhone } from '../layout'
import { MAX_SQUARES, PAPERS, type PaperSize, type SheetLayout, type SheetSpec, sheetLayout } from '../paper/layout'
import { sheetPdf } from '../paper/pdf'
import { canvasPainter, drawSheet } from '../paper/render'
import { readSheet } from '../paper/scan'
import { draftFromScan, type FromScan } from '../paper/toDraft'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  /** The current pattern, for the grid's starting size and name. */
  draft: Draft
  name: string | null
  onClose: () => void
  /** Opens the pattern read from the paper as a new pattern. */
  onOpen: (draft: Draft, name: string, message: string) => void
}

/** The paper size people use where they are. */
const localPaper = (): PaperSize => (/^en-(US|CA)|^es-(MX|US)/.test(navigator.language) ? 'letter' : 'a4')

const fileName = (name: string) => `${name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Paper pattern'} (to draw on).pdf`

/** The sheet drawn small, as a picture for the preview. */
function SheetPreview({ layout }: { layout: SheetLayout }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const k = 2
    canvas.width = Math.round(layout.page.w * k)
    canvas.height = Math.round(layout.page.h * k)
    drawSheet(canvasPainter(ctx, k), layout)
  }, [layout])
  return (
    <Box
      component="canvas"
      ref={ref}
      role="img"
      aria-label={`The sheet to print: ${layout.spec.ends} by ${layout.spec.picks} squares on ${PAPERS[layout.spec.paper].name}`}
      sx={{
        display: 'block',
        width: '100%',
        height: 'auto',
        maxHeight: 420,
        objectFit: 'contain',
        boxShadow: 2,
        bgcolor: '#fff',
      }}
    />
  )
}

/**
 * Draw on paper: print a sheet with a grid to colour in by hand (with a QR code that remembers its size and name, and
 * marks to line it up by), then scan or photograph it, and open what's drawn as a new pattern in its colours.
 */
export function PaperDialog({ open, draft, name, onClose, onOpen }: Props) {
  const phone = usePhone()
  const [tab, setTab] = useState(0)
  const [spec, setSpec] = useState<SheetSpec>(() => ({
    kind: 'drawdown',
    name: name ?? 'Paper pattern',
    ends: Math.min(draft.ends, 32),
    picks: Math.min(draft.picks, 32),
    paper: localPaper(),
  }))
  const [text, setText] = useState({ ends: String(spec.ends), picks: String(spec.picks) })
  const [busy, setBusy] = useState<string | null>(null)
  const [result, setResult] = useState<(FromScan & { marksFound: boolean }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setResult(null)
  }, [open])

  const layout = useMemo(() => {
    try {
      return { layout: sheetLayout(spec) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [spec])

  const setSize = (key: 'ends' | 'picks', v: string) => {
    setText((t) => ({ ...t, [key]: v }))
    const n = Number(v)
    if (Number.isInteger(n) && n >= 2 && n <= MAX_SQUARES) setSpec((s) => ({ ...s, [key]: n }))
  }

  const makePdf = async (print: boolean) => {
    if (!layout.layout) return
    setBusy('Making the sheet…')
    try {
      track('paper', { step: print ? 'print' : 'download' })
      const blob = await sheetPdf(layout.layout)
      if (print) {
        // Opened in a tab of its own, where the browser's PDF viewer prints it.
        const url = URL.createObjectURL(blob)
        const tabOpened = window.open(url, '_blank')
        if (!tabOpened) download(fileName(spec.name), blob, 'application/pdf')
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } else download(fileName(spec.name), blob, 'application/pdf')
    } catch (e) {
      setError(`Couldn't make the sheet: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(null)
    }
  }

  const read = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setResult(null)
    setBusy('Reading the sheet…')
    try {
      const pic = await readImagePixels(file, 2400)
      // Let the "Reading" message show before the work starts.
      await new Promise((r) => setTimeout(r, 30))
      const data = pic.data instanceof Uint8ClampedArray ? pic.data : Uint8ClampedArray.from(pic.data)
      const scan = readSheet({ data, width: pic.width, height: pic.height })
      setResult({ ...draftFromScan(scan), marksFound: scan.marksFound })
      track('paper', { step: 'read' })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="md" aria-labelledby="paper-title">
      <DialogTitle onClose={onClose} id="paper-title">
        Draw on paper
      </DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }}>
        <Tab label="1. Print a sheet" />
        <Tab label="2. Read it back" />
      </Tabs>
      <DialogContent>
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }} data-testid="paper-error">
            {error}
          </Alert>
        )}
        {tab === 0 ? (
          <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 3, pt: 1 }}>
            <Stack sx={{ gap: 2, flex: '0 0 280px' }}>
              <Typography variant="body2" color="text.secondary">
                Print a grid to colour in by hand: fill the squares where the warp shows, and colour the strips with
                your warp and weft colours. Its QR code remembers the name and size.
              </Typography>
              <TextField
                size="small"
                label="Name"
                value={spec.name}
                onChange={(e) => setSpec((s) => ({ ...s, name: e.target.value }))}
                slotProps={{ htmlInput: { maxLength: 60 } }}
              />
              <Box sx={FIELD_GRID}>
                <TextField
                  size="small"
                  type="number"
                  label="Ends (across)"
                  value={text.ends}
                  onChange={(e) => setSize('ends', e.target.value)}
                  slotProps={{ htmlInput: { min: 2, max: MAX_SQUARES } }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Picks (down)"
                  value={text.picks}
                  onChange={(e) => setSize('picks', e.target.value)}
                  slotProps={{ htmlInput: { min: 2, max: MAX_SQUARES } }}
                />
              </Box>
              <TextField
                select
                size="small"
                label="Paper"
                value={spec.paper}
                onChange={(e) => setSpec((s) => ({ ...s, paper: e.target.value as PaperSize }))}
              >
                {(Object.keys(PAPERS) as PaperSize[]).map((p) => (
                  <MenuItem key={p} value={p}>
                    {PAPERS[p].name}
                  </MenuItem>
                ))}
              </TextField>
              {layout.layout && (
                <Typography variant="body2" data-testid="paper-size">
                  Squares of {layout.layout.grid.cell} mm, {layout.layout.page.landscape ? 'landscape' : 'portrait'}.
                </Typography>
              )}
              {layout.error && <Alert severity="warning">{layout.error}</Alert>}
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={<PrintIcon />}
                  disabled={!layout.layout || busy !== null}
                  onClick={() => makePdf(true)}
                >
                  Print
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  disabled={!layout.layout || busy !== null}
                  onClick={() => makePdf(false)}
                >
                  Download PDF
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Print it at 100% (actual size). When it's coloured in, go to step 2.
              </Typography>
            </Stack>
            <Box sx={{ flex: 1, minWidth: 0 }}>{layout.layout && <SheetPreview layout={layout.layout} />}</Box>
          </Stack>
        ) : (
          <Stack sx={{ gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Scan the coloured-in sheet, or photograph it flat and in good light with the whole page in the picture.
              The QR code says what the sheet is; your pattern opens as a new one, in the colours you used.
            </Typography>
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                disableElevation
                startIcon={<FileUploadIcon />}
                disabled={busy !== null}
                onClick={() => fileInput.current?.click()}
              >
                Choose a scan or photo
              </Button>
              <Button
                variant="outlined"
                startIcon={<CameraAltIcon />}
                disabled={busy !== null}
                onClick={() => cameraInput.current?.click()}
              >
                Take a photo
              </Button>
            </Stack>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              aria-label="Scan or photo of the sheet"
              onChange={(e) => {
                read(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              aria-label="Photo of the sheet"
              onChange={(e) => {
                read(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            {busy && (
              <Typography role="status" variant="body2">
                {busy}
              </Typography>
            )}
            {result && (
              <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }} data-testid="paper-result">
                <PatternThumb draft={result.draft} size={120} />
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography sx={{ fontWeight: 700 }}>{result.name}</Typography>
                  <Typography variant="body2" data-testid="paper-summary">
                    {result.draft.ends} ends × {result.draft.picks} picks: {result.warp} warp and {result.weft} weft
                    squares, woven on {result.draft.shafts} shafts and {result.draft.treadles} treadles.
                  </Typography>
                  <Stack direction="row" sx={{ gap: 0.5, mt: 1 }} aria-label="Colours found">
                    {result.colours.map((c) => (
                      <Box
                        key={c}
                        title={c}
                        sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: c, border: '1px solid #888' }}
                      />
                    ))}
                  </Stack>
                  {!result.marksFound && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      The corner squares weren't all found, so the sheet was lined up by its QR code alone: check the
                      pattern, and try a flatter picture if it's out.
                    </Typography>
                  )}
                </Box>
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {tab === 1 && (
          <Button
            variant="contained"
            disableElevation
            startIcon={<OpenInNewIcon />}
            disabled={!result}
            onClick={() =>
              result &&
              onOpen(
                result.draft,
                result.name,
                `Opened "${result.name}" from the paper: ${result.draft.shafts} shafts, ${result.draft.treadles} treadles`,
              )
            }
          >
            Open as a new pattern
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
