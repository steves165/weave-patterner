import { useMemo } from 'react'
import { tieupVariations, treadlingVariations } from '../variations'
import type { Draft } from '../weave'
import { GalleryDialog } from './GalleryDialog'

interface Props {
  open: boolean
  draft: Draft
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

/** Explores the same threading with other tie-ups and treadlings. */
export function VariationsDialog({ open, draft, onClose, onApply }: Props) {
  const tieups = useMemo(() => (open ? tieupVariations(draft) : []), [open, draft])
  const treadlings = useMemo(() => (open ? treadlingVariations(draft) : []), [open, draft])
  return (
    <GalleryDialog
      open={open}
      title="Variations"
      intro="Keep the threading and try another tie-up or treadling. Only variations that change the cloth are shown."
      sections={[
        {
          title: 'Other tie-ups',
          empty: 'A lift plan has no tie-up to change. Convert it to a tie-up and treadling first (Tools).',
          items: tieups,
        },
        { title: 'Other treadlings', empty: 'No other treadlings change this cloth.', items: treadlings },
      ]}
      onClose={onClose}
      onUse={(item) => onApply(item.draft, `Used the variation: ${item.name.toLowerCase()}`)}
    />
  )
}
