import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import EmailIcon from '@mui/icons-material/Email'
import FacebookIcon from '@mui/icons-material/Facebook'
import IosShareIcon from '@mui/icons-material/IosShare'
import PinterestIcon from '@mui/icons-material/Pinterest'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import XIcon from '@mui/icons-material/X'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { type ReactNode, useEffect, useState } from 'react'
import { track } from '../analytics'
import type { AppId } from '../brands'
import { download } from '../exportDraft'
import { useThemeBrand } from '../SeasonalTheme'
import { APP_NAMES, APP_PATHS, APP_URL, shareLinks } from '../share'
import { type DesignPainter, drawShareCard, type ShareSize } from '../shareImage'

interface Props {
  open: boolean
  onClose: () => void
  app: AppId
  /** The design's name. */
  title: string
  /** Makes the link that opens this design. */
  link: () => Promise<string>
  /** Draws the design for the picture. */
  design: DesignPainter
  /** Shows a short message. */
  onToast: (message: string) => void
}

/** The file name for a picture of the design. */
const pictureName = (title: string, size: ShareSize) =>
  `${title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Design'} (${size === 'square' ? 'Instagram' : 'Pinterest'}).png`

/**
 * Share a design: its link (through the phone's share menu, or straight to Pinterest, Facebook, X, WhatsApp or
 * email), or a picture of it for Instagram and Pinterest.
 */
export function ShareDialog({ open, onClose, app, title, link: makeLink, design, onToast }: Props) {
  const brand = useThemeBrand()
  const [link, setLink] = useState('')
  const [size, setSize] = useState<ShareSize>('square')
  const [picture, setPicture] = useState<{ url: string; blob: Blob } | null>(null)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  // biome-ignore lint/correctness/useExhaustiveDependencies: the link is made fresh each time the dialog opens
  useEffect(() => {
    if (!open) return
    setLink('')
    makeLink()
      .then(setLink)
      .catch(() => onToast("Couldn't make a link to this design"))
  }, [open])

  // The picture, drawn once the app's fonts are ready.
  // biome-ignore lint/correctness/useExhaustiveDependencies: redrawn when it opens or the shape changes
  useEffect(() => {
    if (!open) return
    let cancelled = false
    let url = ''
    const home = new URL(`${APP_URL}${APP_PATHS[app]}`)
    const address = `${home.host}${home.pathname}`.replace(/\/$/, '')
    Promise.all(
      ["600 52px 'Fredoka'", "700 30px 'Nunito Variable'"].map((f) => document.fonts?.load(f).catch(() => null)),
    )
      .then(() => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('This browser cannot draw pictures')
        drawShareCard(ctx, { app, appName: APP_NAMES[app], brand, title, address, design }, size)
        return new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no picture'))), 'image/png'),
        )
      })
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setPicture({ url, blob })
      })
      .catch(() => !cancelled && setPicture(null))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, size, brand])

  const links = link ? shareLinks(app, title, link) : null
  const fileName = pictureName(title, size)
  const file = picture ? new File([picture.blob], fileName, { type: 'image/png' }) : null
  const canSharePicture =
    canShare && file !== null && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

  const copy = () =>
    navigator.clipboard
      .writeText(link)
      .then(() => onToast('Link copied: anyone with it can open this design'))
      .catch(() => onToast("Couldn't copy the link here: select it and copy it instead"))
  const shareLink = () => {
    track('share', { to: 'link', app })
    navigator.share({ title, text: links?.text, url: link }).catch(() => {})
  }
  const sharePicture = () => {
    if (!file) return
    track('share', { to: `picture-${size}`, app })
    navigator.share({ files: [file], title, text: `${links?.text ?? title} ${link}` }).catch(() => {})
  }
  const downloadPicture = () => {
    if (!picture) return
    track('share', { to: `download-${size}`, app })
    download(fileName, picture.blob, 'image/png')
    onToast(`Saved ${fileName}`)
  }
  const site = (key: 'pinterest' | 'facebook' | 'x' | 'whatsapp' | 'email', label: string, icon: ReactNode) => (
    <Button
      key={key}
      variant="outlined"
      size="small"
      startIcon={icon}
      disabled={!links}
      href={links?.[key] ?? ''}
      target={key === 'email' ? undefined : '_blank'}
      rel="noopener noreferrer"
      onClick={() => track('share', { to: key, app })}
    >
      {label}
    </Button>
  )

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="share-title">
      <DialogTitle id="share-title">Share “{title}”</DialogTitle>
      <DialogContent>
        <Typography component="h3" variant="subtitle2" sx={{ mb: 1 }}>
          Link
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Anyone with this link can open the design"
          value={link || 'Making the link…'}
          slotProps={{
            htmlInput: { readOnly: true, onFocus: (e: { target: HTMLInputElement }) => e.target.select() },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Copy the link">
                    <span>
                      <IconButton aria-label="Copy the link" edge="end" onClick={copy} disabled={!link}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </InputAdornment>
              ),
            },
          }}
        />
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
          {canShare && (
            <Button
              variant="contained"
              disableElevation
              size="small"
              startIcon={<IosShareIcon />}
              disabled={!link}
              onClick={shareLink}
            >
              Share link…
            </Button>
          )}
          {site('pinterest', 'Pinterest', <PinterestIcon />)}
          {site('facebook', 'Facebook', <FacebookIcon />)}
          {site('x', 'X', <XIcon />)}
          {site('whatsapp', 'WhatsApp', <WhatsAppIcon />)}
          {site('email', 'Email', <EmailIcon />)}
        </Stack>

        <Typography component="h3" variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
          Picture, for Instagram and Pinterest
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={size}
          onChange={(_, v: ShareSize | null) => v && setSize(v)}
          aria-label="Picture shape"
          sx={{ mb: 1.5 }}
        >
          <ToggleButton value="square">Square (Instagram)</ToggleButton>
          <ToggleButton value="tall">Tall (Pinterest)</ToggleButton>
        </ToggleButtonGroup>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            borderRadius: 3,
            p: 1.5,
            mb: 1.5,
          }}
        >
          {picture ? (
            <Box
              component="img"
              src={picture.url}
              alt={`Picture of ${title} for sharing`}
              sx={{ display: 'block', maxWidth: '100%', maxHeight: 280, borderRadius: 2, boxShadow: 1 }}
            />
          ) : (
            <Box sx={{ height: 200, display: 'grid', placeItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Drawing the picture…
              </Typography>
            </Box>
          )}
        </Box>
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
          {canSharePicture && (
            <Button
              variant="contained"
              disableElevation
              size="small"
              startIcon={<IosShareIcon />}
              onClick={sharePicture}
            >
              Share picture…
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            disabled={!picture}
            onClick={downloadPicture}
          >
            Download picture
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {canSharePicture
            ? 'Share picture opens your phone’s share menu: choose Instagram or Pinterest there.'
            : 'Instagram only takes posts from its app: download the picture and post it from your phone.'}{' '}
          Links in Instagram posts can’t be clicked, so put the link in your bio or a story.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  )
}
