import CompressIcon from '@mui/icons-material/Compress'
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
import { skeletonTieup } from '../skeleton'
import { flipDraft, insertTabby, invertDraft, removeTabby, shiftDraft, tabbyBreaks, turnDraft } from '../transforms'
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
  const [tabbyColor, setTabbyColor] = useState('#f5f0e6')
  const breaks = open ? tabbyBreaks(draft) : []
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
          <Typography variant="subtitle2" component="h3">
            Move the repeat
          </Typography>
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
          <Action
            icon={<CompressIcon />}
            label="Save treadles"
            detail="A skeleton tie-up: fewer treadles, pressing two at once for some picks (rising-shed looms)."
            onClick={() => {
              const result = skeletonTieup(draft)
              if (!result) setError("This draft can't use fewer treadles by pressing two at once")
              else
                onApply(
                  result.draft,
                  `Now ${result.draft.treadles} treadles; ${result.pressedTogether} pick${result.pressedTogether === 1 ? '' : 's'} press two at once`,
                )
            }}
          />
          <Divider />
          <Typography variant="subtitle2" component="h3">
            Tabby
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Put a plain-weave pick (odd shafts, then even shafts) after every pattern pick, as overshot and summer and
            winter are woven, or take tabby picks out.
          </Typography>
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              <input
                type="color"
                className="picker"
                aria-label="Tabby weft colour"
                value={tabbyColor}
                onChange={(e) => setTabbyColor(e.target.value)}
              />
              <Typography variant="body2">Tabby weft</Typography>
            </Stack>
            <Button
              variant="outlined"
              onClick={() => run(() => insertTabby(draft, tabbyColor), 'Put tabby between the pattern picks')}
            >
              Insert tabby
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                try {
                  const { draft: next, removed } = removeTabby(draft)
                  if (removed === 0) setError('There are no tabby picks to take out')
                  else onApply(next, `Took out ${removed} tabby pick${removed === 1 ? '' : 's'}`)
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e))
                }
              }}
            >
              Remove tabby
            </Button>
          </Stack>
          {breaks.length > 0 && (
            <Typography variant="body2" color="warning.main" data-testid="tabby-breaks">
              Tabby won't be plain weave at end{breaks.length > 1 ? 's' : ''} {breaks.slice(0, 8).join(', ')}
              {breaks.length > 8 ? ` and ${breaks.length - 8} more` : ''}: neighbouring ends are both on odd or both on
              even shafts.
            </Typography>
          )}
          {error && <Alert severity="warning">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
