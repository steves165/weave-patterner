import { Box, Stack, TextField, Typography } from '@mui/material'
import type { Profile } from '../blocks'
import { parseSequence } from '../tools'
import { Grid } from './Grid'

/** A block profile as typed: counts, the profile tie-up, and the threading and treadling as sequence text. */
export interface ProfileInput {
  blocks: number
  blockTreadles: number
  tieup: boolean[][]
  threading: string
  treadling: string
}

export const resizeGrid = (g: boolean[][], rows: number, cols: number) =>
  Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => g[r]?.[c] ?? r === c))

export const defaultProfileInput = (): ProfileInput => ({
  blocks: 2,
  blockTreadles: 2,
  tieup: resizeGrid([], 2, 2),
  threading: '1 1 2 2 2 1 1',
  treadling: '1 1 2 2 2 1 1',
})

/** The profile, or throws a readable error for bad sequence text. */
export const toProfile = (p: ProfileInput): Profile => ({
  threading: parseSequence(p.threading),
  treadling: parseSequence(p.treadling),
  tieup: p.tieup,
})

interface Props {
  value: ProfileInput
  onChange: (value: ProfileInput) => void
  maxBlocks: number
  /** What a filled profile tie-up square means, e.g. "pattern" or "layer A on top". */
  filledMeans: string
}

/** Edits a block profile: block counts, the profile tie-up, and the profile threading and treadling. */
export function ProfileEditor({ value, onChange, maxBlocks, filledMeans }: Props) {
  const { blocks, blockTreadles, tieup } = value
  const setCount = (kind: 'blocks' | 'blockTreadles', text: string) => {
    const n = Math.max(1, Math.min(maxBlocks, Math.round(Number(text)) || 1))
    const next = { ...value, [kind]: n }
    onChange({ ...next, tieup: resizeGrid(tieup, next.blocks, next.blockTreadles) })
  }

  return (
    <Stack sx={{ gap: 2 }}>
      <Stack direction="row" sx={{ gap: 2 }}>
        <TextField
          size="small"
          type="number"
          label="Blocks"
          value={blocks}
          onChange={(e) => setCount('blocks', e.target.value)}
          slotProps={{ htmlInput: { min: 1, max: maxBlocks } }}
          sx={{ width: 110 }}
        />
        <TextField
          size="small"
          type="number"
          label="Block treadles"
          value={blockTreadles}
          onChange={(e) => setCount('blockTreadles', e.target.value)}
          slotProps={{ htmlInput: { min: 1, max: maxBlocks } }}
          sx={{ width: 130 }}
        />
      </Stack>
      <Box>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          Profile tie-up (rows: blocks, columns: block treadles; filled = {filledMeans})
        </Typography>
        <Box style={{ ['--cell' as string]: '22px' }}>
          <Grid
            rows={blocks}
            cols={blockTreadles}
            isOn={(b, t) => tieup[b][t]}
            onPaint={(b, t, v) =>
              onChange({
                ...value,
                tieup: tieup.map((row, i) => (i === b ? row.map((x, j) => (j === t ? v : x)) : row)),
              })
            }
            label="Profile tie-up"
            cellLabel={(b, t) => `Block ${b + 1}, block treadle ${t + 1}`}
          />
        </Box>
      </Box>
      <TextField
        size="small"
        label="Profile threading (block per unit)"
        value={value.threading}
        onChange={(e) => onChange({ ...value, threading: e.target.value })}
        helperText="e.g. 1 1 2 2 2 1 1 or 1-2 2-1"
      />
      <TextField
        size="small"
        label="Profile treadling (block treadle per unit)"
        value={value.treadling}
        onChange={(e) => onChange({ ...value, treadling: e.target.value })}
      />
    </Stack>
  )
}
