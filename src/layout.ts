import { useMediaQuery } from '@mui/material'

// Widths match MUI's sm (600px) and md (900px) breakpoints. noSsr gives the right answer on the first render.

/** Phone-sized screen: full-screen dialogs, tightest layout. */
export const usePhone = () => useMediaQuery('(max-width: 599.95px)', { noSsr: true })

/** Phone or portrait tablet: icon-only toolbar and folded-away settings. */
export const useCompact = () => useMediaQuery('(max-width: 899.95px)', { noSsr: true })

/** Primary input is a finger rather than a mouse or pen. */
export const useTouch = () => useMediaQuery('(pointer: coarse)', { noSsr: true })

/** Narrower than a big desktop: the file buttons in the app bar drop their labels. */
export const useMidWidth = () => useMediaQuery('(max-width: 1439.95px)', { noSsr: true })
