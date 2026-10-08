import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { usePhone } from '../layout'
import type { KnitChart } from './chart'
import { parseWritten } from './parse'

interface Props {
  open: boolean
  onClose: () => void
  onImport: (chart: KnitChart, rows: number) => void
}

const EXAMPLE = `Cast on 24 stitches.
Row 1 (RS): *k2, p2; rep from * to end.
Row 2 (WS): *k2, p2; rep from * to end.
Row 3: k1, *yo, k2tog; rep from * to last st, k1.
Row 4: purl.`

/** Paste a written pattern (cast-on and rows) and get its chart. */
export function ImportWrittenDialog({ open, onClose, onImport }: Props) {
  const phone = usePhone()
  const [text, setText] = useState('')
  useEffect(() => {
    if (open) setText('')
  }, [open])
  const result = useMemo(() => (text.trim() ? parseWritten(text) : null), [text])
  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} maxWidth="sm" fullWidth>
      <DialogTitle>Import a written pattern</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Paste the cast-on and the rows, one per line, such as "Row 1 (RS): *k2, p2; rep from * to end." Rounds ("Rnd
          1: …") make a chart in the round, and colour letters (k2 B) give the colours.
        </Typography>
        <TextField
          multiline
          minRows={8}
          maxRows={18}
          fullWidth
          label="Written pattern"
          placeholder={EXAMPLE}
          value={text}
          onChange={(e) => setText(e.target.value)}
          slotProps={{
            htmlInput: { spellCheck: false, style: { fontFamily: 'ui-monospace, monospace', fontSize: 13 } },
          }}
        />
        {result && (
          <Alert
            severity={result.errors.length ? (result.chart ? 'warning' : 'error') : 'success'}
            sx={{ mt: 2 }}
            data-testid="import-result"
          >
            {result.chart
              ? `${result.rows} ${result.chart.mode === 'round' ? 'rounds' : 'rows'}, ${result.chart.stitch[0].length} stitches wide.`
              : 'No chart yet.'}
            {result.errors.map((e) => (
              <div key={`${e.row}-${e.message}`}>{e.message}</div>
            ))}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!result?.chart}
          onClick={() => result?.chart && onImport(result.chart, result.rows)}
        >
          {result?.errors.length && result.chart ? 'Make the chart anyway' : 'Make the chart'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
