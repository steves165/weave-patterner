import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Link,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { type FeedbackKind, sendFeedback } from '../feedback'
import { usePhone } from '../layout'
import { DialogTitle } from './DialogTitle'

const MIN = 10
const MAX = 4000

/**
 * Feedback: a problem, an idea or anything else, sent to the feedback service (infra/feedback), which posts it as a
 * public GitHub issue. What's written is kept if the dialog is closed, until it's sent.
 */
export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const phone = usePhone()
  const [kind, setKind] = useState<FeedbackKind>('problem')
  const [message, setMessage] = useState('')
  // A field people never see: bots fill it in (feedback.mjs drops theirs).
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<{ url: string | null } | null>(null)

  const close = () => {
    onClose()
    if (sent) {
      setSent(null)
      setMessage('')
    }
  }
  const length = message.trim().length
  const send = async () => {
    setSending(true)
    setError(null)
    try {
      setSent({ url: await sendFeedback(kind, message.trim(), website) })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} fullScreen={phone} fullWidth maxWidth="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!sending && length >= MIN && length <= MAX) send()
        }}
      >
        <DialogTitle onClose={close}>Feedback</DialogTitle>
        {sent ? (
          <DialogContent>
            <Alert severity="success">
              Thank you: it’s been sent.{' '}
              {sent.url && (
                <>
                  You can follow it at{' '}
                  <Link href={sent.url} target="_blank" rel="noopener noreferrer">
                    {sent.url.replace(/^https:\/\//, '')}
                  </Link>
                  .
                </>
              )}
            </Alert>
          </DialogContent>
        ) : (
          <DialogContent>
            <RadioGroup
              row
              aria-label="What it's about"
              value={kind}
              onChange={(e) => setKind(e.target.value as FeedbackKind)}
            >
              <FormControlLabel value="problem" control={<Radio />} label="Something’s wrong" />
              <FormControlLabel value="idea" control={<Radio />} label="An idea" />
              <FormControlLabel value="other" control={<Radio />} label="Something else" />
            </RadioGroup>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={5}
              margin="dense"
              label="Your message"
              placeholder={
                kind === 'problem'
                  ? 'What you did, what you expected, and what happened instead'
                  : 'What you’d like, and the weaving, knitting or sewing it would help with'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              error={length > MAX}
              helperText={`${length} of ${MAX} characters`}
              slotProps={{ htmlInput: { maxLength: MAX + 200 } }}
            />
            <Box aria-hidden sx={{ position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden' }}>
              <TextField
                label="Website"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                slotProps={{ htmlInput: { tabIndex: -1, autoComplete: 'off' } }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              It’s posted publicly as an issue on the app’s GitHub page, with which app and version you’re using, so
              please don’t include personal details. Your patterns aren’t sent.
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
        )}
        <DialogActions>
          {sent ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <Button onClick={close}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={sending || length < MIN || length > MAX}>
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </>
          )}
        </DialogActions>
      </form>
    </Dialog>
  )
}
