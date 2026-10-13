import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import ColorizeIcon from '@mui/icons-material/Colorize'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import StarIcon from '@mui/icons-material/StarBorder'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined'
import { Box, Button, IconButton, Popover, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { type CSSProperties, useRef, useState } from 'react'
import { BASIC_COLOURS, colourActions, useColourStore } from '../colourStore'

interface Props {
  /** The input's accessible name, as "Warp 3". */
  label: string
  value: string
  onChange: (colour: string) => void
  className?: string
  style?: CSSProperties
  /** Extra attributes for the input (data-* for tests and tours). */
  inputProps?: Record<string, string>
}

/**
 * A colour box. Clicking it (or Enter or Space) opens a picker of basic colours, favourites and saved palettes, with
 * the browser's own picker for any other colour. It stays a real colour input, so it can be typed into or filled.
 */
export function ColourInput({ label, value, onChange, className = 'picker', style, inputProps }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <>
      <input
        ref={ref}
        type="color"
        className={className}
        style={style}
        aria-label={label}
        aria-haspopup="dialog"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          // The picker below, rather than the browser's straight away.
          e.preventDefault()
          setAnchor(e.currentTarget)
        }}
        {...inputProps}
      />
      {anchor && (
        <Popover
          open
          anchorEl={anchor}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{
            paper: { role: 'dialog', 'aria-label': `Colours for ${label}`, sx: { p: 2, width: 300, maxWidth: '92vw' } },
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: -1, mr: -1 }}>
            <Typography variant="subtitle2">Colours for {label}</Typography>
            <IconButton size="small" aria-label="Close colours" onClick={() => setAnchor(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Palettes
            value={value}
            onPick={(c) => {
              onChange(c)
              setAnchor(null)
            }}
            onMore={() => {
              setAnchor(null)
              // The browser's own picker, for any colour.
              setTimeout(() => {
                const input = ref.current
                if (!input) return
                try {
                  input.showPicker()
                } catch {
                  input.focus()
                }
              })
            }}
          />
        </Popover>
      )}
    </>
  )
}

function Swatch({
  colour,
  label,
  selected,
  onPick,
}: {
  colour: string
  label: string
  selected: boolean
  onPick: () => void
}) {
  return (
    <Tooltip title={label}>
      <Box
        component="button"
        type="button"
        aria-label={label}
        aria-pressed={selected}
        onClick={onPick}
        sx={{
          width: 26,
          height: 26,
          p: 0,
          borderRadius: '50%',
          bgcolor: colour,
          cursor: 'pointer',
          border: '1px solid rgba(0,0,0,0.25)',
          outline: selected ? '2px solid var(--wp-accent)' : 'none',
          outlineOffset: 2,
          '&:focus-visible': { outline: '2px solid var(--wp-accent)' },
        }}
      />
    </Tooltip>
  )
}

