import { Box, Snackbar } from '@mui/material'
import { type ComponentType, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { type Consent, GA_ID, loadConsent, saveConsent, startAnalytics, stopAnalytics, track } from './analytics'
import { forgetStripe, withStripe } from './colors'
import { PHONE_NAV_HEIGHT, SkipLink } from './components/AppBarParts'
import { AppToolbar } from './components/AppToolbar'
import { ConsentBanner } from './components/ConsentBanner'
import { SteadyDraftView } from './components/DraftView'
import { FooterLinks } from './components/FooterLinks'
import { BIG_DRAFT, LoomLoader, useBusy } from './components/LoomLoader'
import { MoveNotice } from './components/MoveNotice'
import { PrintSheet } from './components/PrintSheet'
import { SettingsSheet, SettingsSidebar } from './components/SettingsFrame'
import { SettingsPanel } from './components/SettingsPanel'
import { StatusBar } from './components/StatusBar'
import { loadCurrent } from './current'
import { ImportDialog } from './dialogs/ImportDialog'
import { LoadDialog } from './dialogs/LoadDialog'
import { NewDialog } from './dialogs/NewDialog'
import { PrintDialog, type PrintOptions, printOptions } from './dialogs/PrintDialog'
import { SaveDialog } from './dialogs/SaveDialog'
import { drawSquare, pruneAdded } from './drawCloth'
import { HelpCenter } from './help/HelpCenter'
import { markTourSeen, Tour, TourOffer, tourSeen } from './help/Tour'
import { WEAVE_TOUR } from './help/tours'
import { useHelpKeys } from './help/useHelpKeys'
import { WEAVE_HELP } from './help/weaveHelp'
import { fillWithRepeat, findRepeat } from './repeat'

// three.js is large, so the 3D preview loads only when it's first opened.
const Fabric3DDialog = lazy(() => import('./dialogs/Fabric3DDialog'))
const TabletDialog = lazy(() => import('./dialogs/TabletDialog'))
const PaperDialog = lazyDialog(() => import('./dialogs/PaperDialog'), 'PaperDialog')
const DrawloomDialog = lazy(() => import('./dialogs/DrawloomDialog'))

/** A dialog loaded the first time it's needed, keeping the main download small. */
// biome-ignore lint/suspicious/noExplicitAny: React.lazy takes any component; each dialog keeps its own prop types
function lazyDialog<K extends string, C extends ComponentType<any>>(load: () => Promise<{ [k in K]: C }>, name: K) {
  return lazy(async () => ({ default: (await load())[name] }))
}
const BlocksDialog = lazyDialog(() => import('./dialogs/BlocksDialog'), 'BlocksDialog')
const ShareDialog = lazyDialog(() => import('./components/ShareDialog'), 'ShareDialog')
const CalculatorDialog = lazyDialog(() => import('./dialogs/CalculatorDialog'), 'CalculatorDialog')
const ClothReportDialog = lazyDialog(() => import('./dialogs/ClothReportDialog'), 'ClothReportDialog')
const ColorsDialog = lazyDialog(() => import('./dialogs/ColorsDialog'), 'ColorsDialog')
const ColorwaysDialog = lazyDialog(() => import('./dialogs/ColorwaysDialog'), 'ColorwaysDialog')
const DoubleClothDialog = lazyDialog(() => import('./dialogs/DoubleClothDialog'), 'DoubleClothDialog')
const EchoDialog = lazyDialog(() => import('./dialogs/EchoDialog'), 'EchoDialog')
const PictureDialog = lazyDialog(() => import('./dialogs/PictureDialog'), 'PictureDialog')
const ProfileDialog = lazyDialog(() => import('./dialogs/ProfileDialog'), 'ProfileDialog')
const RigidHeddleDialog = lazyDialog(() => import('./dialogs/RigidHeddleDialog'), 'RigidHeddleDialog')
const ToolsDialog = lazyDialog(() => import('./dialogs/ToolsDialog'), 'ToolsDialog')
const TransformDialog = lazyDialog(() => import('./dialogs/TransformDialog'), 'TransformDialog')
const VariationsDialog = lazyDialog(() => import('./dialogs/VariationsDialog'), 'VariationsDialog')
const WarpPlanDialog = lazyDialog(() => import('./dialogs/WarpPlanDialog'), 'WarpPlanDialog')
const WeavingMode = lazyDialog(() => import('./dialogs/WeavingMode'), 'WeavingMode')
const YarnsDialog = lazyDialog(() => import('./dialogs/YarnsDialog'), 'YarnsDialog')

import { addBlock, loadSavedBlocks, type SavedBlock, storeSavedBlocks } from './endBlocks'
import { download, draftBitmap, exportDraft, fileBase } from './exportDraft'
import { longestFloats, longFloatMask, unwovenThreads } from './floats'
import { useDraftHistory } from './hooks/useDraftHistory'
import { useRememberCurrent } from './hooks/useRememberCurrent'
import { useSharedPatternLink } from './hooks/useSharedPatternLink'
import { useViewOptions } from './hooks/useViewOptions'
import { useYarns } from './hooks/useYarns'
import { draftPng, draftSvg } from './imageExport'
import { useCompact, usePhone, useRoomForSidebar, useTouch, useViewportWidth } from './layout'
import { isDirectTieup, toLiftplan, toTreadling } from './liftplan'
import { patternColours } from './seasons'
import { selvedgeMisses } from './selvedge'
import { patternUrl } from './share'
import { clothPainter } from './shareImage'
import { addTabby } from './tabby'
import {
  applyRangeOp,
  type Clip,
  copyRange,
  drawAlong,
  pasteClip,
  type SelectionAction,
  selectionRange,
  type Target,
  type ThreadSelection,
  trompAsWrit,
} from './tools'
import { computeDrawdown, type Draft, emptyDraft, MAX_TREADLES, resizeDraft, starterDraft } from './weave'

type DialogName =
  | 'save'
  | 'load'
  | 'import'
  | 'tools'
  | 'calculator'
  | 'weave'
  | '3d'
  | 'colors'
  | 'profile'
  | 'doublecloth'
  | 'transform'
  | 'warpplan'
  | 'colorways'
  | 'variations'
  | 'echo'
  | 'picture'
  | 'report'
  | 'rigid'
  | 'tablet'
  | 'paper'
  | 'drawloom'
  | 'yarns'
  | 'blocks'
  | 'share'
  | 'print'
  | 'new'

/**
 * A key for the draft's grids that changes when the draft grows a lot at once (a tartan preset, a big pattern opened):
 * React then builds the grids afresh, which is many times faster than adding thousands of squares beside the old ones.
 */
function useGrowthKey(cells: number): number {
  const last = useRef({ cells, key: 0 })
  if (cells > last.current.cells * 1.5 + 2000) last.current = { cells, key: last.current.key + 1 }
  else last.current.cells = cells
  return last.current.key
}

export default function App() {
  const phone = usePhone()
  const compact = useCompact()
  const touch = useTouch()
  // Mouse and a wide screen: the page itself scrolls to show a big draft (touch screens pan the draft in its box).
  const pageScroll = !compact && !touch
  const viewportWidth = useViewportWidth()
  const roomForSidebar = useRoomForSidebar()
  // The pattern from last time on this device, saved or not.
  const [restored] = useState(loadCurrent)
  const { draft, baseline, update, reset, undo, redo, canUndo, canRedo, markBaseline } = useDraftHistory(
    () => restored?.draft ?? starterDraft(patternColours() ?? undefined),
    restored?.baseline,
  )
  const [name, setName] = useState<string | null>(restored?.name ?? null)
  useRememberCurrent({ name, draft, baseline })
  // Touch only: when on, a finger drag-paints the grids instead of scrolling.
  const [touchPaint, setTouchPaint] = useState(false)
  const [dialog, setDialog] = useState<DialogName | null>(null)
  // Dialogs opened so far: each loads the first time it opens, then stays ready (keeping what you'd set in it).
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    if (dialog) setSeen((s) => (s.has(dialog) ? s : new Set(s).add(dialog)))
  }, [dialog])
  const [toast, setToast] = useState<string | null>(null)
  const [loader, busy] = useBusy()
  // Google Analytics, only once the visitor has agreed; the choice is remembered.
  const [consent, setConsentState] = useState<Consent | null>(loadConsent)
  const setConsent = (c: Consent | null) => {
    saveConsent(c)
    setConsentState(c)
  }
  useEffect(() => {
    if (consent === 'granted') startAnalytics()
    else if (consent === 'denied') stopAnalytics()
  }, [consent])
  // Which tools get used (never what's in the pattern).
  useEffect(() => {
    if (dialog) track('open_tool', { tool: dialog })
  }, [dialog])
  // Display settings (including cell size and float highlighting), remembered between visits.
  const [view, setView] = useViewOptions()
  const { cellSize, highlightFloats, floatLimit } = view
  const [yarns, setYarns] = useYarns()
  // Ends or picks copied in the sequence tools or from a selection, kept until replaced.
  const [clip, setClip] = useState<Clip | null>(null)
  // The Select tool, and the ends or picks selected with it; Sequence tools can open on the selection.
  const [selectMode, setSelectMode] = useState(false)
  const [selection, setSelection] = useState<ThreadSelection | null>(null)
  const [toolsRange, setToolsRange] = useState<ReturnType<typeof selectionRange> | null>(null)
  // The end or pick under the mouse, for the Insert and Delete keys.
  const hovered = useRef<{ target: Target; index: number } | null>(null)
  // Blocks saved to use again, kept on this device; and the block the Blocks dialog opens at.
  const [blockStore, setBlockStoreState] = useState<SavedBlock[]>(loadSavedBlocks)
  const setBlockStore = (next: SavedBlock[]) => {
    setBlockStoreState(next)
    if (!storeSavedBlocks(next)) setToast("Couldn't save the block store on this device")
  }
  const [blockFocus, setBlockFocus] = useState<number | null>(null)
  // Help (F1, or the Help link) and the guided tour, offered on a first visit.
  const [help, setHelp] = useState<{ open: boolean; topic: string | null }>({ open: false, topic: null })
  const openHelp = (topic: string | null) => setHelp({ open: true, topic })
  const [touring, setTouring] = useState(false)
  const [offerTour, setOfferTour] = useState(() => !tourSeen('weave'))
  const startTour = () => {
    markTourSeen('weave')
    setOfferTour(false)
    setHelp((h) => ({ ...h, open: false }))
    setDialog(null)
    setSheetOpen(false)
    setTouring(true)
  }
  useHelpKeys(openHelp, !touring)
  // Whether the next print includes the written-instructions page.
  // The print sheet (a picture of the whole draft) is only on the page while printing: kept there, a big draft's
  // thousands of shapes would be redrawn on every change.
  const [printing, setPrinting] = useState<PrintOptions | null>(null)
  // The link that opens this pattern, kept ready (it takes a moment to make) for the QR code on the printed sheet.
  const [link, setLink] = useState<string | null>(null)
  useEffect(() => {
    let current = true
    setLink(null)
    const later = setTimeout(() => {
      patternUrl(name ?? 'Shared pattern', draft)
        .then((l) => current && setLink(l))
        .catch(() => {})
    }, 400)
    return () => {
      current = false
      clearTimeout(later)
    }
  }, [name, draft])
  useEffect(() => {
    // Ctrl+P and the browser's own Print: draw the sheet just before the browser takes its picture of the page.
    const before = () => flushSync(() => setPrinting((p) => p ?? printOptions()))
    const after = () => setPrinting(null)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])
  /** Draws the print sheet while `f` runs (image export copies its picture of the draft), then takes it away. */
  const withSheet = <T,>(f: () => T): T => {
    flushSync(() => setPrinting((p) => p ?? { cloth: false, instructions: false, qr: false }))
    try {
      return f()
    } finally {
      setPrinting(null)
    }
  }

  const drawdown = useMemo(() => computeDrawdown(draft), [draft])
  const gridKey = useGrowthKey(draft.ends * (draft.picks + draft.shafts) + draft.picks * draft.treadles)
  // The draft as a drawing stroke on the drawdown began.
  const clothStroke = useRef<Draft | null>(null)
  const floats = useMemo(() => longestFloats(draft, drawdown), [draft, drawdown])
  const unwoven = useMemo(() => unwovenThreads(draft, drawdown), [draft, drawdown])
  const repeat = useMemo(() => findRepeat(draft, drawdown), [draft, drawdown])
  const filledRepeat = useMemo(() => fillWithRepeat(draft), [draft])
  const selvedge = useMemo(
    () => selvedgeMisses(draft, view.shuttleStart, drawdown),
    [draft, view.shuttleStart, drawdown],
  )
  const floatMask = useMemo(
    () => (highlightFloats ? longFloatMask(draft, floatLimit, drawdown) : null),
    [highlightFloats, draft, floatLimit, drawdown],
  )

  /** Without a tie-up, every draft is kept as a lift plan (shafts lifted on each pick). */
  const keepLiftplan = (d: Draft) => (view.noTieup && !isDirectTieup(d) ? toLiftplan(d) : d)
  // The pattern as it was on treadles before switching to a lift plan, so switching back keeps its tie-up.
  const onTreadles = useRef<Draft | null>(null)
  // The loom type each draft was made on. Undo and redo bring it back with the draft: undoing past a switch to a
  // lift plan is back on treadles, with the tie-up showing again.
  const loomTypes = useRef(new WeakMap<Draft, boolean>())
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the draft changes; switching records its own
  useEffect(() => {
    const liftplan = loomTypes.current.get(draft)
    if (liftplan !== undefined) {
      if (liftplan !== view.noTieup) setView({ noTieup: liftplan })
    } else if (view.noTieup && !isDirectTieup(draft)) {
      // Anything that left a tie-up on a lift plan loom becomes a lift plan, in the same undo step.
      update(toLiftplan, { merge: true })
    } else loomTypes.current.set(draft, view.noTieup)
  }, [draft])
  const changeView = (patch: Partial<typeof view>) => {
    if (patch.noTieup === undefined || patch.noTieup === view.noTieup) {
      setView(patch)
      return
    }
    if (patch.noTieup) {
      onTreadles.current = draft
      const next = isDirectTieup(draft) ? draft : toLiftplan(draft)
      loomTypes.current.set(next, true)
      setView(patch)
      update(() => next)
      setToast('Lift plan: the right-hand grid now marks the shafts to lift on each pick. The cloth is the same.')
      return
    }
    // Back to a floor loom: the tie-up from before, with a treadle added for each new shed.
    try {
      const next = toTreadling(draft, MAX_TREADLES, onTreadles.current ?? undefined)
      loomTypes.current.set(next, false)
      setView(patch)
      update(() => next)
      const added = onTreadles.current ? next.treadles - onTreadles.current.treadles : 0
      setToast(
        onTreadles.current
          ? `Tie-up and treadles: your tie-up is back${added > 0 ? `, with ${added} more ${added === 1 ? 'treadle' : 'treadles'} for new sheds` : ''}. The cloth is the same.`
          : `Tie-up and treadles: ${next.treadles} treadles, one for each different shed. The cloth is the same.`,
      )
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e))
    }
  }
  /** Starts on a different pattern: its own undo history, and no earlier tie-up to go back to. */
  const startPattern = (d: Draft) => {
    onTreadles.current = null
    reset(d)
  }

  /**
   * Straight and point drawing: pressing a threading (or treadling) box starts a draw there, and dragging along the
   * ends (or picks) fills them in, climbing if the drag goes up the shafts (treadles) and descending if it goes down.
   * The whole drag is one undo step, redrawn from the draft as it was when the drag began. It only becomes a run once
   * it reaches another end (or pick): a hand that slips into the next box of the same pick while clicking would
   * otherwise redraw that pick with one treadle, losing the other lifts just set on it.
   */
  const stroke = useRef<{ base: Draft; from: number; start: number; direction: 1 | -1; moved: boolean } | null>(null)
  const drawStroke = (target: Target, index: number, position: number, continuing: boolean) => {
    if (view.drawTool === 'click') return
    if (!continuing || !stroke.current)
      stroke.current = { base: draft, from: index, start: position, direction: 1, moved: false }
    const s = stroke.current
    if (continuing && !s.moved && index === s.from) return
    s.moved = true
    if (position !== s.start) s.direction = position > s.start ? 1 : -1
    const tool = view.drawTool
    update(() => drawAlong(s.base, target, tool, s.from, index, s.start, s.direction, view.noTieup), {
      merge: continuing,
    })
  }

  /** Applies a change made in a dialog as one undoable step, then closes it. */
  /** Runs `work`, behind the loom loader when the draft is big enough to take a while to draw. */
  const drawing = (d: Draft, work: () => void) =>
    d.ends * d.picks > BIG_DRAFT ? busy('Weaving your pattern…', work) : work()

  const applyFromDialog = (d: Draft, message: string) =>
    drawing(d, () => {
      update(() => keepLiftplan(d))
      setDialog(null)
      setToast(`${message}. Undo with Ctrl+Z or the undo button.`)
    })

  // A selection past the end of the draft (after it shrank) is dropped.
  const selectionLength = selection ? (selection.target === 'threading' ? draft.ends : draft.picks) : 0
  if (selection && Math.max(selection.anchor, selection.at) >= selectionLength) setSelection(null)

  /** Does something with the selected ends or picks, as one undo step. */
  const selectionAction = (action: SelectionAction, sel: ThreadSelection | null = selection) => {
    if (!sel) return
    const { target, from, to } = selectionRange(sel)
    const unit = target === 'threading' ? 'end' : 'pick'
    const label = from === to ? `${unit} ${from}` : `${unit}s ${from}–${to}`
    const change = (next: Draft, message: string, after: ThreadSelection | null = sel) => {
      update(() => keepLiftplan(next))
      setSelection(after)
      setToast(`${message}. Undo with Ctrl+Z.`)
    }
    try {
      switch (action) {
        case 'repeat':
          return change(applyRangeOp(draft, target, from, to, { kind: 'repeat', times: 1 }), `Repeated ${label}`)
        case 'mirror':
          return change(applyRangeOp(draft, target, from, to, { kind: 'mirror' }), `Mirrored ${label}`)
        case 'reverse':
          return change(applyRangeOp(draft, target, from, to, { kind: 'reverse' }), `Reversed ${label}`)
        case 'copy':
          setClip(copyRange(draft, target, from, to))
          return setToast(`Copied ${label}`)
        case 'cut':
          setClip(copyRange(draft, target, from, to))
          return change(applyRangeOp(draft, target, from, to, { kind: 'delete' }), `Cut ${label}`, null)
        case 'paste': {
          if (!clip) return setToast('Copy some ends or picks first')
          const next = pasteClip(draft, target, from, clip, 'overwrite')
          const end = from - 1 + clip.items.length - 1
          return change(next, `Pasted ${clip.items.length} at ${unit} ${from}`, { target, anchor: from - 1, at: end })
        }
        case 'insert':
          return change(
            applyRangeOp(draft, target, from, from, { kind: 'insert', count: to - from + 1 }),
            `Inserted ${to - from + 1} empty ${unit}${to === from ? '' : 's'} before ${unit} ${from}`,
          )
        case 'delete':
          return change(applyRangeOp(draft, target, from, to, { kind: 'delete' }), `Deleted ${label}`, null)
        case 'more':
          setToolsRange({ target, from, to })
          return setDialog('tools')
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e))
    }
  }

  // Keys for the selection, or the end or pick under the mouse: copy, cut, paste, insert, delete; Esc deselects.
  const keyAction = useRef<(e: KeyboardEvent) => void>(() => {})
  keyAction.current = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null
    if (dialog || help.open || touring) return
    if (el?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return
    const mod = e.ctrlKey || e.metaKey
    const one = hovered.current && {
      target: hovered.current.target,
      anchor: hovered.current.index,
      at: hovered.current.index,
    }
    const key = e.key.toLowerCase()
    let action: SelectionAction | null = null
    let sel = selection
    if (e.key === 'Escape' && selection) {
      setSelection(null)
      return
    }
    if (mod && key === 'c' && selection) action = 'copy'
    else if (mod && key === 'x' && selection) action = 'cut'
    else if (mod && key === 'v' && clip && (selection || one)) {
      action = 'paste'
      sel = selection ?? one
    } else if (!mod && (e.key === 'Delete' || (e.key === 'Backspace' && selection))) {
      action = 'delete'
      sel = selection ?? one
    } else if (!mod && e.key === 'Insert') {
      action = 'insert'
      sel = selection ?? one
    }
    if (!action || !sel) return
    e.preventDefault()
    selectionAction(action, sel)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyAction.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /** Opens a different pattern as a new document. */
  const open = (d: Draft, n: string | null, message?: string) =>
    drawing(d, () => {
      startPattern(keepLiftplan(d))
      setName(n)
      setDialog(null)
      if (message) setToast(message)
    })
  const summary = `${draft.shafts} shafts · ${view.noTieup ? 'lift plan' : `${draft.treadles} treadles`} · ${draft.ends} × ${draft.picks}`
  // Phones and portrait tablets: the settings come up in a sheet from the bottom of the screen.
  const [sheetOpen, setSheetOpen] = useState(false)
  const analyticsChoice = GA_ID ? () => setConsent(null) : undefined
  const settingsPanel = (
    <SettingsPanel
      draft={draft}
      name={name}
      touch={touch}
      onResize={(dim, n) =>
        // Without a tie-up, a lift plan has one column per shaft.
        update((d) =>
          keepLiftplan(resizeDraft(d, dim === 'shafts' && view.noTieup ? { shafts: n, treadles: n } : { [dim]: n })),
        )
      }
      cellSize={cellSize}
      onCellSize={(n) => setView({ cellSize: n })}
      onFillWarp={(c) => update((d) => ({ ...d, warpColors: d.warpColors.map(() => c) }))}
      onFillWeft={(c) => update((d) => ({ ...d, weftColors: d.weftColors.map(() => c) }))}
      onColors={() => setDialog('colors')}
      onStripe={(side, runs, key) =>
        update(
          (d) => {
            const stripe = d.stripes?.[side]
            return stripe ? withStripe(d, side, { ...stripe, runs }) : d
          },
          { key: `stripe:${side}:${key}` },
        )
      }
      onForgetStripe={(side) => {
        update((d) => forgetStripe(d, side))
        setToast(`Forgot the ${side} stripe; its colours stay as they are`)
      }}
      repeat={repeat}
      onTrimToRepeat={() => update((d) => resizeDraft(d, { ends: repeat.ends, picks: repeat.picks }))}
      onFillWithRepeat={
        filledRepeat &&
        (() => {
          const { draft: next, ends, picks } = filledRepeat
          update(() => keepLiftplan(next))
          setToast(
            `Filled ${[ends && `${ends} ends`, picks && `${picks} picks`].filter(Boolean).join(' and ')} with the repeat. Undo with Ctrl+Z.`,
          )
        })
      }
      onAddTabby={(colour) => {
        try {
          const { draft: next, treadles } = addTabby(draft, colour)
          update(() => keepLiftplan(next))
          setToast(
            `Tabby added: a plain weave pick after every pick, alternating shafts 1, 3… and 2, 4…${treadles ? ` (treadles ${treadles[0]} and ${treadles[1]})` : ''}. Undo with Ctrl+Z.`,
          )
        } catch (e) {
          setToast(e instanceof Error ? e.message : String(e))
        }
      }}
      highlightFloats={highlightFloats}
      onHighlightFloats={(on) => setView({ highlightFloats: on })}
      longestFloat={Math.max(floats.warp, floats.weft)}
      floatLimit={floatLimit}
      onFloatLimit={(n) => setView({ floatLimit: n })}
      view={view}
      onView={changeView}
      onClear={(grid) => {
        const all = grid === 'all'
        update((d) => ({
          ...d,
          threading: all || grid === 'threading' ? d.threading.map(() => -1) : d.threading,
          // A lift plan keeps its straight tie-up: there is no tie-up to clear.
          tieup: (all || grid === 'tieup') && !view.noTieup ? d.tieup.map((r) => r.map(() => false)) : d.tieup,
          treadling: all || grid === 'treadling' ? d.treadling.map((r) => r.map(() => false)) : d.treadling,
        }))
        const names = { threading: 'Threading', tieup: 'Tie-up', treadling: view.noTieup ? 'Lift plan' : 'Treadling' }
        setToast(`${all ? 'Grids' : names[grid]} cleared. Undo with Ctrl+Z or the undo button.`)
      }}
      canReset={draft !== baseline}
      onReset={() => update(() => baseline)}
      onNew={() => setDialog('new')}
    />
  )

  useSharedPatternLink((n, d) => open(d, n, `Opened "${n}" from link — use Save to keep it`), setToast)

  return (
    <>
      <Box
        className="screen-only"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          // Desktop with a mouse: the page grows to fit the draft and scrolls both ways.
          ...(pageScroll ? { width: 'max-content', minWidth: '100%' } : {}),
          bgcolor: 'background.default',
          // Room for the phone's bottom navigation.
          pb: phone ? PHONE_NAV_HEIGHT : 0,
        }}
      >
        <SkipLink target="main">Skip to the draft</SkipLink>
        <AppToolbar
          width={pageScroll ? viewportWidth : undefined}
          name={name}
          summary={summary}
          onDraft={() => {
            setSheetOpen(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          phone={phone}
          compact={compact}
          touch={touch}
          touchPaint={touchPaint}
          onToggleTouchPaint={() => {
            setTouchPaint(!touchPaint)
            setToast(
              touchPaint
                ? 'Swipe to move around the pattern; tap a box to toggle it'
                : 'Drag-painting on: drag across the grids to paint. Tap the brush again to scroll.',
            )
          }}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onNew={() => setDialog('new')}
          onSave={() => setDialog('save')}
          onLoad={() => setDialog('load')}
          onExport={(format) => {
            const { fileName, content, type } = exportDraft(name, draft, format)
            track('export', { format })
            download(fileName, content, type)
            setToast(`Exported ${fileName}`)
          }}
          onExportImage={(format) => {
            const fileName = format === 'bmp-color' ? `${fileBase(name)} (colours).bmp` : `${fileBase(name)}.${format}`
            const done = () => setToast(`Exported ${fileName}`)
            const fail = (e: unknown) => setToast(`Couldn't export the image: ${e instanceof Error ? e.message : e}`)
            track('export', { format })
            if (format === 'bmp' || format === 'bmp-color') {
              const bitmap = draftBitmap(draft, format === 'bmp' ? 'structure' : 'colors', view.endOneRight)
              download(fileName, new Blob([bitmap], { type: 'image/bmp' }), 'image/bmp')
              done()
            } else if (format === 'svg') {
              try {
                download(
                  fileName,
                  withSheet(() => draftSvg(1)),
                  'image/svg+xml',
                )
                done()
              } catch (e) {
                fail(e)
              }
            } else
              withSheet(() => draftPng(2))
                .then((png) => {
                  download(fileName, png, 'image/png')
                  done()
                })
                .catch(fail)
          }}
          onImport={() => setDialog('import')}
          onHelp={() => openHelp(null)}
          onShare={() => setDialog('share')}
          onPrint={() => setDialog('print')}
          onWeave={() => setDialog('weave')}
          on3d={() => setDialog('3d')}
          onSequenceTools={() => {
            setToolsRange(null)
            setDialog('tools')
          }}
          onTrompAsWrit={() => {
            const { draft: next, skipped } = trompAsWrit(draft)
            update(() => next)
            setToast(
              `Treadling now follows the threading (${next.picks} picks)` +
                (skipped
                  ? `. ${skipped} picks have no treadle: their end is unthreaded or its shaft has no treadle.`
                  : ''),
            )
          }}
          onCalculator={() => setDialog('calculator')}
          onColors={() => setDialog('colors')}
          onProfile={() => setDialog('profile')}
          onDoubleCloth={() => setDialog('doublecloth')}
          onTransform={() => setDialog('transform')}
          onWarpPlan={() => setDialog('warpplan')}
          onColorways={() => setDialog('colorways')}
          onVariations={() => setDialog('variations')}
          onEcho={() => setDialog('echo')}
          onPicture={() => setDialog('picture')}
          onReport={() => setDialog('report')}
          onRigidHeddle={() => setDialog('rigid')}
          onTablet={() => setDialog('tablet')}
          onPaper={() => setDialog('paper')}
          onDrawloom={() => setDialog('drawloom')}
          onYarns={() => setDialog('yarns')}
        />

        <Box
          sx={{
            flex: '1 0 auto',
            display: 'flex',
            alignItems: 'stretch',
            // Desktop: the page grows to fit the draft and scrolls; the sidebar stays in view at the right.
            width: pageScroll ? 'max-content' : 'auto',
            minWidth: '100%',
          }}
        >
          <Box
            component="main"
            id="main"
            tabIndex={-1}
            sx={{ ...(pageScroll ? { flex: '1 0 auto' } : { flex: '1 1 auto', minWidth: 0 }), outline: 'none' }}
          >
            <h1 className="sr-only">Weave Patterner: weaving draft designer</h1>
            <SteadyDraftView
              key={gridKey}
              draft={draft}
              onView={changeView}
              drawdown={drawdown}
              floatMask={floatMask}
              cellSize={cellSize}
              view={view}
              touchPaint={touchPaint}
              onThreading={(shaft, end, value, continuing) =>
                view.drawTool !== 'click'
                  ? drawStroke('threading', end, shaft, continuing)
                  : update(
                      (d) => {
                        const threading = [...d.threading]
                        threading[end] = value ? shaft : threading[end] === shaft ? -1 : threading[end]
                        return { ...d, threading }
                      },
                      { merge: continuing },
                    )
              }
              onTieup={(shaft, t, value, continuing) =>
                update(
                  (d) => ({
                    ...d,
                    tieup: d.tieup.map((r, s) => (s === shaft ? r.map((v, i) => (i === t ? value : v)) : r)),
                  }),
                  { merge: continuing },
                )
              }
              onTreadling={(pick, t, value, continuing) => {
                // A pick can use several treadles (or lift several shafts), so pressing a box always toggles it, adding
                // to the pick; with a draw tool, dragging on from there draws a run with one treadle per pick.
                if (view.drawTool !== 'click' && continuing) return drawStroke('treadling', pick, t, continuing)
                if (view.drawTool !== 'click')
                  stroke.current = { base: draft, from: pick, start: t, direction: 1, moved: false }
                update(
                  (d) => ({
                    ...d,
                    treadling: d.treadling.map((r, p) => (p === pick ? r.map((v, i) => (i === t ? value : v)) : r)),
                  }),
                  { merge: continuing },
                )
              }}
              onDrawCloth={(pick, end, warp, continuing) => {
                // Each square is the smallest change that weaves it; shafts and treadles a stroke adds and then
                // leaves unused are tidied away, and the whole stroke is one undo step.
                if (!continuing) clothStroke.current = draft
                const base = clothStroke.current ?? draft
                try {
                  update((d) => keepLiftplan(pruneAdded(drawSquare(d, pick, end, warp), base)), { merge: continuing })
                } catch (e) {
                  setToast(e instanceof Error ? e.message : String(e))
                }
              }}
              onAddBlock={(from, to) => {
                update((d) => addBlock(d, from, to))
                setToast(
                  `Marked ends ${Math.min(from, to) + 1}–${Math.max(from, to) + 1} as a block: click it to name it`,
                )
              }}
              onBlocks={(i) => {
                setBlockFocus(i ?? null)
                setDialog('blocks')
              }}
              blockStrip={seen.has('blocks')}
              selectMode={selectMode}
              onSelectMode={(on) => {
                setSelectMode(on)
                if (!on) setSelection(null)
              }}
              selection={selection}
              onSelection={setSelection}
              onSelectionAction={selectionAction}
              canPaste={clip !== null}
              onHoverThread={(target, index) => {
                if (index !== null) hovered.current = { target, index }
                else if (hovered.current?.target === target) hovered.current = null
              }}
              onWarpColor={(i, c) =>
                update((d) => ({ ...d, warpColors: d.warpColors.map((v, j) => (j === i ? c : v)) }), {
                  key: `warp:${i}`,
                })
              }
              onWeftColor={(i, c) =>
                update((d) => ({ ...d, weftColors: d.weftColors.map((v, j) => (j === i ? c : v)) }), {
                  key: `weft:${i}`,
                })
              }
            />
          </Box>
          {!compact && (
            <SettingsSidebar
              open={view.settingsOpen ?? roomForSidebar}
              onToggle={(open) => setView({ settingsOpen: open })}
            >
              {settingsPanel}
            </SettingsSidebar>
          )}
        </Box>
        {compact && (
          <SettingsSheet
            open={sheetOpen}
            onOpen={setSheetOpen}
            summary={summary}
            phone={phone}
            links={
              phone && (
                <FooterLinks
                  others={[
                    { href: './knit/', label: 'Knit Patterner' },
                    { href: './sew/', label: 'Sew Patterner' },
                  ]}
                  onAnalytics={analyticsChoice}
                  onHelp={() => openHelp(null)}
                  fontSize={14}
                />
              )
            }
          >
            {settingsPanel}
          </SettingsSheet>
        )}
        <StatusBar
          draft={draft}
          floats={floats}
          floatLimit={floatLimit}
          unwoven={unwoven}
          selvedge={selvedge}
          view={view}
          onFix={(fix) => {
            track('fix', { fix: fix.id })
            if (fix.view) setView(fix.view)
            if (fix.draft) {
              const next = fix.draft
              update(() => keepLiftplan(next))
              setToast(`${fix.title}: done. Undo with Ctrl+Z or the undo button.`)
            } else setToast(`${fix.title}: done.`)
          }}
          onAnalytics={analyticsChoice}
          onHelp={() => openHelp(null)}
          phone={phone}
          sticky={!compact}
          width={pageScroll ? viewportWidth : undefined}
        />

        <SaveDialog
          open={dialog === 'save'}
          draft={draft}
          currentName={name}
          onClose={() => setDialog(null)}
          onSaved={(n) => {
            markBaseline()
            setName(n)
            setDialog(null)
            setToast(`Saved "${n}"`)
          }}
        />
        <NewDialog
          open={dialog === 'new'}
          liftplan={view.noTieup}
          shafts={draft.shafts}
          treadles={draft.treadles}
          onClose={() => setDialog(null)}
          onCreate={({ liftplan, twill, ...size }) => {
            const colours = patternColours() ?? undefined
            const sized = resizeDraft(twill ? starterDraft(colours) : emptyDraft(colours), size)
            // Resizing makes twill grids for the new shafts; an empty start clears them.
            const d = twill
              ? sized
              : {
                  ...sized,
                  threading: sized.threading.map(() => -1),
                  tieup: sized.tieup.map((r) => r.map(() => false)),
                  treadling: sized.treadling.map((r) => r.map(() => false)),
                }
            // Not open(), which keeps to the loom type chosen before: this pattern brings its own.
            const next = liftplan ? toLiftplan(d) : d
            drawing(next, () => {
              setView({ noTieup: liftplan })
              startPattern(next)
              setName(null)
              setDialog(null)
              setToast(
                `New pattern: ${size.shafts} shafts, ${liftplan ? 'lift plan' : `${size.treadles} treadles`}, ${size.ends} × ${size.picks}`,
              )
            })
          }}
        />
        <LoadDialog
          open={dialog === 'load'}
          presets
          onClose={() => setDialog(null)}
          onLoad={(p) => open(p.draft, p.name, `Loaded "${p.name}"`)}
          onRenamed={(from, to) => setName((cur) => (cur === from ? to : cur))}
        />
        <ImportDialog
          open={dialog === 'import'}
          onClose={() => setDialog(null)}
          onImport={(n, d, warnings) => open(d, n, [`Imported "${n}" — use Save to keep it`, ...warnings].join('. '))}
        />
        {seen.has('tools') && (
          <Suspense fallback={<LoomLoader />}>
            <ToolsDialog
              open={dialog === 'tools'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
              clip={clip}
              onCopy={setClip}
              selected={toolsRange}
            />
          </Suspense>
        )}
        {seen.has('blocks') && (
          <Suspense fallback={<LoomLoader />}>
            <BlocksDialog
              open={dialog === 'blocks'}
              draft={draft}
              focus={blockFocus}
              store={blockStore}
              onStore={setBlockStore}
              onChange={(fn, key) => update((d) => keepLiftplan(fn(d)), key ? { key } : {})}
              onMessage={setToast}
              onClose={() => setDialog(null)}
            />
          </Suspense>
        )}
        {seen.has('colors') && (
          <Suspense fallback={<LoomLoader />}>
            <ColorsDialog
              open={dialog === 'colors'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
            />
          </Suspense>
        )}
        <PrintDialog
          open={dialog === 'print'}
          link={link}
          onClose={() => setDialog(null)}
          onPrint={async (options) => {
            setDialog(null)
            const qr = options.qr ? (link ?? (await patternUrl(name ?? 'Shared pattern', draft))) : null
            // Draw the sheet before the browser's print takes its picture of the page.
            flushSync(() => {
              if (qr) setLink(qr)
              setPrinting({ ...options, qr: qr !== null })
            })
            window.print()
          }}
        />
        {seen.has('share') && (
          <Suspense fallback={<LoomLoader />}>
            <ShareDialog
              open={dialog === 'share'}
              app="weave"
              title={name ?? 'My weaving draft'}
              link={() => patternUrl(name ?? 'Shared pattern', draft)}
              design={clothPainter(draft, {
                side: view.clothSide,
                endOneRight: view.endOneRight,
                pickOneBottom: view.pickOneBottom,
              })}
              onClose={() => setDialog(null)}
              onToast={setToast}
            />
          </Suspense>
        )}
        {seen.has('calculator') && (
          <Suspense fallback={<LoomLoader />}>
            <CalculatorDialog
              open={dialog === 'calculator'}
              draft={draft}
              yarns={yarns}
              onClose={() => setDialog(null)}
            />
          </Suspense>
        )}
        {seen.has('yarns') && (
          <Suspense fallback={<LoomLoader />}>
            <YarnsDialog
              open={dialog === 'yarns'}
              draft={draft}
              yarns={yarns}
              onChange={setYarns}
              onClose={() => setDialog(null)}
            />
          </Suspense>
        )}
        {seen.has('report') && (
          <Suspense fallback={<LoomLoader />}>
            <ClothReportDialog open={dialog === 'report'} draft={draft} onClose={() => setDialog(null)} />
          </Suspense>
        )}
        {seen.has('rigid') && (
          <Suspense fallback={<LoomLoader />}>
            <RigidHeddleDialog open={dialog === 'rigid'} draft={draft} onClose={() => setDialog(null)} />
          </Suspense>
        )}
        {dialog === 'drawloom' && (
          <Suspense fallback={<LoomLoader />}>
            <DrawloomDialog open onClose={() => setDialog(null)} onApply={applyFromDialog} />
          </Suspense>
        )}
        {dialog === 'paper' && (
          <Suspense fallback={<LoomLoader />}>
            <PaperDialog
              open
              draft={draft}
              name={name}
              onClose={() => setDialog(null)}
              onOpen={(d, n, message) => open(d, n, `${message}. Use Save to keep it.`)}
            />
          </Suspense>
        )}
        {dialog === 'tablet' && (
          <Suspense fallback={<LoomLoader />}>
            <TabletDialog open onClose={() => setDialog(null)} />
          </Suspense>
        )}
        {seen.has('echo') && (
          <Suspense fallback={<LoomLoader />}>
            <EchoDialog open={dialog === 'echo'} onClose={() => setDialog(null)} onApply={applyFromDialog} />
          </Suspense>
        )}
        {seen.has('picture') && (
          <Suspense fallback={<LoomLoader />}>
            <PictureDialog open={dialog === 'picture'} onClose={() => setDialog(null)} onApply={applyFromDialog} />
          </Suspense>
        )}
        {seen.has('warpplan') && (
          <Suspense fallback={<LoomLoader />}>
            <WarpPlanDialog open={dialog === 'warpplan'} draft={draft} yarns={yarns} onClose={() => setDialog(null)} />
          </Suspense>
        )}
        {seen.has('colorways') && (
          <Suspense fallback={<LoomLoader />}>
            <ColorwaysDialog
              open={dialog === 'colorways'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
            />
          </Suspense>
        )}
        {seen.has('variations') && (
          <Suspense fallback={<LoomLoader />}>
            <VariationsDialog
              open={dialog === 'variations'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
            />
          </Suspense>
        )}
        {seen.has('transform') && (
          <Suspense fallback={<LoomLoader />}>
            <TransformDialog
              open={dialog === 'transform'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
            />
          </Suspense>
        )}
        {seen.has('doublecloth') && (
          <Suspense fallback={<LoomLoader />}>
            <DoubleClothDialog
              open={dialog === 'doublecloth'}
              onClose={() => setDialog(null)}
              onApply={(d, message) => {
                applyFromDialog(d, `${message}; showing the face of the cloth`)
                setView({ clothSide: 'face' })
              }}
            />
          </Suspense>
        )}
        {seen.has('profile') && (
          <Suspense fallback={<LoomLoader />}>
            <ProfileDialog
              open={dialog === 'profile'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
            />
          </Suspense>
        )}
        {seen.has('weave') && (
          <Suspense fallback={<LoomLoader />}>
            <WeavingMode
              open={dialog === 'weave'}
              name={name ?? 'Unsaved pattern'}
              draft={draft}
              onClose={() => setDialog(null)}
            />
          </Suspense>
        )}
        {dialog === '3d' && (
          <Suspense fallback={<LoomLoader label="Setting up the 3D view…" />}>
            <Fabric3DDialog open name={name} draft={draft} yarns={yarns} onClose={() => setDialog(null)} />
          </Suspense>
        )}
        <Snackbar
          open={toast !== null}
          autoHideDuration={toast && toast.length > 60 ? 8000 : 3000}
          // Not on a click elsewhere: that click may be what just set a new message.
          onClose={(_, reason) => reason !== 'clickaway' && setToast(null)}
          message={toast}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          // Above the phone's bottom navigation.
          sx={phone ? { bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' } : undefined}
        />
        <HelpCenter
          open={help.open}
          app="Weave Patterner"
          topics={WEAVE_HELP}
          topic={help.topic}
          onClose={() => setHelp((h) => ({ ...h, open: false }))}
          onTour={startTour}
        />
        <Tour open={touring} steps={WEAVE_TOUR} onClose={() => setTouring(false)} />
        {offerTour && !(GA_ID && consent === null) && dialog === null && !help.open && !touring && (
          <TourOffer
            app="Weave Patterner"
            text="Take a one-minute tour of how a weaving draft works and where everything is."
            onStart={startTour}
            onDismiss={() => {
              markTourSeen('weave')
              setOfferTour(false)
            }}
          />
        )}
        <MoveNotice />
        {GA_ID && consent === null && (
          <ConsentBanner
            onChoose={(allow) => {
              setConsent(allow ? 'granted' : 'denied')
              // No message after "No thanks": the banner going away says enough to a visitor who's just arrived.
              if (allow) setToast('Thanks: analytics is on')
            }}
          />
        )}
      </Box>
      {loader}
      {printing && (
        <PrintSheet
          name={name ?? 'Untitled pattern'}
          draft={draft}
          endOneRight={view.endOneRight}
          pickOneBottom={view.pickOneBottom}
          clothSide={view.clothSide}
          cloth={printing.cloth}
          instructions={printing.instructions}
          noTieup={view.noTieup}
          qr={printing.qr ? link : null}
        />
      )}
    </>
  )
}
