import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import {
  addBlock,
  blockContents,
  blockLetter,
  blockTitle,
  insertBlock,
  moveBlock,
  nextBlockName,
  putSavedBlock,
  removeBlock,
  renameBlock,
  replaceBlock,
  type SavedBlock,
  shaftsUsed,
} from '../endBlocks'
import { usePhone } from '../layout'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  /** Block to start at (opened from its label above the threading). */
  focus: number | null
  store: SavedBlock[]
  onStore: (store: SavedBlock[]) => void
  /** Applies a change to the pattern as one undo step; `key` merges typing into one step. */
  onChange: (next: (d: Draft) => Draft, key?: string) => void
  onMessage: (message: string) => void
  onClose: () => void
}

/** A saved block's threading, drawn small: one column per end, shaft 1 at the bottom. */
function ThreadingThumb({ block }: { block: SavedBlock }) {
  const shafts = shaftsUsed(block)
  const n = block.threading.length
  const size = Math.max(2, Math.min(8, Math.floor(160 / n)))
  return (
    <svg width={n * size} height={shafts * size + 4} aria-hidden="true" style={{ flex: 'none' }}>
      {block.threading.map((s, e) =>
        s < 0 ? null : (
          // biome-ignore lint/suspicious/noArrayIndexKey: ends are positions
          <rect key={e} x={e * size} y={(shafts - 1 - s) * size} width={size} height={size} fill="currentColor" />
        ),
      )}
      {block.warpColors.map((c, e) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: ends are positions
        <rect key={`c${e}`} x={e * size} y={shafts * size + 1} width={size} height={3} fill={c} />
      ))}
    </svg>
  )
}

/** A number field for an end, counted from 1, that applies when it loses focus or Enter is pressed. */
function EndField({
  label,
  value,
  ends,
  onCommit,
}: {
  label: string
  value: number
  ends: number
  onCommit: (end: number) => void
}) {
  const [text, setText] = useState(String(value + 1))
  useEffect(() => setText(String(value + 1)), [value])
  const commit = () => {
    const n = Math.round(Number(text))
    if (Number.isFinite(n) && n >= 1 && n <= ends && n - 1 !== value) onCommit(n - 1)
    else setText(String(value + 1))
  }
  return (
    <TextField
      size="small"
      type="number"
      label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      slotProps={{ htmlInput: { min: 1, max: ends } }}
      sx={{ width: 84 }}
    />
  )
}

/**
 * The pattern's blocks of ends (A, B, … from end 1), each with a name shown above its columns, and the block store:
 * blocks saved to use again, in this pattern or any other. A saved block can be put in at any point, or swapped in
 * for one of the pattern's blocks.
 */
