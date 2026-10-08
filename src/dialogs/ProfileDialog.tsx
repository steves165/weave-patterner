import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { MAX_BLOCKS, turnedTwill, UNIT } from '../blocks'
import { defaultProfileInput, ProfileEditor, toProfile } from '../components/ProfileEditor'
import { usePhone } from '../layout'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

/**
 * Profile drafting: design with blocks, then substitute turned twill (3/1 pattern against 1/3 background,
 * 4 shafts and 4 treadles per block).
 */
export function ProfileDialog({ open, draft, onClose, onApply }: Props) {
  const phone = usePhone()
  const [profile, setProfile] = useState(defaultProfileInput)

  const result = useMemo(() => {
    try {
      return { draft: turnedTwill(toProfile(profile), draft.warpColors, draft.weftColors) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [profile, draft.warpColors, draft.weftColors])

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle>Block profile: turned twill</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Plan the design in blocks. Each profile unit becomes {UNIT} ends or picks; a block weaves warp-faced 3/1
            twill where the profile tie-up is filled and weft-faced 1/3 twill elsewhere.
          </Typography>
          <ProfileEditor value={profile} onChange={setProfile} maxBlocks={MAX_BLOCKS} filledMeans="warp-faced" />
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
            onApply(result.draft, `Turned-twill draft from a ${profile.blocks}-block profile (replaces the draft)`)
          }
        >
          Create draft
        </Button>
      </DialogActions>
    </Dialog>
  )
}
