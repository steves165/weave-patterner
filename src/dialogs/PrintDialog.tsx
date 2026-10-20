import PrintIcon from '@mui/icons-material/Print'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { DialogTitle } from '../components/DialogTitle'
import { qrPath } from '../qr'

/** What goes on the printed sheet besides the draft. */
export interface PrintOptions {
  /** A picture of the woven cloth at the top of the page. */
  cloth: boolean
  /** A second page of written threading, tie-up and treadling. */
  instructions: boolean
  /** A QR code that opens the pattern in the app. */
  qr: boolean
}

const KEY = 'wp-print'
const DEFAULTS: PrintOptions = { cloth: true, instructions: false, qr: true }

/** The options last printed with (also used by the browser's own Print, Ctrl+P). */
export function printOptions(): PrintOptions {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<PrintOptions>
    return {
      cloth: typeof saved.cloth === 'boolean' ? saved.cloth : DEFAULTS.cloth,
      instructions: typeof saved.instructions === 'boolean' ? saved.instructions : DEFAULTS.instructions,
      qr: typeof saved.qr === 'boolean' ? saved.qr : DEFAULTS.qr,
    }
  } catch {
    return DEFAULTS
  }
}

function savePrintOptions(o: PrintOptions) {
  try {
    localStorage.setItem(KEY, JSON.stringify(o))
  } catch {
    // Not remembered; prints all the same.
  }
}

interface Props {
  open: boolean
  /** The link that opens this pattern, for the QR code (null while it's being made). */
  link: string | null
  onClose: () => void
  onPrint: (options: PrintOptions) => void
}

/** Print: the draft on a page in the app's style, with a QR code and written instructions if wanted. */
export function PrintDialog({ open, link, onClose, onPrint }: Props) {
  const [options, setOptions] = useState(printOptions)
  useEffect(() => {
    if (open) setOptions(printOptions())
  }, [open])
  // A pattern too big for a QR code can't have one (a link still shares it).
  const fits = link === null || qrPath(link) !== null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="print-title">
      <DialogTitle onClose={onClose} id="print-title">
        Print
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          The pattern’s name, its colours and the full draft, on one page.
        </Typography>
        <Stack sx={{ gap: 1 }}>
          <FormControlLabel
            control={
              <Checkbox checked={options.cloth} onChange={(e) => setOptions({ ...options, cloth: e.target.checked })} />
            }
            label={
              <span>
                Picture of the cloth
                <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                  The woven cloth, repeated, at the top of the page
                </Typography>
              </span>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={options.qr && fits}
                disabled={!fits}
                onChange={(e) => setOptions({ ...options, qr: e.target.checked })}
              />
            }
            label={
              <span>
                QR code
                <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                  {fits
                    ? 'Scan it with a phone’s camera to open this pattern in Weave Patterner'
                    : 'This pattern is too big for a QR code: share it as a link instead'}
                </Typography>
              </span>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={options.instructions}
                onChange={(e) => setOptions({ ...options, instructions: e.target.checked })}
              />
            }
            label={
              <span>
                Written instructions
                <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                  Threading, tie-up and treadling as lists, on a second page
                </Typography>
              </span>
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disableElevation
          startIcon={<PrintIcon />}
          onClick={() => {
            const chosen = { ...options, qr: options.qr && fits }
            savePrintOptions(options)
            onPrint(chosen)
          }}
        >
          Print
        </Button>
      </DialogActions>
    </Dialog>
  )
}
