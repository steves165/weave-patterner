import { Box, Snackbar } from '@mui/material'
import { lazy, Suspense, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { AppToolbar } from './components/AppToolbar'
import { DraftView } from './components/DraftView'
import { Footer } from './components/Footer'
import { PrintSheet } from './components/PrintSheet'
import { SettingsPanel } from './components/SettingsPanel'
import { loadCurrent } from './current'
import { CalculatorDialog } from './dialogs/CalculatorDialog'
import { ClothDialog } from './dialogs/ClothDialog'
import { ColorsDialog } from './dialogs/ColorsDialog'
import { ColorwaysDialog } from './dialogs/ColorwaysDialog'
import { DoubleClothDialog } from './dialogs/DoubleClothDialog'
import { EchoDialog } from './dialogs/EchoDialog'
import { ImportDialog } from './dialogs/ImportDialog'
import { LoadDialog } from './dialogs/LoadDialog'
import { PictureDialog } from './dialogs/PictureDialog'
import { ProfileDialog } from './dialogs/ProfileDialog'
import { SaveDialog } from './dialogs/SaveDialog'
import { ToolsDialog } from './dialogs/ToolsDialog'
import { TransformDialog } from './dialogs/TransformDialog'
import { VariationsDialog } from './dialogs/VariationsDialog'
import { WarpPlanDialog } from './dialogs/WarpPlanDialog'
import { WeavingMode } from './dialogs/WeavingMode'
import { findRepeat } from './repeat'

// three.js is large, so the 3D preview loads only when it's first opened.
const Fabric3DDialog = lazy(() => import('./dialogs/Fabric3DDialog'))

import { YarnsDialog } from './dialogs/YarnsDialog'
import { download, exportDraft, fileBase } from './exportDraft'
import { longestFloats, longFloatMask, unwovenThreads } from './floats'
import { useDraftHistory } from './hooks/useDraftHistory'
import { useRememberCurrent } from './hooks/useRememberCurrent'
import { useSharedPatternLink } from './hooks/useSharedPatternLink'
import { useViewOptions } from './hooks/useViewOptions'
import { useYarns } from './hooks/useYarns'
import { draftPng, draftSvg } from './imageExport'
import { useCompact, usePhone, useTouch } from './layout'
import { isDirectTieup, toLiftplan, toTreadling } from './liftplan'
import { selvedgeMisses } from './selvedge'
import { type Clip, trompAsWrit } from './tools'
import { computeDrawdown, type Draft, defaultDraft, resizeDraft } from './weave'

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
  | 'yarns'

export default function App() {
  const phone = usePhone()
  const compact = useCompact()
  const touch = useTouch()
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
  const [toast, setToast] = useState<string | null>(null)
  // Display settings (including cell size and float highlighting), remembered between visits.
  const [view, setView] = useViewOptions()
  const { cellSize, highlightFloats, floatLimit } = view
  const [yarns, setYarns] = useYarns()
  // Ends or picks copied in the sequence tools, kept until replaced.
  const [clip, setClip] = useState<Clip | null>(null)
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

  /** Applies a change made in a dialog as one undoable step, then closes it. */
  const applyFromDialog = (d: Draft, message: string) => {
    update(() => d)
    setDialog(null)
    setToast(`${message}. Undo with Ctrl+Z or the undo button.`)
  }

  /** Opens a different pattern as a new document. */
  const open = (d: Draft, n: string | null, message?: string) => {
    reset(d)
    setName(n)
    setDialog(null)
    if (message) setToast(message)
  }
  useSharedPatternLink((n, d) => open(d, n, `Opened "${n}" from link — use Save to keep it`), setToast)

  return (
    <>
      <Box className="screen-only" sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
        <AppToolbar
          name={name}
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
              setToast(`Converted to tie-up and treadling with ${next.treadles} treadles`)
            } catch (e) {
              setToast(e instanceof Error ? e.message : String(e))
            }
          }}
        />

        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          <SettingsPanel
            draft={draft}
            name={name}
            compact={compact}
            touch={touch}
            onResize={(dim, n) => update((d) => resizeDraft(d, { [dim]: n }))}
            cellSize={cellSize}
            onCellSize={(n) => setView({ cellSize: n })}
            onFillWarp={(c) => update((d) => ({ ...d, warpColors: d.warpColors.map(() => c) }))}
            onFillWeft={(c) => update((d) => ({ ...d, weftColors: d.weftColors.map(() => c) }))}
            floats={floats}
            unwoven={unwoven}
            selvedge={selvedge}
            repeat={repeat}
            onTrimToRepeat={() => update((d) => resizeDraft(d, { ends: repeat.ends, picks: repeat.picks }))}
            highlightFloats={highlightFloats}
            onHighlightFloats={(on) => setView({ highlightFloats: on })}
            floatLimit={floatLimit}
            onFloatLimit={(n) => setView({ floatLimit: n })}
            view={view}
            onView={setView}
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
            onNew={() => open(defaultDraft(), null)}
          />

          <DraftView
            draft={draft}
            onView={setView}
            drawdown={drawdown}
            floatMask={floatMask}
            cellSize={cellSize}
            view={view}
            touchPaint={touchPaint}
            onThreading={(shaft, end, value, continuing) =>
              update(
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
            onTreadling={(pick, t, value, continuing) =>
              update(
                (d) => ({
                  ...d,
                  treadling: d.treadling.map((r, p) => (p === pick ? r.map((v, i) => (i === t ? value : v)) : r)),
                }),
                { merge: continuing },
              )
            }
            onWarpColor={(i, c) =>
              update((d) => ({ ...d, warpColors: d.warpColors.map((v, j) => (j === i ? c : v)) }), { key: `warp:${i}` })
            }
            onWeftColor={(i, c) =>
              update((d) => ({ ...d, weftColors: d.weftColors.map((v, j) => (j === i ? c : v)) }), { key: `weft:${i}` })
            }
          />
        </Box>

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
        <ToolsDialog
          open={dialog === 'tools'}
          draft={draft}
          onClose={() => setDialog(null)}
          onApply={applyFromDialog}
          clip={clip}
          onCopy={setClip}
        />
        <ColorsDialog
          open={dialog === 'colors'}
          draft={draft}
          onClose={() => setDialog(null)}
          onApply={applyFromDialog}
        />
        <CalculatorDialog open={dialog === 'calculator'} draft={draft} yarns={yarns} onClose={() => setDialog(null)} />
        <YarnsDialog
          open={dialog === 'yarns'}
          draft={draft}
          yarns={yarns}
          onChange={setYarns}
          onClose={() => setDialog(null)}
        />
        <ClothDialog
          open={dialog === 'cloth'}
          draft={draft}
          onClose={() => setDialog(null)}
          onApply={applyFromDialog}
        />
        <EchoDialog open={dialog === 'echo'} onClose={() => setDialog(null)} onApply={applyFromDialog} />
        <PictureDialog open={dialog === 'picture'} onClose={() => setDialog(null)} onApply={applyFromDialog} />
        <WarpPlanDialog open={dialog === 'warpplan'} draft={draft} yarns={yarns} onClose={() => setDialog(null)} />
        <ColorwaysDialog
          open={dialog === 'colorways'}
          draft={draft}
          onClose={() => setDialog(null)}
          onApply={applyFromDialog}
        />
        <VariationsDialog
          open={dialog === 'variations'}
          draft={draft}
          onClose={() => setDialog(null)}
          onApply={applyFromDialog}
        />
        <TransformDialog
          open={dialog === 'transform'}
          draft={draft}
          onClose={() => setDialog(null)}
          onApply={applyFromDialog}
        />
        <DoubleClothDialog
          open={dialog === 'doublecloth'}
          onClose={() => setDialog(null)}
          onApply={(d, message) => {
            applyFromDialog(d, `${message}; showing the face of the cloth`)
            setView({ clothSide: 'face' })
          }}
        />
        <ProfileDialog
          open={dialog === 'profile'}
          draft={draft}
          onClose={() => setDialog(null)}
          onApply={applyFromDialog}
        />
        <WeavingMode
          open={dialog === 'weave'}
          name={name ?? 'Unsaved pattern'}
          draft={draft}
          onClose={() => setDialog(null)}
        />
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
        />
        <Footer />
      </Box>
      <PrintSheet
        name={name ?? 'Untitled pattern'}
        draft={draft}
        endOneRight={view.endOneRight}
        instructions={printInstructions}
      />
    </>
  )
}
