import { Box, Snackbar } from '@mui/material'
import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { AppToolbar } from './components/AppToolbar'
import { DraftView } from './components/DraftView'
import { Footer } from './components/Footer'
import { PrintSheet } from './components/PrintSheet'
import { CELL_DEFAULT, SettingsPanel } from './components/SettingsPanel'
import { CalculatorDialog } from './dialogs/CalculatorDialog'
import { ClothDialog } from './dialogs/ClothDialog'
import { ColorsDialog } from './dialogs/ColorsDialog'
import { ImportDialog } from './dialogs/ImportDialog'
import { LoadDialog } from './dialogs/LoadDialog'
import { ProfileDialog } from './dialogs/ProfileDialog'
import { SaveDialog } from './dialogs/SaveDialog'
import { ToolsDialog } from './dialogs/ToolsDialog'
import { WeavingMode } from './dialogs/WeavingMode'
import { YarnsDialog } from './dialogs/YarnsDialog'
import { download, exportDraft, fileBase } from './exportDraft'
import { longestFloats, longFloatMask } from './floats'
import { useDraftHistory } from './hooks/useDraftHistory'
import { useSharedPatternLink } from './hooks/useSharedPatternLink'
import { useViewOptions } from './hooks/useViewOptions'
import { useYarns } from './hooks/useYarns'
import { draftPng, draftSvg } from './imageExport'
import { useCompact, usePhone, useTouch } from './layout'
import { isDirectTieup, toLiftplan, toTreadling } from './liftplan'
import { type Clip, trompAsWrit } from './tools'
import { computeDrawdown, type Draft, defaultDraft, resizeDraft } from './weave'

type DialogName =
  | 'save'
  | 'load'
  | 'import'
  | 'tools'
  | 'calculator'
  | 'weave'
  | 'colors'
  | 'cloth'
  | 'profile'
  | 'yarns'

export default function App() {
  const phone = usePhone()
  const compact = useCompact()
  const touch = useTouch()
  const { draft, baseline, update, reset, undo, redo, canUndo, canRedo, markBaseline } = useDraftHistory(defaultDraft)
  const [name, setName] = useState<string | null>(null)
  const [cellSize, setCellSize] = useState(CELL_DEFAULT)
  // Touch only: when on, a finger drag-paints the grids instead of scrolling.
  const [touchPaint, setTouchPaint] = useState(false)
  const [highlightFloats, setHighlightFloats] = useState(false)
  const [floatLimit, setFloatLimit] = useState(7)
  const [dialog, setDialog] = useState<DialogName | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [view, setView] = useViewOptions()
  const [yarns, setYarns] = useYarns()
  // Ends or picks copied in the sequence tools, kept until replaced.
  const [clip, setClip] = useState<Clip | null>(null)
  // Whether the next print includes the written-instructions page.
  const [printInstructions, setPrintInstructions] = useState(false)

  const drawdown = useMemo(() => computeDrawdown(draft), [draft])
  const floats = useMemo(() => longestFloats(draft, drawdown), [draft, drawdown])
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
            onCellSize={setCellSize}
            onFillWarp={(c) => update((d) => ({ ...d, warpColors: d.warpColors.map(() => c) }))}
            onFillWeft={(c) => update((d) => ({ ...d, weftColors: d.weftColors.map(() => c) }))}
            floats={floats}
            highlightFloats={highlightFloats}
            onHighlightFloats={setHighlightFloats}
            floatLimit={floatLimit}
            onFloatLimit={setFloatLimit}
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
