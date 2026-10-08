import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { colorways, draftColors, mapByLightness, recolor } from '../colorways'
import { mainColors } from '../image'
import { readImagePixels } from '../imageFile'
import type { Draft } from '../weave'
import { GalleryDialog } from './GalleryDialog'

interface Props {
  open: boolean
  draft: Draft
  onClose: () => void
  onApply: (draft: Draft, message: string) => void
}

const Swatches = ({ colors }: { colors: string[] }) => (
  <Stack direction="row" sx={{ gap: 0.5 }} aria-hidden>
    {colors.map((c) => (
      <Box key={c} sx={{ width: 14, height: 14, borderRadius: 0.5, border: 1, borderColor: 'divider', bgcolor: c }} />
    ))}
  </Stack>
)

/** The same draft in other colours, side by side; or pick new colours one by one. */
export function ColorwaysDialog({ open, draft, onClose, onApply }: Props) {
  const colors = useMemo(() => draftColors(draft), [draft])
  const ways = useMemo(() => (open ? colorways(draft) : []), [open, draft])
  const [own, setOwn] = useState<Record<string, string>>({})
  // Colours taken from a photo, dark to light.
  const [photo, setPhoto] = useState<string[] | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const loadPhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      setPhotoError(null)
      setPhoto(mainColors(await readImagePixels(file, 160), colors.length))
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : String(e))
    }
  }
  const photoMapping = photo ? mapByLightness(colors, photo) : null
  useEffect(() => {
    if (open) setOwn(Object.fromEntries(colors.map((c) => [c, c])))
  }, [open, colors])

  return (
    <GalleryDialog
      open={open}
      title="Colourways"
      intro="The same cloth in other colours. Each colour in the draft is swapped for another wherever it's used, in the warp and the weft."
      sections={[
        {
          title: 'Ideas',
          empty: '',
          items: ways.map((w) => ({
            name: w.name,
            draft: recolor(draft, w.mapping),
            extra: <Swatches colors={colors.map((c) => w.mapping[c] ?? c)} />,
          })),
        },
        {
          title: 'From a photo',
          empty: 'Choose a photo below to take its main colours.',
          items: photoMapping
            ? [
                {
                  name: 'Colours from your photo',
                  draft: recolor(draft, photoMapping),
                  extra: <Swatches colors={colors.map((c) => photoMapping[c] ?? c)} />,
                },
              ]
            : [],
        },
      ]}
      onClose={onClose}
      onUse={(item) => onApply(item.draft, `Recoloured: ${item.name.toLowerCase()}`)}
    >
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={() => photoInput.current?.click()}>
          Choose a photo
        </Button>
        <Typography variant="body2" color="text.secondary">
          Its {colors.length} main colours replace the draft's, darkest for darkest.
        </Typography>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          hidden
          aria-label="Photo for colours"
          onChange={(e) => loadPhoto(e.target.files?.[0])}
        />
      </Stack>
      {photoError && <Alert severity="error">{photoError}</Alert>}
      <Stack component="section" aria-label="Your own colours" sx={{ gap: 1 }}>
        <Typography variant="subtitle1">Your own colours</Typography>
        <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {colors.map((c, i) => (
            <Stack key={c} direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
              <Box sx={{ width: 20, height: 20, borderRadius: 0.5, border: 1, borderColor: 'divider', bgcolor: c }} />
              <Typography variant="body2">→</Typography>
              <input
                type="color"
                className="picker"
                aria-label={`New colour for colour ${i + 1} (${c})`}
                value={own[c] ?? c}
                onChange={(e) => setOwn({ ...own, [c]: e.target.value })}
              />
            </Stack>
          ))}
          <Button variant="contained" onClick={() => onApply(recolor(draft, own), 'Recoloured with your own colours')}>
            Apply my colours
          </Button>
        </Stack>
      </Stack>
    </GalleryDialog>
  )
}
