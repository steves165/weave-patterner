import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { PatternThumb } from '../PatternThumb'
import { deletePattern, listPatterns, MAX_PATTERNS, renamePattern, type SavedPattern } from '../storage'

interface Props {
  open: boolean
  onClose: () => void
  onLoad: (pattern: SavedPattern) => void
  /** Called when a pattern is renamed or deleted, so the app can keep its current name in sync. */
  onRenamed: (from: string, to: string | null) => void
}

export function LoadDialog({ open, onClose, onLoad, onRenamed }: Props) {
  const [patterns, setPatterns] = useState<SavedPattern[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ from: string; to: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const refresh = useCallback(
    () =>
      listPatterns()
        .then(setPatterns)
        .catch((e) => setError(String(e?.message ?? e))),
    [],
  )

  useEffect(() => {
    if (!open) return
    setError(null)
    setEditing(null)
    setConfirmDelete(null)
    refresh()
  }, [open, refresh])

  const run = async (fn: () => Promise<void>) => {
    setError(null)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const commitRename = () =>
    run(async () => {
      if (!editing) return
      const to = editing.to.trim()
      if (to && to !== editing.from) {
        await renamePattern(editing.from, to)
        onRenamed(editing.from, to)
      }
      setEditing(null)
    })

  const remove = (name: string) =>
    run(async () => {
      await deletePattern(name)
      onRenamed(name, null)
      setConfirmDelete(null)
    })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Load pattern
        <Typography variant="body2" color="text.secondary">
          {patterns ? `${patterns.length} of ${MAX_PATTERNS} saved` : 'Loading…'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        {patterns?.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            No saved patterns yet. Use Save to store the current pattern.
          </Typography>
        )}
        <List disablePadding>
          {patterns?.map((p) =>
            editing?.from === p.name ? (
              <ListItem key={p.name} sx={{ gap: 2 }}>
                <PatternThumb draft={p.draft} />
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  label="Name"
                  value={editing.to}
                  onChange={(e) => setEditing({ ...editing, to: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      setEditing(null)
                    }
                  }}
                />
                <Tooltip title="Save name">
                  <IconButton onClick={commitRename} disabled={!editing.to.trim()}>
                    <CheckIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel">
                  <IconButton onClick={() => setEditing(null)}>
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </ListItem>
            ) : (
              <ListItem
                key={p.name}
                disablePadding
                secondaryAction={
                  confirmDelete === p.name ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" color="error" variant="contained" onClick={() => remove(p.name)}>
                        Delete
                      </Button>
                      <Button size="small" onClick={() => setConfirmDelete(null)}>
                        Keep
                      </Button>
                    </Box>
                  ) : (
                    <>
                      <Tooltip title="Rename">
                        <IconButton onClick={() => setEditing({ from: p.name, to: p.name })}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton edge="end" onClick={() => setConfirmDelete(p.name)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )
                }
              >
                <ListItemButton onClick={() => onLoad(p)} sx={{ gap: 2, pr: 16 }}>
                  <PatternThumb draft={p.draft} />
                  <ListItemText
                    primary={p.name}
                    secondary={`${p.draft.shafts} shafts · ${p.draft.treadles} treadles · ${p.draft.ends}×${
                      p.draft.picks
                    } · ${new Date(p.updatedAt).toLocaleString()}`}
                  />
                </ListItemButton>
              </ListItem>
            ),
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
