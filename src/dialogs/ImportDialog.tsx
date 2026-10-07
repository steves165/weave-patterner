import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { importFile, type Draft } from '../weave'

interface Props {
  open: boolean
  onClose: () => void
  onImport: (name: string, draft: Draft) => void
}

export function ImportDialog({ open, onClose, onImport }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) setError(null)
  }, [open])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const { name, draft } = importFile(await file.text())
      onImport(name ?? file.name.replace(/(\.weave)?\.json$/i, ''), draft)
    } catch (e) {
      setError(`${file.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Import pattern</DialogTitle>
      <DialogContent>
        <Box
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files[0])
          }}
          sx={{
            border: 2,
            borderStyle: 'dashed',
            borderColor: dragging ? 'primary.main' : 'divider',
            bgcolor: dragging ? 'action.hover' : 'transparent',
            borderRadius: 2,
            p: 5,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
        >
          <UploadFileIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          <Typography>Drop a pattern file here, or click to choose one</Typography>
          <Typography variant="body2" color="text.secondary">
            .json files exported from Weave Patterner
          </Typography>
        </Box>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