export function BlocksDialog({ open, draft, focus, store, onStore, onChange, onMessage, onClose }: Props) {
  const phone = usePhone()
  const blocks = draft.blocks ?? []
  const [error, setError] = useState<string | null>(null)
  const after = blocks.length ? blocks[blocks.length - 1].to + 1 : 0
  const [add, setAdd] = useState({ from: '', to: '', name: '' })
  // Where saved blocks go in: 'start', 'end', or after block i.
  const [place, setPlace] = useState('end')
  const focused = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setAdd({ from: '', to: '', name: '' })
    if (focus !== null) setTimeout(() => focused.current?.focus(), 50)
  }, [open, focus])
  // Keep the chosen place valid as blocks come and go.
  useEffect(() => {
    if (place.startsWith('after:') && Number(place.slice(6)) >= blocks.length) setPlace('end')
  }, [place, blocks.length])

  const tryIt = (fn: () => void) => {
    setError(null)
    try {
      fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const save = (i: number) =>
    tryIt(() => {
      const name = blocks[i].name.trim() || nextBlockName(store.map((s) => s.name))
      const updating = store.some((s) => s.name === name)
      onStore(putSavedBlock(store, blockContents(draft, i, name)))
      if (name !== blocks[i].name) onChange((d) => renameBlock(d, i, name))
      onMessage(`${updating ? 'Updated' : 'Saved'} "${name}" in the block store`)
    })

  const insertAt = () =>
    place === 'start' ? 0 : place === 'end' ? draft.ends : (blocks[Number(place.slice(6))]?.to ?? draft.ends - 1) + 1

  const addFrom = Number(add.from || after + 1) - 1
  const addTo = Number(add.to || Math.min(draft.ends, after + 4)) - 1
  const canAdd =
    Number.isInteger(addFrom) && Number.isInteger(addTo) && addFrom >= 0 && addTo < draft.ends && addFrom <= addTo

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} maxWidth="md" fullWidth>
      <DialogTitle>Blocks</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Split the threading into blocks of ends, lettered A, B, C … from end 1, and name each one: the names show
          above the threading. Drag along the strip above the threading to mark a block. Save any block to the block
          store to use it again, here or in another pattern.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
          Blocks in this pattern
        </Typography>
        {blocks.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            No blocks yet.
          </Typography>
        )}
        <Stack sx={{ gap: 1.5, mb: 2 }} data-testid="pattern-blocks">
          {blocks.map((b, i) => (
            <Stack
              key={`${b.from}-${b.to}`}
              direction="row"
              sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
              data-block={blockLetter(i)}
            >
              <Typography sx={{ fontWeight: 700, width: 28 }} aria-label={`Block ${blockTitle(blocks, i)}`}>
                {blockLetter(i)}
              </Typography>
              <EndField
                label="From end"
                value={b.from}
                ends={draft.ends}
                onCommit={(e) => onChange((d) => moveBlock(d, i, e, Math.max(e, b.to)))}
              />
              <EndField
                label="To end"
                value={b.to}
                ends={draft.ends}
                onCommit={(e) => onChange((d) => moveBlock(d, i, Math.min(e, b.from), e))}
              />
              <TextField
                size="small"
                label={`Name of block ${blockLetter(i)}`}
                value={b.name}
                inputRef={i === focus ? focused : undefined}
                onChange={(e) => onChange((d) => renameBlock(d, i, e.target.value), `block-name:${i}`)}
                slotProps={{ htmlInput: { maxLength: 80 } }}
                sx={{ flex: 1, minWidth: 160 }}
              />
              <Tooltip
                describeChild
                title="Save this block's threading and warp colours to the block store, under its name"
              >
                <Button size="small" startIcon={<SaveIcon />} onClick={() => save(i)}>
                  {store.some((s) => s.name === b.name) ? 'Update in store' : 'Save to store'}
                </Button>
              </Tooltip>
              {store.length > 0 && (
                <TextField
                  select
                  size="small"
                  label="Swap in"
                  value=""
                  onChange={(e) => {
                    const saved = store.find((s) => s.name === e.target.value)
                    if (saved)
                      tryIt(() => {
                        const next = replaceBlock(draft, i, saved)
                        onChange(() => next)
                        onMessage(`Block ${blockLetter(i)} is now "${saved.name}"`)
                      })
                  }}
                  sx={{ width: 130 }}
                >
                  {store.map((s) => (
                    <MenuItem key={s.name} value={s.name}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <Tooltip describeChild title="Remove the block's label (its ends stay)">
                <IconButton
                  aria-label={`Remove block ${blockLetter(i)}`}
                  onClick={() => onChange((d) => removeBlock(d, i))}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
          <TextField
            size="small"
            type="number"
            label="From end"
            value={add.from}
            placeholder={String(after + 1)}
            onChange={(e) => setAdd({ ...add, from: e.target.value })}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1, max: draft.ends } }}
            sx={{ width: 84 }}
          />
          <TextField
            size="small"
            type="number"
            label="To end"
            value={add.to}
            placeholder={String(Math.min(draft.ends, after + 4))}
            onChange={(e) => setAdd({ ...add, to: e.target.value })}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1, max: draft.ends } }}
            sx={{ width: 84 }}
          />
          <TextField
            size="small"
            label="Name"
            value={add.name}
            onChange={(e) => setAdd({ ...add, name: e.target.value })}
            slotProps={{ htmlInput: { maxLength: 80 } }}
            sx={{ flex: 1, minWidth: 160 }}
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={!canAdd}
            onClick={() => {
              onChange((d) => addBlock(d, addFrom, addTo, add.name))
              setAdd({ from: '', to: '', name: '' })
            }}
          >
            Add block
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <Typography variant="subtitle2" component="h3">
            Block store
          </Typography>
          {store.length > 0 && (
            <TextField
              select
              size="small"
              label="Put saved blocks in"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="start">At the start (before end 1)</MenuItem>
              {blocks.map((b, i) => (
                <MenuItem key={`${b.from}-${b.to}`} value={`after:${i}`}>
                  After block {blockTitle(blocks, i)}
                </MenuItem>
              ))}
              <MenuItem value="end">At the end (after end {draft.ends})</MenuItem>
            </TextField>
          )}
        </Stack>
        {store.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Nothing saved yet. Use "Save to store" on a block to keep it here.
          </Typography>
        )}
        <Stack sx={{ gap: 1 }} data-testid="block-store">
          {store.map((s) => (
            <Stack
              key={s.name}
              direction="row"
              sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}
              data-saved={s.name}
            >
              <Box sx={{ color: 'text.primary', lineHeight: 0 }}>
                <ThreadingThumb block={s} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 140 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {s.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.threading.length} ends on {shaftsUsed(s)} shafts
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                aria-label={`Put in ${s.name}`}
                onClick={() =>
                  tryIt(() => {
                    const at = insertAt()
                    const next = insertBlock(draft, s, at)
                    onChange(() => next)
                    onMessage(
                      `Put in "${s.name}" (${s.threading.length} ends) ${at === 0 ? 'at the start' : `after end ${at}`}`,
                    )
                  })
                }
              >
                Put in
              </Button>
              <Tooltip describeChild title="Delete from the block store">
                <IconButton
                  aria-label={`Delete ${s.name} from the block store`}
                  onClick={() => onStore(store.filter((x) => x.name !== s.name))}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  )
}
