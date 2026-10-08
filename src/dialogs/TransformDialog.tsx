import FlipIcon from '@mui/icons-material/Flip'
import InvertColorsIcon from '@mui/icons-material/InvertColors'
import RotateRightIcon from '@mui/icons-material/RotateRight'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { type ReactNode, useEffect, useState } from 'react'
import { usePhone } from '../layout'
import { flipDraft, invertDraft, shiftDraft, turnDraft } from '../transforms'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

function Action(props: { icon: ReactNode; label: string; detail: string; onClick: () => void }) {
  return (
    <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
      <Button variant="outlined" startIcon={props.icon} onClick={props.onClick} sx={{ minWidth: 190 }}>
        {props.label}
      </Button>
      <Typography variant="body2" color="text.secondary">
        {props.detail}
      </Typography>
    </Stack>
  )
}

const count = (n: number, noun: string) => `${Math.abs(n)} ${noun}${Math.abs(n) === 1 ? '' : 's'}`

/** "Moved the pattern 2 ends right and 1 pick up", leaving out a direction that didn't move. */
export const moveMessage = (right: number, down: number) => {
  const parts = [
    right !== 0 && `${count(right, 'end')} ${right > 0 ? 'right' : 'left'}`,
    down !== 0 && `${count(down, 'pick')} ${down > 0 ? 'down' : 'up'}`,
  ].filter(Boolean)
  return parts.length ? `Moved the pattern ${parts.join(' and ')}` : 'The pattern was not moved'
}

/** Whole-draft changes: turn through 90°, swap face and back, mirror, and move the repeat. */
export function TransformDialog({ open, draft, onClose, onApply }: Props) {
  const phone = usePhone()
  const [right, setRight] = useState('0')
  const [down, setDown] = useState('0')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) setError(null)
  }, [open])

  const run = (fn: () => Draft, message: string) => {
    try {
      onApply(fn(), message)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  const shiftOk = Number.isInteger(Number(right)) && Number.isInteger(Number(down))

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle>Transform draft</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <Action
            icon={<RotateRightIcon />}
            label="Turn 90°"
            detail="Swap warp and weft: the ends become picks and the picks become ends."
            onClick={() => run(() => turnDraft(draft), 'Turned the draft 90°')}
          />
          <Action
            icon={<InvertColorsIcon />}
            label="Swap face and back"
            detail="Everything that showed warp now shows weft, and the other way round."
            onClick={() => run(() => invertDraft(draft), 'Swapped the face and back weaves')}
          />
          <Action
            icon={<FlipIcon />}
            label="Flip left–right"
            detail="Reverse the threading and warp colours."
            onClick={() => run(() => flipDraft(draft, 'horizontal'), 'Flipped the draft left to right')}
          />
          <Action
            icon={<SwapVertIcon />}
            label="Flip top–bottom"
            detail="Reverse the treadling and weft colours."
            onClick={() => run(() => flipDraft(draft, 'vertical'), 'Flipped the draft top to bottom')}
          />
          <Divider />
          <Typography variant="subtitle2">Move the repeat</Typography>
          <Typography variant="body2" color="text.secondary">
            Shift the pattern round so it starts somewhere else. Threads moved off one edge come back on the other; use
            negative numbers to go left or up.
          </Typography>
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              type="number"
              label="Right by (ends)"
              value={right}
              onChange={(e) => setRight(e.target.value)}
              sx={{ width: 150 }}
            />
            <TextField
              size="small"
              type="number"
              label="Down by (picks)"
              value={down}
              onChange={(e) => setDown(e.target.value)}
              sx={{ width: 150 }}
            />
            <Button
              variant="contained"
              disabled={!shiftOk}
              onClick={() =>
                run(() => shiftDraft(draft, Number(right), Number(down)), moveMessage(Number(right), Number(down)))
              }
            >
              Move
            </Button>
          </Stack>
          {error && <Alert severity="warning">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
