import { useMediaQuery } from '@mui/material'
import { useEffect, useState } from 'react'

// Widths match MUI's sm (600px) and md (900px) breakpoints. noSsr gives the right answer on the first render.

/** Phone-sized screen: full-screen dialogs, tightest layout. */
export const usePhone = () => useMediaQuery('(max-width: 599.95px)', { noSsr: true })

/** Phone or portrait tablet: icon-only toolbar and folded-away settings. */
export const useCompact = () => useMediaQuery('(max-width: 899.95px)', { noSsr: true })

/** Primary input is a finger rather than a mouse or pen. */
export const useTouch = () => useMediaQuery('(pointer: coarse)', { noSsr: true })

/** Narrower than a big desktop: the file buttons in the app bar drop their labels. */
export const useMidWidth = () => useMediaQuery('(max-width: 1439.95px)', { noSsr: true })

/** Laptop or landscape tablet: the app bar keeps only the name's mark and icon-only Tools and 3D buttons. */
export const useNarrow = () => useMediaQuery('(max-width: 1199.95px)', { noSsr: true })

/** The window's width without its scrollbar, kept up to date. */
export function useViewportWidth() {
  const [width, setWidth] = useState(() => document.documentElement.clientWidth)
  useEffect(() => {
    const update = () => setWidth(document.documentElement.clientWidth)
    const observer = new ResizeObserver(update)
    observer.observe(document.documentElement)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])
  return width
}

/** Room for the settings sidebar beside a default-sized draft: it starts open only this wide. */
export const useRoomForSidebar = () => useMediaQuery('(min-width: 1300px)', { noSsr: true })
