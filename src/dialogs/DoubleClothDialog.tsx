import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { defaultProfileInput, ProfileEditor, toProfile } from '../components/ProfileEditor'
import { doubleCloth, type LayerWeave, type Structure, shaftsPerLayer } from '../doublecloth'
import { usePhone } from '../layout'
import { type Draft, MAX_SHAFTS } from '../weave'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

const STRUCTURES: [Structure, string, string][] = [
  ['separate', 'Two separate layers', 'Two cloths woven at once, one above the other'],
  ['tubular', 'Tube', 'One shuttle goes round both layers, joining them at both edges'],
  ['double-width', 'Double width', 'Joined at one edge only, so it opens out to twice the width'],
  ['stitched', 'Stitched layers', 'Held together at intervals where a top end dips under a bottom pick'],
  ['blocks', 'Block double cloth', 'The layers swap places to make a two-colour pattern, reversed on the back'],
]

const COLOR_FIELDS = [
  ['warpA', 'Layer A warp'],
  ['weftA', 'Layer A weft'],
  ['warpB', 'Layer B warp'],
  ['weftB', 'Layer B weft'],
] as const

/** Generates double-cloth drafts: separate layers, tubes, double width, or block (pick-up style) double cloth. */
export function DoubleClothDialog({ open, onClose, onApply }: Props) {
  const phone = usePhone()
  const [structure, setStructure] = useState<Structure>('blocks')
  const [weave, setWeave] = useState<LayerWeave>('plain')
  const [repeats, setRepeats] = useState('8')
  const [stitchEvery, setStitchEvery] = useState('2')
  const [colors, setColors] = useState({ warpA: '#1a237e', weftA: '#1a237e', warpB: '#fafafa', weftB: '#fafafa' })
  const [profile, setProfile] = useState(defaultProfileInput)
  const oneShuttle = structure === 'tubular' || structure === 'double-width'

  const result = useMemo(() => {
    try {
      return {
        draft: doubleCloth({
          structure,
          weave,
          repeats: Number(repeats),
          stitchEvery: Number(stitchEvery),
          ...colors,
          profile: structure === 'blocks' ? toProfile(profile) : undefined,
        }),
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [structure, weave, repeats, stitchEvery, colors, profile])

  const label = STRUCTURES.find(([s]) => s === structure)?.[1] ?? ''

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle>Double cloth</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Weaves two layers at once, each with its own warp and weft, alternating end by end and pick by pick. Each
            block uses {2 * shaftsPerLayer(weave)} shafts: half for layer A, half for layer B. Use Face and Back above
            the pattern to see each side.
          </Typography>
          <TextField
            select
            size="small"
            label="Structure"
            value={structure}
            onChange={(e) => setStructure(e.target.value as Structure)}
            helperText={STRUCTURES.find(([s]) => s === structure)?.[2]}
          >
            {STRUCTURES.map(([value, name]) => (
              <MenuItem key={value} value={value}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
            <TextField
              select
              size="small"
              label="Each layer weaves"
              value={weave}
              onChange={(e) => setWeave(e.target.value as LayerWeave)}
              sx={{ width: 190 }}
            >
              <MenuItem value="plain">Plain weave</MenuItem>
              <MenuItem value="twill">2/2 twill</MenuItem>
            </TextField>
            {structure !== 'blocks' && (
              <TextField
                size="small"
                type="number"
                label="Repeats"
                value={repeats}
                onChange={(e) => setRepeats(e.target.value)}
                slotProps={{ htmlInput: { min: 1 } }}
                sx={{ width: 110 }}
              />
            )}
            {structure === 'stitched' && (
              <TextField
                size="small"
                type="number"
                label="Stitch every (repeats)"
                value={stitchEvery}
                onChange={(e) => setStitchEvery(e.target.value)}
                slotProps={{ htmlInput: { min: 1 } }}
                sx={{ width: 170 }}
              />
            )}
          </Stack>
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
            {COLOR_FIELDS.filter(([key]) => !(oneShuttle && key === 'weftB')).map(([key, name]) => (
              <Stack key={key} direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                <input
                  type="color"
                  className="picker"
                  aria-label={oneShuttle && key === 'weftA' ? 'Weft (one shuttle)' : name}
                  value={colors[key]}
                  onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                />
                <Typography variant="body2">{oneShuttle && key === 'weftA' ? 'Weft (one shuttle)' : name}</Typography>
              </Stack>
            ))}
          </Stack>
          {structure === 'blocks' && (
            <ProfileEditor
              value={profile}
              onChange={setProfile}
              maxBlocks={Math.floor(MAX_SHAFTS / (2 * shaftsPerLayer(weave)))}
              filledMeans="layer A on top"
            />
          )}
          {result.draft && (
            <Typography data-testid="doublecloth-result">
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
            result.draft && onApply(result.draft, `Double cloth: ${label.toLowerCase()} (replaces the draft)`)
          }
        >
          Create draft
        </Button>
      </DialogActions>
    </Dialog>
  )
}
