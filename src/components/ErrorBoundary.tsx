import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { Component, type ReactNode, Suspense } from 'react'
import { LoadError } from '../lazyLoad'
import { LoomLoader } from './LoomLoader'

interface Props {
  children: ReactNode
  /** The whole app, rather than one part of it: there's nothing left to go back to, so no Close. */
  whole?: boolean
}

/**
 * Catches an error while drawing what's inside it, which would otherwise take the whole page down and leave it blank,
 * and says so, with a button to reload. The pattern is kept in the browser as it changes, so it comes back.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null; hidden: boolean }> {
  state = { error: null as Error | null, hidden: false }

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)), hidden: false }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    const { error, hidden } = this.state
    if (!error) return this.props.children
    if (hidden) return null
    const loading = error instanceof LoadError
    return (
      <Dialog open role="alertdialog" aria-labelledby="error-title" aria-describedby="error-text">
        <DialogTitle id="error-title">{loading ? 'This couldn’t load' : 'Something went wrong'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="error-text">
            {loading
              ? 'Part of the app couldn’t load: it may just have been updated, or you may be offline. Reload the page to get the latest version.'
              : 'Sorry, something went wrong here. Reload the page to carry on.'}{' '}
            Your pattern is saved in this browser and comes back after reloading.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {!this.props.whole && <Button onClick={() => this.setState({ hidden: true })}>Not now</Button>}
          <Button variant="contained" disableElevation onClick={() => location.reload()}>
            Reload
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
}

/** A part of the app downloaded on first use (lazyPart, lazyNamed): the loader while it comes, a message if it fails. */
export function LazySlot({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoomLoader label={label} />}>{children}</Suspense>
    </ErrorBoundary>
  )
}
