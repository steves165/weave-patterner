import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ContentCutIcon from '@mui/icons-material/ContentCut'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import CropFreeIcon from '@mui/icons-material/CropFree'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import FlipIcon from '@mui/icons-material/Flip'
import RepeatIcon from '@mui/icons-material/Repeat'
import { Box, Button, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { KnitChart } from './chart'
import {
  type Clip,
  clear,
  copy,
  deleteColumns,
  deleteRows,
  flipAcross,
  flipUp,
  insertColumns,
  insertRows,
  paste,
  type Rect,
  rectSize,
  repeatAcross,
  repeatUp,
  setRepeat,
} from './edit'

interface Props {
  chart: KnitChart
  selection: Rect
  clip: Clip | null
  /** Applies a change to the chart (one undo step), with a note for the toast, and where the selection moves to. */
  onChange: (next: KnitChart, message: string, selection?: Rect | null) => void
  onClip: (clip: Clip) => void
  onDone: () => void
}

function Tool(props: { label: string; icon?: ReactNode; onClick: () => void; disabled?: boolean; hint?: string }) {
  const button = (
    <Button
      size="small"
      color="inherit"
      startIcon={props.icon}
      onClick={props.onClick}
      disabled={props.disabled}
      sx={{ height: 34, px: 1.25 }}
    >
      {props.label}
    </Button>
  )
  return props.hint ? (
    <Tooltip title={props.hint} describeChild>
      <span>{button}</span>
    </Tooltip>
  ) : (
    button
  )
}

const Group = ({ children }: { children: ReactNode }) => (
  <Stack direction="row" sx={{ flexWrap: 'wrap', alignItems: 'center', gap: '2px' }}>
    {children}
  </Stack>
)

/**
 * What can be done with the selected squares: copy, cut and paste; clear; flip; repeat across the width or up the
 * chart; make them the pattern repeat; and add or take out rows and stitches around them. Keyboard: Ctrl+C, X and
 * V, Delete and Escape.
 */
export function SelectionBar({ chart, selection: s, clip, onChange, onClip, onDone }: Props) {
  const { stitches, rows } = rectSize(s)
  const isRepeat = chart.repeat?.from === s.c0 && chart.repeat?.to === s.c1
  return (
    <Box
      role="toolbar"
      aria-label="Selected squares"
      className="wp-enter"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: '16px',
        bgcolor: 'var(--wp-seg)',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, px: 0.5 }} data-testid="selection-size">
        {stitches} {stitches === 1 ? 'stitch' : 'stitches'} × {rows} {rows === 1 ? 'row' : 'rows'}
      </Typography>
      <Divider orientation="vertical" flexItem />
      <Group>
        <Tool label="Copy" icon={<ContentCopyIcon />} onClick={() => onClip(copy(chart, s))} />
        <Tool
          label="Cut"
          icon={<ContentCutIcon />}
          onClick={() => {
            onClip(copy(chart, s))
            onChange(clear(chart, s), 'Cut')
          }}
        />
        <Tool
          label="Paste"
          icon={<ContentPasteIcon />}
          disabled={!clip}
          hint="Paste with its bottom-left square at the selection's bottom-left"
          onClick={() => {
            if (!clip) return
            const pasted = {
              r0: s.r0,
              r1: Math.min(s.r0 + clip.stitch.length, chart.stitch.length) - 1,
              c0: s.c0,
              c1: Math.min(s.c0 + clip.stitch[0].length, chart.stitch[0].length) - 1,
            }
            onChange(paste(chart, clip, s.r0, s.c0), 'Pasted', pasted)
          }}
        />
        <Tool label="Clear" icon={<DeleteSweepIcon />} onClick={() => onChange(clear(chart, s), 'Cleared')} />
      </Group>
      <Divider orientation="vertical" flexItem />
      <Group>
        <Tool
          label="Flip across"
          icon={<FlipIcon />}
          hint="Mirror left to right: decreases and cables lean the other way"
          onClick={() => onChange(flipAcross(chart, s), 'Flipped left to right')}
        />
        <Tool
          label="Flip up"
          icon={<FlipIcon sx={{ transform: 'rotate(90deg)' }} />}
          hint="Turn upside down: the top row becomes the bottom"
          onClick={() => onChange(flipUp(chart, s), 'Flipped top to bottom')}
        />
        <Tool
          label="Repeat across"
          icon={<RepeatIcon />}
          hint="Repeat these squares across the whole width of their rows"
          onClick={() => onChange(repeatAcross(chart, s), 'Repeated across the rows')}
        />
        <Tool
          label="Repeat up"
          icon={<RepeatIcon sx={{ transform: 'rotate(90deg)' }} />}
          hint="Repeat these squares up and down the whole chart"
          onClick={() => onChange(repeatUp(chart, s), 'Repeated up the chart')}
        />
        <Tool
          label={isRepeat ? 'Remove repeat box' : 'Make the repeat'}
          icon={<CropFreeIcon />}
          hint="Outline these stitches as the pattern repeat; the written pattern repeats them (*…; rep from *)"
          onClick={() =>
            isRepeat
              ? onChange({ ...chart, repeat: undefined }, 'Repeat box removed')
              : onChange(
                  setRepeat(chart, s.c0, s.c1),
                  `Stitches ${chart.stitch[0].length - s.c1}–${chart.stitch[0].length - s.c0} are the repeat`,
                )
          }
        />
      </Group>
      <Divider orientation="vertical" flexItem />
      <Group>
        <Tool
          label="Row above"
          hint="Add a row of knit above the selection"
          onClick={() => onChange(insertRows(chart, s.r1 + 1, 1), 'Added a row')}
        />
        <Tool
          label="Row below"
          hint="Add a row of knit below the selection"
          onClick={() => onChange(insertRows(chart, s.r0, 1), 'Added a row', { ...s, r0: s.r0 + 1, r1: s.r1 + 1 })}
        />
        <Tool
          label={rows === 1 ? 'Delete row' : 'Delete rows'}
          disabled={rows >= chart.stitch.length}
          onClick={() =>
            onChange(deleteRows(chart, s.r0, s.r1), `Deleted ${rows === 1 ? 'a row' : `${rows} rows`}`, null)
          }
        />
        <Tool
          label="Stitch left"
          hint="Add a column of knit stitches to the left of the selection"
          onClick={() =>
            onChange(insertColumns(chart, s.c0, 1), 'Added a stitch', { ...s, c0: s.c0 + 1, c1: s.c1 + 1 })
          }
        />
        <Tool
          label="Stitch right"
          hint="Add a column of knit stitches to the right of the selection"
          onClick={() => onChange(insertColumns(chart, s.c1 + 1, 1), 'Added a stitch')}
        />
        <Tool
          label={stitches === 1 ? 'Delete stitch' : 'Delete stitches'}
          disabled={stitches >= chart.stitch[0].length}
          onClick={() =>
            onChange(
              deleteColumns(chart, s.c0, s.c1),
              `Deleted ${stitches === 1 ? 'a stitch' : `${stitches} stitches`}`,
              null,
            )
          }
        />
      </Group>
      <Box sx={{ flex: '1 1 0px' }} />
      <Tooltip title="Done (Escape)">
        <IconButton size="small" aria-label="Clear the selection" onClick={onDone}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
