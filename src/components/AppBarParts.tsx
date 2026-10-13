import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  ButtonBase,
  IconButton,
  ListSubheader,
  Menu,
  MenuList,
  type MenuListProps,
  type MenuProps,
  Tooltip,
  Typography,
} from '@mui/material'
import { createContext, type MouseEvent, type ReactNode, useContext, useLayoutEffect, useMemo, useRef } from 'react'

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
  /** Marks it for the guided tour and for F1 help. */
  tour?: string
  help?: string
}) {
  const { compact, icon, label, onClick, disabled, iconOnly, variant = 'text', tour, help } = props
  const marks = { 'data-tour': tour, 'data-help': help }
  return compact || iconOnly ? (
    <Tooltip title={label} describeChild>
      {/* span keeps the tooltip working while the button is disabled */}
      <span>
        <IconButton color="inherit" aria-label={label} onClick={onClick} disabled={disabled} {...marks}>
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
      {...marks}
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
      data-nav={props.label}
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
/** The phone navigation's height, as drawn, for what sits on it: the settings bar, and room at the foot of the page. */
export const PHONE_NAV_HEIGHT = 'var(--phone-nav-height, calc(70px + env(safe-area-inset-bottom, 0px)))'

export function PhoneNav({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  // Its height depends on the fonts and the phone's safe area, so measure it rather than guess.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const set = () => root.style.setProperty('--phone-nav-height', `${el.getBoundingClientRect().height}px`)
    set()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(set)
    ro?.observe(el, { box: 'border-box' })
    return () => {
      ro?.disconnect()
      root.style.removeProperty('--phone-nav-height')
    }
  }, [])
  return (
    <Box
      ref={ref}
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

/**
 * A heading between groups of menu items. Not a list item: a menu may only hold menu items, so screen readers read
 * it as plain text before the group.
 */
export function MenuHeading({ children, sticky = true }: { children: ReactNode; sticky?: boolean }) {
  return (
    <ListSubheader role="presentation" disableSticky={!sticky}>
      {children}
    </ListSubheader>
  )
}

/**
 * The top of a menu or popover: its name, and a button that closes it, as tapping outside it, Escape or (on touch
 * screens) a swipe down do.
 */
export function MenuTop({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 2, pr: 0.5, pt: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
        {title}
      </Typography>
      <IconButton size="small" aria-label={`Close ${title}`} onClick={onClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  )
}

const MenuTopContext = createContext<{ title: string; onClose: () => void } | null>(null)

/** A TitledMenu's list: its MenuTop beside the menu items rather than among them, as a menu may only hold items. */
function ListWithTop({ ref, ...props }: MenuListProps & { ref?: React.Ref<HTMLUListElement> }) {
  const top = useContext(MenuTopContext)
  return (
    <>
      {top && <MenuTop {...top} />}
      <MenuList ref={ref} {...props} sx={{ outline: 0, pt: 0 }} />
    </>
  )
}

/** A menu with its name and a close button at the top (MenuTop). */
export function TitledMenu({
  title,
  onClose,
  ...props
}: Omit<MenuProps, 'onClose'> & { title: string; onClose: () => void }) {
  const top = useMemo(() => ({ title, onClose }), [title, onClose])
  return (
    <MenuTopContext.Provider value={top}>
      <Menu {...props} onClose={onClose} slots={{ list: ListWithTop }} />
    </MenuTopContext.Provider>
  )
}

/**
 * "Skip to the draft": the first thing Tab reaches, so keyboard users can jump past the toolbar. It moves focus
 * rather than following a #link, which would clash with shared pattern links in the address.
 */
export function SkipLink({ target, children }: { target: string; children: ReactNode }) {
  return (
    <a
      className="skip-link"
      href={`#${target}`}
      onClick={(e) => {
        e.preventDefault()
        const el = document.getElementById(target)
        el?.focus({ preventScroll: true })
        el?.scrollIntoView({ block: 'start' })
      }}
    >
      {children}
    </a>
  )
}
