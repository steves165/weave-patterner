import { Alert } from '@mui/material'
import { useState } from 'react'
import { describeMove, type MoveResult, takeMoveResult } from '../move'

/**
 * After bringing patterns and settings over from the old address, says what came over. The offer itself is in the Load
 * dialog: a first visit can't tell someone who used the old address from someone new, and a notice for everyone was
 * one more thing in the way of new visitors.
 */
export function MoveNotice() {
  const [done, setDone] = useState<MoveResult | null>(takeMoveResult)
  if (!done) return null
  return (
    <Alert
      severity="success"
      role="status"
      onClose={() => setDone(null)}
      sx={{ position: 'fixed', zIndex: 1300, top: 72, left: '50%', transform: 'translateX(-50%)', maxWidth: 520 }}
    >
      {describeMove(done)}
    </Alert>
  )
}
