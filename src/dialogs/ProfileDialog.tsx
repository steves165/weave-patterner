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
import { MAX_BLOCKS, turnedTwill, UNIT } from '../blocks'
import { BLOCK_WEAVES, type BlockWeave, blockWeave } from '../blockWeaves'
import {
  defaultProfileInput,
  ProfileEditor,
  type ProfileInput,
  resizeGrid,
  toProfile,
} from '../components/ProfileEditor'
import { usePhone } from '../layout'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

type Structure = 'turned-twill' | BlockWeave

const STRUCTURES: [Structure, string, string][] = [
  [
    'turned-twill',
    'Turned twill',
    `Each unit is ${UNIT} ends or picks; pattern blocks weave warp-faced 3/1 twill, the rest weft-faced 1/3.`,
  ],
  [
    'overshot',
    'Overshot',
    'Four blocks on four shafts, each sharing a shaft with the next. Pattern weft floats over its block, with tabby between pattern picks.',
  ],
  [
    'crackle',
    'Crackle',
    'Four blocks of small point-twill units, joined with incidentals. Woven like overshot, with tabby.',
  ],
  [
    'summer-winter',
    'Summer and winter',
    'A unit weave: two tie-down shafts plus one shaft per block, so any block can be pattern or background. Woven with tabby.',
  ],
  [
    'bronson',
    'Bronson lace',
    'One shaft per block plus two ground shafts. Lace blocks float over five ends; the rest weave plain.',
  ],
  ['ms-os', "M's and O's", 'Two blocks on four shafts. The block being woven is ribbed and the other plain; no tabby.'],
  [
    'damask',
    'Damask',
    'Turned 5-end satin, as woven on a drawloom: pattern blocks warp-faced, the ground weft-faced. Each unit (découpure) is 5 ends and 5 picks, on 5 shafts per block.',
  ],
]

const maxBlocksFor = (s: Structure) => (s === 'turned-twill' ? MAX_BLOCKS : BLOCK_WEAVES[s].maxBlocks)
const fixedTieup = (s: Structure) => s !== 'turned-twill' && !BLOCK_WEAVES[s].freeTieup

/** Shrinks the profile to fit a structure's block limit, and for block weaves gives each block its own treadle. */
function fitProfile(p: ProfileInput, s: Structure): ProfileInput {
  const max = maxBlocksFor(s)
  const blocks = Math.min(p.blocks, max)
  const blockTreadles = fixedTieup(s) ? blocks : Math.min(p.blockTreadles, max)
  return { ...p, blocks, blockTreadles, tieup: resizeGrid(p.tieup, blocks, blockTreadles) }
}

/** Profile drafting: design with blocks, then substitute a block structure. */
export function ProfileDialog({ open, draft, onClose, onApply }: Props) {
  const phone = usePhone()
  const [structure, setStructure] = useState<Structure>('turned-twill')
  const [profile, setProfile] = useState(defaultProfileInput)
  const [colors, setColors] = useState({ warp: '#f5f0e6', pattern: '#1a237e', tabby: '#f5f0e6' })
  const spec = structure === 'turned-twill' ? null : BLOCK_WEAVES[structure]

  const result = useMemo(() => {
    try {
      const p = toProfile(profile)
      return {
        draft:
          structure === 'turned-twill'
            ? turnedTwill(p, draft.warpColors, draft.weftColors)
            : blockWeave(structure, p, colors),
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [structure, profile, colors, draft.warpColors, draft.weftColors])

  const name = STRUCTURES.find(([s]) => s === structure)?.[1] ?? ''
  const colorFields = spec
    ? ([
        ['warp', 'Warp'],
        ['pattern', spec.tabby ? 'Pattern weft' : 'Weft'],
        ...(spec.tabby ? [['tabby', 'Tabby weft'] as const] : []),
      ] as const)
    : []

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle>Block profile</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Plan the design in blocks, then choose the structure that weaves them.
          </Typography>
          <TextField
            select
            size="small"
            label="Structure"
            value={structure}
            onChange={(e) => {
              const s = e.target.value as Structure
              setStructure(s)
              setProfile(fitProfile(profile, s))
            }}
            helperText={STRUCTURES.find(([s]) => s === structure)?.[2]}
          >
            {STRUCTURES.map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          {colorFields.length > 0 && (
            <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
              {colorFields.map(([key, label]) => (
                <Stack key={key} direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                  <input
                    type="color"
                    className="picker"
                    aria-label={label}
                    value={colors[key]}
                    onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                  />
                  <Typography variant="body2">{label}</Typography>
                </Stack>
              ))}
            </Stack>
          )}
          <ProfileEditor
            value={profile}
            onChange={setProfile}
            maxBlocks={maxBlocksFor(structure)}
            filledMeans={structure === 'turned-twill' ? 'warp-faced' : 'pattern'}
            fixedNote={
              fixedTieup(structure)
                ? `In ${name.toLowerCase()} each block treadle weaves its own block as pattern, so block treadle 1 weaves block 1, and so on.`
                : undefined
            }
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
            onApply(result.draft, `${name} draft from a ${profile.blocks}-block profile (replaces the draft)`)
          }
        >
          Create draft
        </Button>
      </DialogActions>
    </Dialog>
  )
}
