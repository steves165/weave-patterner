import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import TuneIcon from '@mui/icons-material/Tune'
import { Box, ButtonBase, Drawer, IconButton, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

/** The app bar's height: the sidebar stays in view just below it. */
const BAR = 65

/**
 * Desktop: the pattern settings in a sidebar on the right, which stays in view as the page scrolls either way. It
 * folds away to a narrow strip (remembered), leaving more room for the draft.
 */
export function SettingsSidebar({
  open,
  onToggle,
  children,
}: {
  open: boolean
  onToggle: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Box
      component="aside"
      aria-label="Pattern settings"
      sx={{
        flex: 'none',
        width: open ? 340 : 52,
        position: 'sticky',
        right: 0,
        zIndex: 4,
        bgcolor: 'background.paper',
        borderLeft: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: BAR,
          maxHeight: `calc(100vh - ${BAR}px - 41px)`,
          overflowY: 'auto',
          boxSizing: 'border-box',
          p: open ? '0 22px 24px' : '12px 6px',
        }}
      >
        {open ? (
          <>
            {/* Pinned at the top of the sidebar as it scrolls, so it can always be folded away. */}
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                mx: '-22px',
                mb: 1.5,
                px: '14px',
                pt: '10px',
                pb: '6px',
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <ButtonBase
                aria-expanded
                aria-label="Pattern settings: hide"
                onClick={() => onToggle(false)}
                sx={{ width: '100%', minHeight: 44, justifyContent: 'space-between', borderRadius: 3, px: 1 }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.4, color: 'text.secondary' }}>
                  Pattern settings
                </Typography>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: 13 }}>
                  Hide
                  <ChevronRightIcon fontSize="small" />
                </Stack>
              </ButtonBase>
            </Box>
            {children}
          </>
        ) : (
          <ButtonBase
            aria-expanded={false}
            aria-label="Pattern settings: show"
            onClick={() => onToggle(true)}
            sx={{
              width: 40,
              minHeight: 44,
              py: 1.5,
              borderRadius: 3,
              flexDirection: 'column',
              gap: 1,
              color: 'text.secondary',
            }}
          >
            <TuneIcon fontSize="small" />
            <Typography sx={{ writingMode: 'vertical-rl', fontWeight: 700, fontSize: 13 }}>Pattern settings</Typography>
          </ButtonBase>
        )}
      </Box>
    </Box>
  )
}

/**
 * Phones and portrait tablets: a bar at the bottom of the screen with the loom size, which brings the pattern
 * settings up in a sheet, which can also hold the links that sit in the status bar on wider screens.
 */
export function SettingsSheet(props: {
  open: boolean
  onOpen: (open: boolean) => void
  summary: string
  phone: boolean
  /** Phone: the links that sit in the status bar on wider screens. */
  links?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <ButtonBase
        aria-haspopup="dialog"
        onClick={() => props.onOpen(true)}
        sx={{
          position: 'sticky',
          bottom: props.phone ? 'calc(70px + env(safe-area-inset-bottom, 0px))' : 0,
          zIndex: 5,
          mx: 1.25,
          px: 1.75,
          py: 1.25,
          minHeight: 56,
          justifyContent: 'flex-start',
          gap: 1.5,
          textAlign: 'left',
          bgcolor: 'background.paper',
          border: 1,
          borderBottom: 0,
          borderColor: 'divider',
          borderRadius: '16px 16px 0 0',
        }}
      >
        <Box sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Typography sx={{ fontWeight: 600 }}>Pattern settings</Typography>
          <Typography variant="caption" color="text.secondary">
            {props.summary}
          </Typography>
        </Box>
        <ExpandLessIcon />
      </ButtonBase>
      <Drawer
        anchor="bottom"
        open={props.open}
        onClose={() => props.onOpen(false)}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-label': 'Pattern settings',
            sx: { borderRadius: '24px 24px 0 0', maxHeight: '85dvh', bgcolor: 'background.paper' },
          },
        }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            pt: 1.5,
            pb: 1,
            position: 'sticky',
            top: 0,
            zIndex: 2,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h2" sx={{ fontSize: 20 }}>
            Pattern settings
          </Typography>
          <IconButton aria-label="Close pattern settings" onClick={() => props.onOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}>
          {props.children}
          {props.links && (
            <Stack
              component="nav"
              aria-label="More"
              direction="row"
              sx={{ gap: 2.5, flexWrap: 'wrap', alignItems: 'center', mt: 3 }}
            >
              {props.links}
            </Stack>
          )}
        </Box>
      </Drawer>
    </>
  )
}
