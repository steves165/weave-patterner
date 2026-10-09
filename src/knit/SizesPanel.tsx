import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { MONO_FONT } from '../theme'
import { castOn, type KnitChart } from './chart'
import { type Size, sizePlans, spreadEvenly } from './shaping'

const NAMES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL']

/** The pieces' outlines, one inside another, each labelled with its size and measurements. */
function Schematic({ plans }: { plans: ReturnType<typeof sizePlans> }) {
  const maxW = Math.max(...plans.map((p) => p.actualWidth))
  const maxL = Math.max(...plans.map((p) => p.length))
  const scale = Math.min(240 / maxW, 180 / maxL)
  const legendX = maxW * scale + 34
  const [W, H] = [legendX + 170, Math.max(maxL * scale + 20, plans.length * 18 + 10)]
  const shade = (i: number) => 0.3 + (0.7 * i) / Math.max(1, plans.length - 1)
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ maxWidth: W, display: 'block' }}
      role="img"
      aria-label={`Outline of the piece in ${plans.length} sizes`}
    >
      {plans.map((p, i) => {
        const [w, l] = [p.actualWidth * scale, p.length * scale]
        return (
          <rect
            key={p.name}
            x={10}
            y={H - 10 - l}
            width={w}
            height={l}
            fill="none"
            stroke="var(--wp-accent)"
            strokeOpacity={shade(i)}
            strokeWidth={2}
            rx={4}
          />
        )
      })}
      {plans.map((p, i) => (
        <g key={p.name} transform={`translate(${legendX}, ${14 + i * 18})`}>
          <rect
            x={0}
            y={-8}
            width={14}
            height={10}
            rx={2}
            fill="none"
            stroke="var(--wp-accent)"
            strokeOpacity={shade(i)}
            strokeWidth={2}
          />
          <text x={22} y={1} fontSize={12} fill="currentColor">
            {p.name}: {p.actualWidth.toFixed(0)} × {p.length} cm
          </text>
        </g>
      ))}
    </svg>
  )
}

/**
 * Sizes and shaping: the sizes the pattern is made in, each with its cast-on (whole repeats nearest its width), the
 * width that gives, its rows and its yarn, drawn as outlines; and a calculator that spreads increases or decreases
 * evenly across a row.
 */
export function SizesPanel({ chart, onChange }: { chart: KnitChart; onChange: (next: KnitChart) => void }) {
  const sizes = chart.sizes ?? []
  const plans = sizePlans(chart, sizes)
  const setSizes = (next: Size[]) => onChange({ ...chart, sizes: next.length ? next : undefined })
  const edit = (i: number, patch: Partial<Size>) => setSizes(sizes.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const num = (text: string) => {
    const n = Number(text)
    return Number.isFinite(n) && n > 0 ? Math.min(1000, n) : null
  }

  const [spread, setSpread] = useState({ stitches: '', change: '6', inc: false })
  const on = Number(spread.stitches || castOn(chart))
  const result = spreadEvenly(on, (spread.inc ? 1 : -1) * Number(spread.change))

  return (
    <Stack sx={{ gap: 2 }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Box
          component="table"
          sx={{
            borderCollapse: 'collapse',
            fontSize: 14,
            '& th': { textAlign: 'left', fontWeight: 600, color: 'text.secondary', pr: 1.5, pb: 0.5 },
            '& td': { pr: 1.5, py: 0.5 },
          }}
        >
          <thead>
            <tr>
              <th>Size</th>
              <th>Width (cm)</th>
              <th>Length (cm)</th>
              <th>Cast on</th>
              <th>Gives</th>
              <th>Rows</th>
              <th>Yarn</th>
              <th>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: sizes are edited in place; a new count remounts the fields
              <tr key={`${i}-${sizes.length}`} data-size={p.name}>
                <td>
                  <TextField
                    size="small"
                    value={p.name}
                    onChange={(e) => edit(i, { name: e.target.value.slice(0, 20) })}
                    slotProps={{ htmlInput: { 'aria-label': `Size ${i + 1} name` } }}
                    sx={{ width: 80 }}
                  />
                </td>
                <td>
                  <TextField
                    size="small"
                    type="number"
                    defaultValue={p.width}
                    onChange={(e) => {
                      const n = num(e.target.value)
                      if (n) edit(i, { width: n })
                    }}
                    slotProps={{ htmlInput: { 'aria-label': `${p.name} width` } }}
                    sx={{ width: 90 }}
                  />
                </td>
                <td>
                  <TextField
                    size="small"
                    type="number"
                    defaultValue={p.length}
                    onChange={(e) => {
                      const n = num(e.target.value)
                      if (n) edit(i, { length: n })
                    }}
                    slotProps={{ htmlInput: { 'aria-label': `${p.name} length` } }}
                    sx={{ width: 90 }}
                  />
                </td>
                <td style={{ fontFamily: MONO_FONT }} data-testid="size-cast-on">
                  {p.castOn}
                </td>
                <td>{p.actualWidth.toFixed(1)} cm</td>
                <td style={{ fontFamily: MONO_FONT }}>{p.rows}</td>
                <td style={{ fontFamily: MONO_FONT }}>{Math.ceil(p.metres)} m</td>
                <td>
                  <Tooltip title={`Remove size ${p.name}`} describeChild>
                    <IconButton
                      size="small"
                      aria-label={`Remove size ${p.name}`}
                      onClick={() => setSizes(sizes.filter((_, j) => j !== i))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<AddIcon />}
          disabled={sizes.length >= NAMES.length}
          onClick={() => {
            const last = sizes[sizes.length - 1]
            const name = NAMES.find((n) => !sizes.some((s) => s.name === n)) ?? `Size ${sizes.length + 1}`
            setSizes([...sizes, { name, width: last ? last.width + 5 : 45, length: last ? last.length + 2 : 55 }])
          }}
        >
          Add a size
        </Button>
        {sizes.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Add the sizes you'll make, with each one's finished width and length.
          </Typography>
        )}
      </Stack>
      {plans.length > 0 && <Schematic plans={plans} />}

      <Box>
        <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
          Spread increases or decreases evenly
        </Typography>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
          <TextField
            size="small"
            type="number"
            label="Stitches on the needle"
            value={spread.stitches}
            placeholder={String(castOn(chart))}
            onChange={(e) => setSpread((s) => ({ ...s, stitches: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={spread.inc ? 'inc' : 'dec'}
            onChange={(_, v) => v && setSpread((s) => ({ ...s, inc: v === 'inc' }))}
            aria-label="Increase or decrease"
          >
            <ToggleButton value="dec">Decrease</ToggleButton>
            <ToggleButton value="inc">Increase</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            size="small"
            type="number"
            label="By"
            value={spread.change}
            onChange={(e) => setSpread((s) => ({ ...s, change: e.target.value }))}
            sx={{ width: 90 }}
          />
        </Stack>
        {'error' in result ? (
          <Alert severity="info">{result.error}</Alert>
        ) : (
          <Typography data-testid="spread-evenly" sx={{ fontWeight: 600 }}>
            {result.text}.{' '}
            <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
              ({result.after} sts)
            </Box>
          </Typography>
        )}
      </Box>
    </Stack>
  )
}
