import CloseIcon from '@mui/icons-material/Close'
import { type DialogTitleProps, IconButton, DialogTitle as MuiDialogTitle } from '@mui/material'

/**
 * A dialog's title, with a close button in the corner that does what the dialog's Cancel or Close does, as tapping
 * outside it, Escape or (on touch screens) a swipe down from the top do (swipeClose.ts). The button comes before the
 * title rather than inside it, so the dialog's name stays just its title, and the content still follows the title.
 */
export function DialogTitle({ onClose, ...props }: DialogTitleProps & { onClose: () => void }) {
  return (
    <>
      <IconButton
        aria-label="Close dialog"
        onClick={onClose}
        sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
      >
        <CloseIcon />
      </IconButton>
      <MuiDialogTitle {...props} sx={{ pr: 7 }} />
    </>
  )
}