/** The picker's contents: the colour now, basic colours, favourites and palettes. */
function Palettes({ value, onPick, onMore }: { value: string; onPick: (c: string) => void; onMore: () => void }) {
  const store = useColourStore()
  const [hex, setHex] = useState(value)
  const [editing, setEditing] = useState(false)
  const [naming, setNaming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cur = value.toLowerCase()
  const row = (colours: string[], name: (c: string) => string, remove?: (c: string) => void) => (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
      {colours.map((c) =>
        editing && remove ? (
          <Tooltip key={c} title={`Remove ${c}`}>
            <IconButton
              size="small"
              aria-label={`Remove ${name(c)}`}
              onClick={() => remove(c)}
              sx={{
                width: 26,
                height: 26,
                bgcolor: c,
                border: '1px solid rgba(0,0,0,0.25)',
                '&:hover': { bgcolor: c },
              }}
            >
              <CloseIcon sx={{ fontSize: 14, color: '#fff', filter: 'drop-shadow(0 0 1px #000)' }} />
            </IconButton>
          </Tooltip>
        ) : (
          <Swatch key={c} colour={c} label={name(c)} selected={c === cur} onPick={() => onPick(c)} />
        ),
      )}
    </Stack>
  )
  const visible = store.palettes.filter((p) => !p.hidden)
  const hidden = store.palettes.filter((p) => p.hidden)
  return (
    <Stack sx={{ gap: 1.5 }}>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 1,
            bgcolor: cur,
            border: '1px solid rgba(0,0,0,0.25)',
            flex: 'none',
          }}
        />
        <TextField
          size="small"
          label="Hex"
          value={hex}
          onChange={(e) => {
            setHex(e.target.value)
            const v = e.target.value.trim()
            const full = v.startsWith('#') ? v : `#${v}`
            if (/^#[0-9a-f]{6}$/i.test(full)) onPick(full.toLowerCase())
          }}
          sx={{ width: 110 }}
        />
        <Button size="small" startIcon={<ColorizeIcon />} onClick={onMore} sx={{ whiteSpace: 'nowrap', flex: 'none' }}>
          More colours…
        </Button>
      </Stack>

      <Typography variant="subtitle2" component="h3">
        Basic colours
      </Typography>
      {row(BASIC_COLOURS, (c) => `Basic colour ${c}`)}

      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2" component="h3" sx={{ flex: 1 }}>
          Favourites
        </Typography>
        {(store.favourites.length > 0 || store.palettes.length > 0) && (
          <Button size="small" onClick={() => setEditing(!editing)} aria-pressed={editing}>
            {editing ? 'Done' : 'Edit'}
          </Button>
        )}
      </Stack>
      {store.favourites.length > 0 ? (
        row(store.favourites, (c) => `Favourite ${c}`, colourActions.removeFavourite)
      ) : (
        <Typography variant="body2" color="text.secondary">
          None yet: save colours you use often.
        </Typography>
      )}
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        <Button
          size="small"
          startIcon={<StarIcon />}
          disabled={store.favourites.includes(cur)}
          onClick={() => colourActions.addFavourite(cur)}
        >
          Save {cur} as a favourite
        </Button>
        {store.favourites.length > 0 && naming === null && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => setNaming('')}>
            Save favourites as a palette
          </Button>
        )}
      </Stack>
      {naming !== null && (
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            autoFocus
            label="Palette name"
            value={naming}
            onChange={(e) => setNaming(e.target.value)}
            sx={{ flex: 1 }}
          />
          <Button
            size="small"
            variant="contained"
            disableElevation
            disabled={!naming.trim()}
            onClick={() => {
              try {
                colourActions.savePalette(naming, store.favourites)
                setNaming(null)
                setError(null)
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
              }
            }}
          >
            Save
          </Button>
        </Stack>
      )}
      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}

      {visible.map((p) => (
        <Stack key={p.name} sx={{ gap: 0.75 }} data-palette={p.name}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle2" component="h3" sx={{ flex: 1 }}>
              {p.name}
            </Typography>
            {editing && (
              <Tooltip title={`Add ${cur} to ${p.name}`}>
                <IconButton
                  size="small"
                  aria-label={`Add ${cur} to ${p.name}`}
                  onClick={() => colourActions.addToPalette(p.name, cur)}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={`Hide ${p.name}`}>
              <IconButton
                size="small"
                aria-label={`Hide ${p.name}`}
                onClick={() => colourActions.setPaletteHidden(p.name, true)}
              >
                <VisibilityOffIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {editing && (
              <Tooltip title={`Delete ${p.name}`}>
                <IconButton
                  size="small"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => colourActions.removePalette(p.name)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          {row(
            p.colours,
            (c) => `${p.name} ${c}`,
            (c) => colourActions.removeFromPalette(p.name, c),
          )}
        </Stack>
      ))}
      {hidden.length > 0 && (
        <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Hidden:
          </Typography>
          {hidden.map((p) => (
            <Button
              key={p.name}
              size="small"
              startIcon={<VisibilityIcon />}
              aria-label={`Show ${p.name}`}
              onClick={() => colourActions.setPaletteHidden(p.name, false)}
            >
              {p.name}
            </Button>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
