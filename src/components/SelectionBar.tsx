import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import DeleteIcon from '@mui/icons-material/Delete'
import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { type SelectionAction, selectionRange, type ThreadSelection } from '../tools'

interface Props {
  selection: ThreadSelection
  canPaste: boolean
  onAction: (action: SelectionAction) => void
  onClose: () => void
}

/** What to do with the ends or picks selected on the grid, above the draft. */
export function SelectionBar({ selection, canPaste, onAction, onClose }: Props) {
  const { target, from, to } = selectionRange(selection)
  const unit = target === 'threading' ? 'end' : 'pick'
  const count = to - from + 1
  const action = (name: SelectionAction, label: string, tip: string, icon?: ReactNode, disabled = false) => (
    <Tooltip title={tip} describeChild>
      <span>
        <Button size="small" color="inherit" startIcon={icon} disabled={disabled} onClick={() => onAction(name)}>
          {label}
        </Button>
      </span>
    </Tooltip>
  )
  return (
    <Stack
      direction="row"
      role="toolbar"
      aria-label="Selection"
      data-testid="selection-bar"
      sx={{
        gap: 0.5,
        alignItems: 'center',
        flexWrap: 'wrap',
        px: 1.25,
        py: 0.25,
        borderRadius: 3,
        bgcolor: 'var(--wp-seg)',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, mr: 0.5 }}>
        {count === 1
          ? `${unit === 'end' ? 'End' : 'Pick'} ${from}`
          : `${unit === 'end' ? 'Ends' : 'Picks'} ${from}–${to}`}
      </Typography>
      {action('repeat', 'Repeat', `Add a copy of the selected ${unit}s after them`)}
      {action('mirror', 'Mirror', `Add the selected ${unit}s backwards after them, turning at the last: 1 2 3 4 3 2 1`)}
      {action('reverse', 'Reverse', `Put the selected ${unit}s in the opposite order`)}
      {action('copy', 'Copy', `Copy the selected ${unit}s (Ctrl+C)`, <ContentCopyIcon fontSize="small" />)}
      {action(
        'paste',
        'Paste',
        `Paste the copied threads over these, from ${unit} ${from} (Ctrl+V)`,
        <ContentPasteIcon fontSize="small" />,
        !canPaste,
      )}
      {action(
        'insert',
        'Insert',
        `Insert ${count} empty ${unit}${count === 1 ? '' : 's'} before ${unit} ${from} (Insert key)`,
      )}
      {action('delete', 'Delete', `Delete the selected ${unit}s (Delete key)`, <DeleteIcon fontSize="small" />)}
      {action('more', 'More…', 'Fill, advance or network the selection in Sequence tools')}
      <Tooltip title="Clear the selection (Esc)">
        <IconButton size="small" aria-label="Clear the selection" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
