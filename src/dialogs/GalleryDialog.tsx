import {
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import { PatternThumb } from '../components/PatternThumb'
import { usePhone } from '../layout'
import type { Draft } from '../weave'

export interface GalleryItem {
  name: string
  draft: Draft
  /** Shown under the name, e.g. colour swatches. */
  extra?: ReactNode
}

export interface GallerySection {
  title: string
  /** Shown when the section has nothing to offer. */
  empty: string
  items: GalleryItem[]
}

interface Props {
  open: boolean
  title: string
  intro: string
  sections: GallerySection[]
  onClose: () => void
  onUse: (item: GalleryItem) => void
  /** Anything else to show after the sections. */
  children?: ReactNode
}

/** A gallery of alternative drafts shown as small drawdowns, any of which can be used in place of the current one. */
export function GalleryDialog({ open, title, intro, sections, onClose, onUse, children }: Props) {
  const phone = usePhone()
  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {intro}
          </Typography>
          {sections.map((section) => (
            <Stack key={section.title} component="section" aria-label={section.title} sx={{ gap: 1 }}>
              <Typography variant="subtitle1">{section.title}</Typography>
              {section.items.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {section.empty}
                </Typography>
              )}
              <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap' }}>
                {section.items.map((item) => (
                  <Card key={item.name} variant="outlined" sx={{ width: 168 }}>
                    <CardContent sx={{ pb: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <PatternThumb draft={item.draft} size={128} />
                      <Typography variant="body2" sx={{ textAlign: 'center' }}>
                        {item.name}
                      </Typography>
                      {item.extra}
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'center' }}>
                      <Button size="small" aria-label={`Use ${item.name}`} onClick={() => onUse(item)}>
                        Use
                      </Button>
                    </CardActions>
                  </Card>
                ))}
              </Stack>
            </Stack>
          ))}
          {children}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
