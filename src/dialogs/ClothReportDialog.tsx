import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import { usePhone } from '../layout'
import { clothStats } from '../stats'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  onClose: () => void
}

const pct = (n: number) => `${Math.round(n * 100)}%`
const one = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })

const FIRMNESS: Record<string, string> = {
  'very firm': 'Very firm: the threads cross at almost every chance, like plain weave. Stable, but stiffer.',
  firm: 'Firm: plenty of interlacing. A good everyday cloth.',
  balanced: 'Balanced: about as interlaced as a 2/2 twill. Drapes well and holds together.',
  soft: 'Soft: longer floats. Drapey, but may need a closer sett to stay stable.',
  loose: 'Loose: long floats and few crossings. Check the floats will hold, or sett closer.',
}

/** How the structure behaves: warp and weft faces, how much the threads interlace, and float lengths. */
export function ClothReportDialog({ open, draft, onClose }: Props) {
  const phone = usePhone()
  const s = useMemo(() => (open ? clothStats(draft) : null), [open, draft])
  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="xs">
      <DialogTitle>Cloth report</DialogTitle>
      <DialogContent>
        {s && (
          <Stack sx={{ gap: 2 }}>
            <Typography data-testid="firmness">{FIRMNESS[s.firmness]}</Typography>
            <Stack sx={{ gap: 0.5 }}>
              <Typography variant="body2">
                Warp on the face: {pct(s.warpFace)} · weft: {pct(1 - s.warpFace)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={s.warpFace * 100}
                aria-label="Share of the face that is warp"
                sx={{ height: 10, borderRadius: 1 }}
              />
            </Stack>
            <Table size="small" aria-label="Cloth statistics">
              <TableBody>
                <TableRow>
                  <TableCell component="th">Interlacing</TableCell>
                  <TableCell data-testid="interlacing">
                    {pct(s.interlacing)} of crossings swap over (plain weave 100%)
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th">Average float</TableCell>
                  <TableCell data-testid="average-float">
                    warp {one(s.averageFloat.warp)}, weft {one(s.averageFloat.weft)} threads
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th">Longest float</TableCell>
                  <TableCell>
                    warp {s.longestFloat.warp}, weft {s.longestFloat.weft} threads
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
