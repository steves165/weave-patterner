import {
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { fromUnits, toUnits, type Units } from './measurements'
import type { Option, Options } from './pattern'

/**
 * A number field that lets you type freely and only takes the value once it's a number in range (on each keystroke
 * when it is, and on leaving the field it goes back to the last good value).
 */
export function NumberField({
  label,
  value,
  min,
  max,
  step = 0.5,
  onChange,
  title,
  testId,
  width,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  title?: string
  testId?: string
  width?: number | string
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText((t) => (Number(t) === value ? t : String(value)))
  }, [value])
  const field = (
    <TextField
      size="small"
      type="number"
      label={label}
      value={text}
      sx={width ? { width } : undefined}
      onChange={(e) => {
        setText(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n)
      }}
      onBlur={() => setText(String(value))}
      slotProps={{ htmlInput: { min, max, step, 'data-testid': testId } }}
    />
  )
  return title ? (
    <Tooltip title={title} placement="top" describeChild>
      {field}
    </Tooltip>
  ) : (
    field
  )
}

/** One of a design's options as a control: segmented buttons, a list, a number or a switch. */
export function OptionField({
  option: o,
  options,
  units,
  onChange,
}: {
  option: Option
  options: Options
  units: Units
  onChange: (value: string | number | boolean) => void
}) {
  const v = options[o.id]
  if (o.type === 'bool')
    return (
      <FormControlLabel
        control={<Switch checked={Boolean(v)} onChange={(e) => onChange(e.target.checked)} />}
        label={
          <>
            {o.label}
            {o.help && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {o.help}
              </Typography>
            )}
          </>
        }
      />
    )
  if (o.type === 'number') {
    const cm = o.unit === 'cm'
    return (
      <NumberField
        label={`${o.label}${cm ? ` (${units === 'cm' ? 'cm' : 'in'})` : o.unit === '%' ? ' (%)' : ''}`}
        value={cm ? toUnits(Number(v), units) : Number(v)}
        min={cm ? toUnits(o.min, units) : o.min}
        max={cm ? toUnits(o.max, units) : o.max}
        step={cm && units === 'in' ? 0.125 : o.step}
        title={o.help}
        onChange={(n) => onChange(cm ? Math.round(fromUnits(n, units) * 100) / 100 : n)}
      />
    )
  }
  if (o.choices.length <= 3)
    return (
      <div>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }} id={`opt-${o.id}`}>
          {o.label}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={v}
          onChange={(_, x) => x !== null && onChange(x)}
          aria-labelledby={`opt-${o.id}`}
          sx={{ display: 'grid', gridTemplateColumns: `repeat(${o.choices.length}, minmax(0, 1fr))` }}
        >
          {o.choices.map((c) => (
            <ToggleButton key={c.value} value={c.value}>
              {c.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>
    )
  return (
    <TextField select size="small" label={o.label} value={v} onChange={(e) => onChange(e.target.value)} fullWidth>
      {o.choices.map((c) => (
        <MenuItem key={c.value} value={c.value}>
          {c.label}
        </MenuItem>
      ))}
    </TextField>
  )
}
