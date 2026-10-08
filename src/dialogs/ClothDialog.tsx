import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { draftFromCloth } from '../analysis'
import { Grid } from '../components/Grid'
import { usePhone } from '../layout'
import { computeDrawdown, type Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

/**
 * Fabric analysis: draw the cloth (dark = warp on top) and get the smallest threading, tie-up and treadling that
 * weaves it. Starts from the current drawdown.
 */
export function ClothDialog({ open, draft, onClose, onApply }: Props) {
  const phone = usePhone()
  const [cloth, setCloth] = useState<boolean[][]>([])

  useEffect(() => {
    if (open) setCloth(computeDrawdown(draft))
  }, [open, draft])

  const result = useMemo(() => {
    if (cloth.length === 0) return null
    try {
      return { draft: draftFromCloth(cloth, draft) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [cloth, draft])

  const paint = (p: number, e: number, value: boolean) =>
    setCloth((c) => c.map((row, i) => (i === p ? row.map((v, j) => (j === e ? value : v)) : row)))

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="lg">
      <DialogTitle>Design by drawing the cloth</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Dark squares show warp on top, light squares weft. Draw the cloth you want and this works out a threading,
            tie-up and treadling that weave it, using as few shafts and treadles as possible.
          </Typography>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={() => setCloth(cloth.map((r) => r.map((v) => !v)))}>
              Invert
            </Button>
            <Button size="small" variant="outlined" onClick={() => setCloth(cloth.map((r) => r.map(() => false)))}>
              Clear
            </Button>
            <Button size="small" variant="outlined" onClick={() => setCloth(computeDrawdown(draft))}>
              Start again from the draft
            </Button>
          </Stack>
          <Box sx={{ overflow: 'auto', maxHeight: '55vh' }} style={{ ['--cell' as string]: '14px' }}>
            {cloth.length > 0 && (
              <Grid
                rows={cloth.length}
                cols={cloth[0].length}
                isOn={(p, e) => cloth[p][e]}
                onPaint={(p, e, v) => paint(p, e, v)}
                label="Cloth"
                cellLabel={(p, e) => `Pick ${p + 1}, end ${e + 1}`}
                touchPaint
              />
            )}
          </Box>
          {result?.draft && (
            <Typography data-testid="cloth-needs">
              Needs {result.draft.shafts} shafts and {result.draft.treadles} treadles
            </Typography>
          )}
          {result?.error && <Alert severity="warning">{result.error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!result?.draft}
          onClick={() =>
            result?.draft &&
            onApply(
              result.draft,
              `Draft worked out from the cloth: ${result.draft.shafts} shafts, ${result.draft.treadles} treadles`,
            )
          }
        >
          Create draft
        </Button>
      </DialogActions>
    </Dialog>
  )
}
