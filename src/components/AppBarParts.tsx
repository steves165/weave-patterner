import { Box, Button, ButtonBase, IconButton, Tooltip } from '@mui/material'
import type { MouseEvent, ReactNode } from 'react'

/** A toolbar button: icon + label on wide screens, icon-only with a tooltip on narrow ones. */
export function Action(props: {
  compact: boolean
  icon: ReactNode
  label: string
  onClick: (e: MouseEvent<HTMLElement>) => void
  disabled?: boolean
  iconOnly?: boolean
  /** Outlined or filled pills stand out from the plain text buttons. */
  variant?: 'text' | 'outlined' | 'contained'
}) {
  const { compact, icon, label, onClick, disabled, iconOnly, variant = 'text' } = props
  return compact || iconOnly ? (
    <Tooltip title={label} describeChild>
      {/* span keeps the tooltip working while the button is disabled */}
      <span>
        <IconButton color="inherit" aria-label={label} onClick={onClick} disabled={disabled}>
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  ) : (
    <Button
      color={variant === 'contained' ? 'primary' : 'inherit'}
      variant={variant}
      disableElevation
      startIcon={icon}
      onClick={onClick}
      disabled={disabled}
      sx={{ height: 40, px: 1.5, fontWeight: variant === 'text' ? 500 : 600, flex: 'none' }}
    >
      {label}
    </Button>
  )
}

/** A thin upright line between groups of toolbar buttons. */
export const Rule = () => <Box aria-hidden sx={{ width: '1px', height: 28, bgcolor: 'divider', flex: 'none' }} />

/** A tab of the phone's bottom navigation bar. */
export function NavTab(props: {
  icon: ReactNode
  label: string
  current?: boolean
  onClick: (e: MouseEvent<HTMLElement>) => void
}) {
  return (
    <ButtonBase
      aria-current={props.current ? 'page' : undefined}
      onClick={props.onClick}
      sx={{
        minHeight: 52,
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        fontSize: 11,
        fontWeight: props.current ? 700 : 600,
        color: props.current ? 'primary.main' : 'text.secondary',
      }}
    >
      {props.icon}
      {props.label}
    </ButtonBase>
  )
}

/** The phone's bottom navigation bar, fixed along the bottom of the screen. */
export function PhoneNav({ children }: { children: ReactNode }) {
  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar,
        display: 'grid',
        gridAutoFlow: 'column',
        gridAutoColumns: 'minmax(0, 1fr)',
        px: 0.75,
        pt: 0.75,
        pb: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      {children}
    </Box>
  )
}
