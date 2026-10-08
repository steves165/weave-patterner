import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { turnedTwill, UNIT } from '../blocks'
import { Grid } from '../components/Grid'
import { usePhone } from '../layout'
import { parseSequence } from '../tools'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

const resizeGrid = (g: boolean[][], rows: number, cols: number) =>
  Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => g[r]?.[c] ?? r === c))

/**
 * Profile drafting: design with blocks, then substitute turned twill (3/1 pattern against 1/3 background,
 * 4 shafts and 4 treadles per block).
 */
export function ProfileDialog({ open, draft, onClose, onApply }: Props) {
  const phone = usePhone()
  const [blocks, setBlocks] = useState(2)
  const [blockTreadles, setBlockTreadles] = useState(2)
  const [tieup, setTieup] = useState(() => resizeGrid([], 2, 2))
  const [threading, setThreading] = useState('1 1 2 2 2 1 1')
  const [treadling, setTreadling] = useState('1 1 2 2 2 1 1')

  const result = useMemo(() => {
    try {
      const d = turnedTwill(
        { threading: parseSequence(threading), treadling: parseSequence(treadling), tieup },
        draft.warpColors,
        draft.weftColors,
      )
      return { draft: d }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [threading, treadling, tieup, draft.warpColors, draft.weftColors])

  const setCount = (kind: 'blocks' | 'treadles', value: string) => {
    const n = Math.max(1, Math.min(4, Math.round(Number(value)) || 1))
    const [b, t] = kind === 'blocks' ? [n, blockTreadles] : [blocks, n]
    if (kind === 'blocks') setBlocks(n)
    else setBlockTreadles(n)
    setTieup(resizeGrid(tieup, b, t))
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle>Block profile: turned twill</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Plan the design in blocks. Each profile unit becomes {UNIT} ends or picks; a block weaves warp-faced 3/1
            twill where the profile tie-up is filled and weft-faced 1/3 twill elsewhere.
          </Typography>
          <Stack direction="row" sx={{ gap: 2 }}>
            <TextField
              size="small"
              type="number"
              label="Blocks"
              value={blocks}
              onChange={(e) => setCount('blocks', e.target.value)}
              slotProps={{ htmlInput: { min: 1, max: 4 } }}
              sx={{ width: 110 }}
            />
            <TextField
              size="small"
              type="number"
              label="Block treadles"
              value={blockTreadles}
              onChange={(e) => setCount('treadles', e.target.value)}
              slotProps={{ htmlInput: { min: 1, max: 4 } }}
              sx={{ width: 130 }}
            />
          </Stack>
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Profile tie-up (rows: blocks, columns: block treadles)
            </Typography>
            <Box style={{ ['--cell' as string]: '22px' }}>
              <Grid
                rows={blocks}
                cols={blockTreadles}
                isOn={(b, t) => tieup[b][t]}
                onPaint={(b, t, v) =>
                  setTieup(tieup.map((row, i) => (i === b ? row.map((x, j) => (j === t ? v : x)) : row)))
                }
                label="Profile tie-up"
                cellLabel={(b, t) => `Block ${b + 1}, block treadle ${t + 1}`}
              />
            </Box>
          </Box>
          <TextField
            size="small"
            label="Profile threading (block per unit)"
            value={threading}
            onChange={(e) => setThreading(e.target.value)}
            helperText="e.g. 1 1 2 2 2 1 1 or 1-2 2-1"
          />
          <TextField
            size="small"
            label="Profile treadling (block treadle per unit)"
            value={treadling}
            onChange={(e) => setTreadling(e.target.value)}
          />
          {result.draft && (
            <Typography data-testid="profile-result">
              Makes {result.draft.shafts} shafts, {result.draft.treadles} treadles, {result.draft.ends} ends ×{' '}
              {result.draft.picks} picks
            </Typography>
          )}
          {result.error && <Alert severity="warning">{result.error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!result.draft}
          onClick={() =>
            result.draft &&
            onApply(result.draft, `Turned-twill draft from a ${blocks}-block profile (replaces the draft)`)
          }
        >
          Create draft
        </Button>
      </DialogActions>
    </Dialog>
  )
}
