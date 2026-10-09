import { Box, Snackbar } from '@mui/material'
import { type ComponentType, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { type Consent, GA_ID, loadConsent, saveConsent, startAnalytics, stopAnalytics, track } from './analytics'
import { AppToolbar } from './components/AppToolbar'
import { ConsentBanner } from './components/ConsentBanner'
import { DraftView } from './components/DraftView'
import { FooterLinks } from './components/FooterLinks'
import { PrintSheet } from './components/PrintSheet'
import { SettingsSheet, SettingsSidebar } from './components/SettingsFrame'
import { SettingsPanel } from './components/SettingsPanel'
import { StatusBar } from './components/StatusBar'
import { loadCurrent } from './current'
import { ImportDialog } from './dialogs/ImportDialog'
import { LoadDialog } from './dialogs/LoadDialog'
import { SaveDialog } from './dialogs/SaveDialog'
import { HelpCenter } from './help/HelpCenter'
import { markTourSeen, Tour, TourOffer, tourSeen } from './help/Tour'
import { WEAVE_TOUR } from './help/tours'
import { useHelpKeys } from './help/useHelpKeys'
import { WEAVE_HELP } from './help/weaveHelp'
import { findRepeat } from './repeat'

// three.js is large, so the 3D preview loads only when it's first opened.
const Fabric3DDialog = lazy(() => import('./dialogs/Fabric3DDialog'))
const TabletDialog = lazy(() => import('./dialogs/TabletDialog'))
const DrawloomDialog = lazy(() => import('./dialogs/DrawloomDialog'))

/** A dialog loaded the first time it's needed, keeping the main download small. */
// biome-ignore lint/suspicious/noExplicitAny: React.lazy takes any component; each dialog keeps its own prop types
function lazyDialog<K extends string, C extends ComponentType<any>>(load: () => Promise<{ [k in K]: C }>, name: K) {
  return lazy(async () => ({ default: (await load())[name] }))
}
const BlocksDialog = lazyDialog(() => import('./dialogs/BlocksDialog'), 'BlocksDialog')
const CalculatorDialog = lazyDialog(() => import('./dialogs/CalculatorDialog'), 'CalculatorDialog')
const ClothDialog = lazyDialog(() => import('./dialogs/ClothDialog'), 'ClothDialog')
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
import { download, exportDraft, fileBase } from './exportDraft'
import { longestFloats, longFloatMask, unwovenThreads } from './floats'
import { useDraftHistory } from './hooks/useDraftHistory'
import { useRememberCurrent } from './hooks/useRememberCurrent'
import { useSharedPatternLink } from './hooks/useSharedPatternLink'
import { useViewOptions } from './hooks/useViewOptions'
import { useYarns } from './hooks/useYarns'
import { draftPng, draftSvg } from './imageExport'
import { useCompact, usePhone, useRoomForSidebar, useTouch, useViewportWidth } from './layout'
import { isDirectTieup, toLiftplan, toTreadling } from './liftplan'
import { selvedgeMisses } from './selvedge'
import { patternUrl } from './share'
import { type Clip, drawAlong, type Target, trompAsWrit } from './tools'
import { computeDrawdown, type Draft, defaultDraft, emptyDraft, resizeDraft } from './weave'

type DialogName =
  | 'save'
  | 'load'
  | 'import'
  | 'tools'
  | 'calculator'
  | 'weave'
  | '3d'
  | 'colors'
  | 'cloth'
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
  | 'drawloom'
  | 'yarns'
  | 'blocks'

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
    () => restored?.draft ?? defaultDraft(),
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
  // Ends or picks copied in the sequence tools, kept until replaced.
  const [clip, setClip] = useState<Clip | null>(null)
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
  const [printInstructions, setPrintInstructions] = useState(false)

  const drawdown = useMemo(() => computeDrawdown(draft), [draft])
  const floats = useMemo(() => longestFloats(draft, drawdown), [draft, drawdown])
  const unwoven = useMemo(() => unwovenThreads(draft, drawdown), [draft, drawdown])
  const repeat = useMemo(() => findRepeat(draft, drawdown), [draft, drawdown])
  const selvedge = useMemo(() => selvedgeMisses(draft, 'left', drawdown), [draft, drawdown])
  const floatMask = useMemo(
    () => (highlightFloats ? longFloatMask(draft, floatLimit, drawdown) : null),
    [highlightFloats, draft, floatLimit, drawdown],
  )

  /** Without a tie-up, every draft is kept as a lift plan (shafts lifted on each pick). */
  const keepLiftplan = (d: Draft) => (view.noTieup && !isDirectTieup(d) ? toLiftplan(d) : d)
  const changeView = (patch: Partial<typeof view>) => {
    setView(patch)
    if (patch.noTieup && !isDirectTieup(draft)) {
      update(toLiftplan)
      setToast('No tie-up: the right-hand grid is now a lift plan, marking the shafts to lift on each pick')
    }
  }

  /**
   * Straight and point drawing: pressing a threading (or treadling) box starts a draw there, and dragging along the
   * ends (or picks) fills them in, climbing if the drag goes up the shafts (treadles) and descending if it goes down.
   * The whole drag is one undo step, redrawn from the draft as it was when the drag began.
   */
  const stroke = useRef<{ base: Draft; from: number; start: number; direction: 1 | -1 } | null>(null)
  const drawStroke = (target: Target, index: number, position: number, continuing: boolean) => {
    if (view.drawTool === 'click') return
    if (!continuing || !stroke.current) stroke.current = { base: draft, from: index, start: position, direction: 1 }
    const s = stroke.current
    if (position !== s.start) s.direction = position > s.start ? 1 : -1
    const tool = view.drawTool
    update(() => drawAlong(s.base, target, tool, s.from, index, s.start, s.direction), { merge: continuing })
  }

  /** Applies a change made in a dialog as one undoable step, then closes it. */
  const applyFromDialog = (d: Draft, message: string) => {
    update(() => keepLiftplan(d))
    setDialog(null)
    setToast(`${message}. Undo with Ctrl+Z or the undo button.`)
  }

  /** Opens a different pattern as a new document. */
  const open = (d: Draft, n: string | null, message?: string) => {
    reset(keepLiftplan(d))
    setName(n)
    setDialog(null)
    if (message) setToast(message)
  }
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
      repeat={repeat}
      onTrimToRepeat={() => update((d) => resizeDraft(d, { ends: repeat.ends, picks: repeat.picks }))}
      highlightFloats={highlightFloats}
      onHighlightFloats={(on) => setView({ highlightFloats: on })}
      floatLimit={floatLimit}
      onFloatLimit={(n) => setView({ floatLimit: n })}
      view={view}
      onView={changeView}
      onClear={() =>
        update((d) => ({
          ...d,
          threading: d.threading.map(() => -1),
          tieup: d.tieup.map((r) => r.map(() => false)),
          treadling: d.treadling.map((r) => r.map(() => false)),
        }))
      }
      canReset={draft !== baseline}
      onReset={() => update(() => baseline)}
      onNew={() => open(emptyDraft(), null, 'New pattern: empty grids, ready to design')}
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
          pb: phone ? 'calc(70px + env(safe-area-inset-bottom, 0px))' : 0,
        }}
      >
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
          onSave={() => setDialog('save')}
          onLoad={() => setDialog('load')}
          onExport={(format) => {
            const { fileName, content, type } = exportDraft(name, draft, format)
            track('export', { format })
            download(fileName, content, type)
            setToast(`Exported ${fileName}`)
          }}
          onExportImage={(format) => {
            const fileName = `${fileBase(name)}.${format}`
            const done = () => setToast(`Exported ${fileName}`)
            const fail = (e: unknown) => setToast(`Couldn't export the image: ${e instanceof Error ? e.message : e}`)
            if (format === 'svg') {
              try {
                download(fileName, draftSvg(1), 'image/svg+xml')
                done()
              } catch (e) {
                fail(e)
              }
            } else
              draftPng(2)
                .then((png) => {
                  download(fileName, png, 'image/png')
                  done()
                })
                .catch(fail)
          }}
          onImport={() => setDialog('import')}
          onHelp={() => openHelp(null)}
          onShareLink={() => {
            patternUrl(name ?? 'Shared pattern', draft)
              .then((url) => navigator.clipboard.writeText(url).then(() => url))
              .then(() => setToast('Link copied: anyone with it can open this pattern'))
              .catch(() => setToast("Couldn't copy the link here. Export the pattern file to share it instead."))
          }}
          onPrint={(instructions) => {
            // Render the print sheet with or without instructions before the print dialog snapshots the page.
            flushSync(() => setPrintInstructions(instructions))
            window.print()
          }}
          onWeave={() => setDialog('weave')}
          on3d={() => setDialog('3d')}
          onSequenceTools={() => setDialog('tools')}
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
          onCloth={() => setDialog('cloth')}
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
          onDrawloom={() => setDialog('drawloom')}
          onYarns={() => setDialog('yarns')}
          isLiftplan={isDirectTieup(draft)}
          onToLiftplan={() => {
            update(toLiftplan)
            setToast('Converted to a lift plan: the right-hand grid now shows the shafts lifted on each pick')
          }}
          onToTreadling={() => {
            try {
              const next = toTreadling(draft)
              update(() => next)
              // A tie-up and treadling needs the tie-up shown.
              setView({ noTieup: false })
              setToast(`Converted to tie-up and treadling with ${next.treadles} treadles`)
            } catch (e) {
              setToast(e instanceof Error ? e.message : String(e))
            }
          }}
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
          <Box component="main" sx={pageScroll ? { flex: '1 0 auto' } : { flex: '1 1 auto', minWidth: 0 }}>
            <DraftView
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
                if (view.drawTool !== 'click') stroke.current = { base: draft, from: pick, start: t, direction: 1 }
                update(
                  (d) => ({
                    ...d,
                    treadling: d.treadling.map((r, p) => (p === pick ? r.map((v, i) => (i === t ? value : v)) : r)),
                  }),
                  { merge: continuing },
                )
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
                  other={{ href: './knit/', label: 'Knit Patterner' }}
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
        <LoadDialog
          open={dialog === 'load'}
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
          <Suspense fallback={null}>
            <ToolsDialog
              open={dialog === 'tools'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
              clip={clip}
              onCopy={setClip}
            />
          </Suspense>
        )}
        {seen.has('blocks') && (
          <Suspense fallback={null}>
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
          <Suspense fallback={null}>
            <ColorsDialog
              open={dialog === 'colors'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
            />
          </Suspense>
        )}
        {seen.has('calculator') && (
          <Suspense fallback={null}>
            <CalculatorDialog
              open={dialog === 'calculator'}
              draft={draft}
              yarns={yarns}
              onClose={() => setDialog(null)}
            />
          </Suspense>
        )}
        {seen.has('yarns') && (
          <Suspense fallback={null}>
            <YarnsDialog
              open={dialog === 'yarns'}
              draft={draft}
              yarns={yarns}
              onChange={setYarns}
              onClose={() => setDialog(null)}
            />
          </Suspense>
        )}
        {seen.has('cloth') && (
          <Suspense fallback={null}>
            <ClothDialog
              open={dialog === 'cloth'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
            />
          </Suspense>
        )}
        {seen.has('report') && (
          <Suspense fallback={null}>
            <ClothReportDialog open={dialog === 'report'} draft={draft} onClose={() => setDialog(null)} />
          </Suspense>
        )}
        {seen.has('rigid') && (
          <Suspense fallback={null}>
            <RigidHeddleDialog open={dialog === 'rigid'} draft={draft} onClose={() => setDialog(null)} />
          </Suspense>
        )}
        {dialog === 'drawloom' && (
          <Suspense fallback={null}>
            <DrawloomDialog open onClose={() => setDialog(null)} onApply={applyFromDialog} />
          </Suspense>
        )}
        {dialog === 'tablet' && (
          <Suspense fallback={null}>
            <TabletDialog open onClose={() => setDialog(null)} />
          </Suspense>
        )}
        {seen.has('echo') && (
          <Suspense fallback={null}>
            <EchoDialog open={dialog === 'echo'} onClose={() => setDialog(null)} onApply={applyFromDialog} />
          </Suspense>
        )}
        {seen.has('picture') && (
          <Suspense fallback={null}>
            <PictureDialog open={dialog === 'picture'} onClose={() => setDialog(null)} onApply={applyFromDialog} />
          </Suspense>
        )}
        {seen.has('warpplan') && (
          <Suspense fallback={null}>
            <WarpPlanDialog open={dialog === 'warpplan'} draft={draft} yarns={yarns} onClose={() => setDialog(null)} />
          </Suspense>
        )}
        {seen.has('colorways') && (
          <Suspense fallback={null}>
            <ColorwaysDialog
              open={dialog === 'colorways'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
            />
          </Suspense>
        )}
        {seen.has('variations') && (
          <Suspense fallback={null}>
            <VariationsDialog
              open={dialog === 'variations'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
            />
          </Suspense>
        )}
        {seen.has('transform') && (
          <Suspense fallback={null}>
            <TransformDialog
              open={dialog === 'transform'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
            />
          </Suspense>
        )}
        {seen.has('doublecloth') && (
          <Suspense fallback={null}>
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
          <Suspense fallback={null}>
            <ProfileDialog
              open={dialog === 'profile'}
              draft={draft}
              onClose={() => setDialog(null)}
              onApply={applyFromDialog}
            />
          </Suspense>
        )}
        {seen.has('weave') && (
          <Suspense fallback={null}>
            <WeavingMode
              open={dialog === 'weave'}
              name={name ?? 'Unsaved pattern'}
              draft={draft}
              onClose={() => setDialog(null)}
            />
          </Suspense>
        )}
        {dialog === '3d' && (
          <Suspense fallback={null}>
            <Fabric3DDialog open name={name} draft={draft} yarns={yarns} onClose={() => setDialog(null)} />
          </Suspense>
        )}
        <Snackbar
          open={toast !== null}
          autoHideDuration={toast && toast.length > 60 ? 8000 : 3000}
          onClose={() => setToast(null)}
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
        {GA_ID && consent === null && (
          <ConsentBanner
            onChoose={(allow) => {
              setConsent(allow ? 'granted' : 'denied')
              setToast(allow ? 'Thanks: analytics is on' : 'Analytics is off. Change it any time from the footer.')
            }}
          />
        )}
      </Box>
      <PrintSheet
        name={name ?? 'Untitled pattern'}
        draft={draft}
        endOneRight={view.endOneRight}
        instructions={printInstructions}
        noTieup={view.noTieup}
      />
    </>
  )
}
