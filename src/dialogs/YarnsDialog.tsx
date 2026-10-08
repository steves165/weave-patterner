import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { usePhone } from '../layout'
import { TEXTURES, type Texture } from '../textures'
import type { Draft } from '../weave'
import { newYarnId, type Yarn } from '../yarns'

interface Props {
  open: boolean
  draft: Draft
  yarns: Yarn[]
  onChange: (yarns: Yarn[]) => void
  onClose: () => void
}

/**
 * Named yarns with colour, grist and price. A yarn applies to every warp end and weft pick of its colour, and the
 * warp calculator uses its grist and price for weights and costs.
 */
export function YarnsDialog({ open, draft, yarns, onChange, onClose }: Props) {
  const phone = usePhone()
  const set = (id: string, patch: Partial<Yarn>) => onChange(yarns.map((y) => (y.id === id ? { ...y, ...patch } : y)))
  const optionalNumber = (v: string) => (v.trim() === '' ? undefined : Number(v))
  const used = [...new Set([...draft.warpColors, ...draft.weftColors])]
  const unmatched = used.filter((c) => !yarns.some((y) => y.color.toLowerCase() === c.toLowerCase()))

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="md">
      <DialogTitle>Yarn library</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            A yarn matches threads of its colour. Grist is metres per kg (or yards per lb if you use imperial in the
            calculator); price is per kg (or lb). Grist and texture also shape the threads in the 3D preview.
          </Typography>
          {yarns.length === 0 && <Typography color="text.secondary">No yarns yet.</Typography>}
          <Stack sx={{ gap: 1.5 }} role="list" aria-label="Yarns">
            {yarns.map((y, i) => (
              <Stack key={y.id} direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }} role="listitem">
                <input
                  type="color"
                  className="picker"
                  aria-label={`Yarn ${i + 1} colour`}
                  value={y.color}
                  onChange={(e) => set(y.id, { color: e.target.value })}
                />
                <TextField
                  size="small"
                  label={`Yarn ${i + 1} name`}
                  value={y.name}
                  onChange={(e) => set(y.id, { name: e.target.value })}
                  sx={{ flex: 1, minWidth: 160 }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Grist"
                  value={y.grist ?? ''}
                  onChange={(e) => set(y.id, { grist: optionalNumber(e.target.value) })}
                  sx={{ width: 110 }}
                />
                <TextField
                  select
                  size="small"
                  label="Texture"
                  value={y.texture ?? 'smooth'}
                  onChange={(e) => set(y.id, { texture: e.target.value as Texture })}
                  sx={{ width: 160 }}
                >
                  {(Object.keys(TEXTURES) as Texture[]).map((t) => (
                    <MenuItem key={t} value={t}>
                      {TEXTURES[t].name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  type="number"
                  label="Price"
                  value={y.price ?? ''}
                  onChange={(e) => set(y.id, { price: optionalNumber(e.target.value) })}
                  sx={{ width: 100 }}
                />
                <IconButton
                  aria-label={`Delete ${y.name || `yarn ${i + 1}`}`}
                  onClick={() => onChange(yarns.filter((x) => x.id !== y.id))}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            ))}
          </Stack>
          <Button
            startIcon={<AddIcon />}
            sx={{ alignSelf: 'flex-start' }}
            onClick={() =>
              onChange([
                ...yarns,
                { id: newYarnId(), name: `Yarn ${yarns.length + 1}`, color: unmatched[0] ?? '#808080' },
              ])
            }
          >
            Add yarn
          </Button>
          {unmatched.length > 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Colours in this draft without a yarn (click to add one):
              </Typography>
              <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                {unmatched.map((c) => (
                  <Button
                    key={c}
                    size="small"
                    variant="outlined"
                    aria-label={`Add a yarn for ${c}`}
                    sx={{ textTransform: 'none' }}
                    startIcon={<Box sx={{ width: 14, height: 14, bgcolor: c, border: 1, borderColor: 'divider' }} />}
                    onClick={() =>
                      onChange([...yarns, { id: newYarnId(), name: `Yarn ${yarns.length + 1}`, color: c }])
                    }
                  >
                    {c}
                  </Button>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  )
}
