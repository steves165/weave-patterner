import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { useEffect, useState } from 'react'
import { listPatterns, MAX_PATTERNS, nextPatternName, savePattern } from '../storage'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  /** Name the current pattern was loaded or saved as, if any; offered as the default. */
  currentName: string | null
  onClose: () => void
  onSaved: (name: string) => void
}

export function SaveDialog({ open, draft, currentName, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [existing, setExisting] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    listPatterns()
      .then((ps) => {
        const names = ps.map((p) => p.name)
        setExisting(names)
        setName(currentName ?? nextPatternName(names))
      })
      .catch((e) => setError(String(e?.message ?? e)))
  }, [open, currentName])

  const trimmed = name.trim()
  const overwriting = existing.includes(trimmed)
  const full = !overwriting && existing.length >= MAX_PATTERNS

  const save = async () => {
    setSaving(true)
    try {
      await savePattern(trimmed, draft)
      onSaved(trimmed)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed && !full) save()
        }}
      >
        <DialogTitle>Save pattern</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
            helperText={`${existing.length} of ${MAX_PATTERNS} slots used`}
          />
          {overwriting && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              A pattern called "{trimmed}" already exists and will be replaced.
            </Alert>
          )}
          {full && (
            <Alert severity="error" sx={{ mt: 1 }}>
              All {MAX_PATTERNS} slots are used. Delete a pattern from the Load list or save over an existing name.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={!trimmed || full || saving}>
            {overwriting ? 'Replace' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
