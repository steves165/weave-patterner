import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/UploadFile'
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import {
  type Backup,
  backupFileName,
  countsOf,
  describeCounts,
  makeBackup,
  parseBackup,
  restoreBackup,
} from '../backup'
import { download } from '../exportDraft'
import { reloadWith } from '../move'

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Backs up every pattern saved in this browser (all three apps) with their settings to one file, and restores from
 * one: to keep them safe, or to move them to another device.
 */
export function BackupDialog({ open, onClose }: Props) {
  const [backup, setBackup] = useState<Backup | null>(null)
  const [chosen, setChosen] = useState<Backup | null>(null)
  const [settings, setSettings] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setChosen(null)
    setError(null)
    setBackup(null)
    makeBackup()
      .then(setBackup)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [open])

  const restore = async () => {
    if (!chosen) return
    setBusy(true)
    setError(null)
    try {
      reloadWith(await restoreBackup(chosen, { settings }))
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="backup-title">
      <DialogTitle id="backup-title">Back up or restore</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2 }}>
          <Typography variant="subtitle1" component="h3">
            Back up
          </Typography>
          <Typography variant="body2" color="text.secondary">
            One file with every pattern saved in this browser, in Weave, Knit and Sew Patterner, and your colours and
            settings. Keep it safe, or open it on another device (by email, a cloud drive, AirDrop or a USB stick) to
            move your patterns there. The pattern on screen isn’t included until you save it.
          </Typography>
          <Typography variant="body2" data-testid="backup-contents">
            {backup ? `This browser has ${describeCounts(countsOf(backup.patterns))}.` : 'Counting your patterns…'}
          </Typography>
          <div>
            <Button
              variant="contained"
              disableElevation
              startIcon={<DownloadIcon />}
              disabled={!backup}
              onClick={() => backup && download(backupFileName(backup), JSON.stringify(backup), 'application/json')}
            >
              Download backup
            </Button>
          </div>

          <Divider />

          <Typography variant="subtitle1" component="h3">
            Restore
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Adds the patterns in a backup file to the ones here. Nothing here is deleted: a pattern whose name is
            already used here is kept as “Name (from backup)”.
          </Typography>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            aria-label="Backup file"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              setError(null)
              setChosen(null)
              try {
                setChosen(parseBackup(await f.text()))
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err))
              }
            }}
          />
          <div>
            <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => file.current?.click()}>
              Choose a backup file…
            </Button>
          </div>
          {chosen && (
            <Alert severity="info" data-testid="backup-chosen">
              A backup from {new Date(chosen.created).toLocaleString()} with {describeCounts(countsOf(chosen.patterns))}
              .
            </Alert>
          )}
          {chosen && (
            <FormControlLabel
              control={<Checkbox checked={settings} onChange={(e) => setSettings(e.target.checked)} />}
              label="Also restore colours and settings (replacing the ones here)"
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {chosen && (
          <Button variant="contained" disableElevation disabled={busy} onClick={restore}>
            {busy ? 'Restoring…' : 'Restore'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
