import { STITCH_IDS, STITCHES } from '../knit/stitches'
import type { Topic } from './types'

/** Every stitch: its name, chart symbol, what to do on each side and what it means. */
const stitchTerms: [string, string][] = STITCH_IDS.map((id) => {
  const s = STITCHES[id]
  const symbol = s.cable ? 'a crossing drawn over its squares' : s.symbol ? `symbol ${s.symbol}` : 'an empty square'
  return [s.name, `${s.explain} (On the chart: ${id === 'none' ? 'a grey square' : symbol}.)`]
})

/** Knit Patterner's help: a guide to each part of the app, the stitches, the shortcuts and a glossary. */
export const KNIT_HELP: Topic[] = [
  {
    id: 'start',
    title: 'Getting started',
    summary: 'Design a chart, and get the written pattern with it',
    keywords: ['begin', 'new', 'basics', 'introduction', 'how to'],
    body: [
      {
        p: 'Knit Patterner is a knitting chart designer. Each square of the chart is one stitch; you paint stitches and colours on it, and the app writes the pattern out row by row, checks the stitch counts and shows what the knitting will look like.',
      },
      { h: 'Your first chart' },
      {
        steps: [
          'Choose **New** for a blank chart, or **Samples** to start from rib, seed stitch, a cable, lace or Fair Isle.',
          'Set the chart’s stitches and rows, and flat or in the round, in the **Pattern settings** sidebar.',
          'Pick a stitch (or colour) in the palette above the chart, then click or drag across squares to paint it.',
          'Read the **Written pattern** as it updates, and check the **status bar** at the bottom for stitch-count problems.',
          'See it as fabric in the **Knitted preview**, or in **3D** on a sweater or hat.',
          'Choose **Save** to keep it in this browser, **Start knitting** to follow it row by row, or **Export** a PDF booklet.',
        ],
      },
      {
        tip: 'Press **F1** at any time for help with the part you are working on, or take [[tour|the tour]] for a one-minute walk round the screen.',
      },
    ],
  },
  {
    id: 'reading',
    title: 'Reading a chart',
    summary: 'Which way the rows go, and what the numbers mean',
    keywords: ['rows', 'rounds', 'right side', 'wrong side', 'rs', 'ws', 'numbers', 'direction'],
    body: [
      {
        list: [
          'Row 1 is at the bottom; you knit upwards.',
          'Each square shows how the stitch looks from the **right side** (RS).',
          '**Flat**: right-side rows (odd numbers) are read from right to left; wrong-side rows (even) from left to right, working each stitch as its opposite: a knit square is purled on a wrong-side row.',
          '**In the round**: every round is read from right to left.',
          'Row numbers sit on the side each row starts from. Stitch numbers run along the bottom from the right.',
          'Heavier lines every 10 stitches help you count.',
        ],
      },
      { p: 'The [[written|written pattern]] does the reading for you, row by row.' },
    ],
  },
  {
    id: 'painting',
    title: 'Painting stitches and colours',
    summary: 'The palette, and how squares are painted',
    keywords: ['palette', 'paint', 'brush', 'stitch', 'colour', 'color', 'cables'],
    body: [
      {
        list: [
          'Pick a stitch in the **Stitches** palette (hover for its name), then click or drag across squares.',
          'Pick a colour (A, B, C…) to paint colours instead; the stitches stay as they are. Click a colour’s round swatch to change it, and **+** to add one.',
          'A cable fills as many squares as it crosses, starting at the square you click and going right.',
          'The grey **no stitch** square is a placeholder where stitches have been decreased away or not made yet.',
          'The label beside the palette says what you are painting with.',
        ],
      },
      {
        p: 'See [[stitches|the stitch reference]] for every stitch, and [[selecting|Selecting squares]] for copying, flipping and repeating.',
      },
    ],
  },
  {
    id: 'stitches',
    title: 'Stitch reference',
    summary: 'Every stitch, its symbol and how to work it',
    keywords: ['stitches', 'symbols', 'abbreviations', 'k2tog', 'ssk', 'yo', 'cable', 'bobble', 'nupp', 'short rows'],
    body: [{ terms: stitchTerms }],
  },
  {
    id: 'selecting',
    title: 'Selecting squares',
    summary: 'Copy, paste, flip, repeat, and add or delete rows and stitches',
    keywords: ['select', 'copy', 'paste', 'cut', 'flip', 'mirror', 'repeat', 'insert', 'delete', 'rows', 'columns'],
    body: [
      {
        p: 'Turn on **Select** (beside the palette) and drag across squares, or hold Shift and use the arrow keys. A bar of tools appears:',
      },
      {
        terms: [
          [
            'Copy, Cut, Paste',
            'Paste puts the copied squares with their bottom-left at the selection’s bottom-left. Ctrl+C, X and V work too.',
          ],
          ['Clear', 'Back to knit squares in colour A (or press Delete).'],
          ['Flip across', 'Mirror left to right; decreases and cables lean the other way.'],
          ['Flip up', 'Turn upside down.'],
          ['Repeat across / up', 'Repeat the squares across the whole row, or up the whole chart.'],
          ['Make a panel', 'Work the stitches as a chart of their own. See [[repeats|Repeats and panels]].'],
          ['Make the repeat', 'Outline the stitches in red as the pattern repeat.'],
          ['Row above / below', 'Add a row of knit stitches.'],
          ['Stitch left / right', 'Add a column of knit stitches.'],
          ['Delete rows / stitches', 'Take out the selected rows or stitches.'],
        ],
      },
      { p: 'Press Escape when you are done. Picking a stitch or colour goes back to painting.' },
    ],
  },
  {
    id: 'repeats',
    title: 'Repeats and panels',
    summary: 'The red repeat box, and panels worked as charts of their own',
    keywords: ['repeat', 'repeat box', 'panel', 'multiple', 'cast on', 'saved panel'],
    body: [
      { h: 'The repeat box' },
      {
        p: 'Select stitches and choose **Make the repeat** to outline them in red. The written pattern then repeats them (*…; rep from * to last N sts) with the stitches either side worked once, and the cast-on becomes "a multiple of N plus E".',
      },
      { h: 'Panels' },
      {
        p: 'Select stitches and choose **Make a panel** to work them as a chart of their own, such as a cable beside a lace edging. Panels are lettered A, B, C from stitch 1 and labelled above the chart. The rows then say "work Panel A", and each panel is written out over its own repeat.',
      },
      {
        list: [
          'Click a panel’s label (or **Panels…** in the settings) to name it, remove it, or save it to the panel store.',
          'Put a saved panel into any chart, at either edge or beside another panel.',
        ],
      },
    ],
  },
  {
    id: 'written',
    title: 'The written pattern',
    summary: 'How the rows are written, and copying them',
    keywords: ['written', 'instructions', 'rows', 'copy', 'text'],
    body: [
      {
        list: [
          'Runs of a stitch are counted (k3, sl2 wyib) and repeated groups bracketed ((yo, k1) 3 times).',
          'Each row’s repeat is found for you (*k2, p2; rep from * to end), or taken from the [[repeats|repeat box]].',
          'Colour letters (k2 B) are added in colourwork, and the stitch count when it changes.',
          'Rows changed by your last edit flash.',
          '**Copy** puts the whole pattern, with the key to abbreviations, on the clipboard.',
        ],
      },
      { p: 'To go the other way, **Import › Written pattern** reads pasted rows into a chart. See [[files|Files]].' },
    ],
  },
  {
    id: 'checks',
    title: 'Stitch counts and floats',
    summary: 'What the status bar at the bottom checks',
    keywords: ['problems', 'warnings', 'stitch count', 'floats', 'status'],
    body: [
      {
        list: [
          'Each row must work exactly the stitches the row below left. Decreases use 2 or 3 stitches; yarn overs and make-1s use none. Rows that don’t add up are flagged in red.',
          'Cables need all their squares, and are usually crossed on right-side rows.',
          'In stranded colourwork, floats longer than **Longest float** (settings) are flagged, with their length in cm.',
          'A cable cut by the edge of a panel is flagged.',
        ],
      },
    ],
  },
  {
    id: 'colourwork',
    title: 'Colourwork',
    summary: 'Stranded, intarsia, mosaic, and colours from a picture',
    keywords: ['fair isle', 'stranded', 'intarsia', 'mosaic', 'slip stitch', 'bobbins', 'picture'],
    body: [
      {
        terms: [
          ['Stranded', 'The colour not in use is carried behind the work. Floats longer than the limit are flagged.'],
          [
            'Intarsia',
            'Each area of colour has its own bobbin. Switch to **Intarsia** in the settings to count bobbins and see where to twist the yarns.',
          ],
          [
            'Mosaic',
            '**Make a mosaic…** turns a two-colour design into one colour per pair of rows, with the other slipped. Garter ridges or smooth stockinette.',
          ],
          [
            'From a picture',
            '**Colours from a picture** colours the chart from a photo or drawing, in the chart’s number of colours.',
          ],
        ],
      },
    ],
  },
  {
    id: 'sizing',
    title: 'Gauge, size and yarn',
    summary: 'Gauge, cast-on for a width, sizes, shaping and yarn amounts',
    keywords: [
      'gauge',
      'tension',
      'size',
      'cast on',
      'yarn',
      'metres',
      'balls',
      'sizes',
      'increase',
      'decrease',
      'evenly',
    ],
    body: [
      {
        list: [
          '**Gauge** (settings): stitches and rows to 10 cm. **Squares to gauge** draws the chart in its real proportions.',
          '**Size** panel: the chart’s size, and the cast-on for a finished width in whole repeats plus edge stitches.',
          '**Sizes and shaping**: add sizes with their width and length to get each one’s cast-on, rows and yarn, drawn as outlines; and spread increases or decreases evenly across a row.',
          '**Yarn needed**: metres and balls of each colour for a piece of the size you give, with 10% extra.',
        ],
      },
      { tip: 'Knit and measure a swatch: the gauge is the most important number in the pattern.' },
    ],
  },
  {
    id: 'knitting',
    title: 'Knitting mode',
    summary: 'Follow the chart a row at a time',
    keywords: ['start knitting', 'row counter', 'counter', 'progress', 'follow'],
    body: [
      {
        p: '**Start knitting** opens a full-screen view to keep beside you: the row you are on is outlined on the chart, with its instruction in large type, which way to read the chart, and the stitches you will have after it.',
      },
      {
        list: [
          'Press **Row done** (or Space, or the right arrow) after each row; **Back a row** if you need to.',
          'Past the last row it starts the chart again and counts the repeats.',
          'Your place is remembered for each pattern; **Start again** goes back to row 1.',
        ],
      },
    ],
  },
  {
    id: 'preview',
    title: 'Knitted preview and 3D',
    summary: 'See the fabric, flat or made up',
    keywords: [
      'preview',
      'fabric',
      '3d',
      'sweater',
      'hat',
      'coat',
      'skirt',
      'theme',
      'halloween',
      'christmas',
      'seasonal',
    ],
    body: [
      {
        list: [
          'The **Knitted preview** draws the fabric: knit Vs, purl bumps, eyelets, cables and colours. **Show repeats** repeats the chart across and up.',
          '**3D** shows the knitting made up as a sweater, hat, coat or skirt at its real size from the gauge. Drag to turn it; **Pattern size** enlarges the pattern.',
          '**Colour theme** (in View) gives the app seasonal colours in place of the teal: Halloween, Christmas, Winter, Spring, Summer or Autumn, or Halloween and Christmas only when it’s time. Your chart’s colours stay as they are.',
        ],
      },
    ],
  },
  {
    id: 'files',
    title: 'Saving, sharing and printing',
    summary: 'Save, load, import, export, booklets and printing',
    keywords: ['save', 'load', 'export', 'import', 'pdf', 'booklet', 'print', 'png', 'text', 'written'],
    body: [
      {
        list: [
          '**Save** keeps the chart in this browser, by name. **Load** opens, renames or deletes saved charts.',
          'The chart you are working on is kept automatically.',
          '**Import**: a chart file, or a **written pattern** you paste in (Row 1: k2, p2…).',
          '**Export**: a **pattern booklet (PDF)** with gauge, materials, the chart and key, and the written rows; the chart as a picture with its key; the written pattern as text; or a chart file to open again.',
          '**Print** prints the chart and the written pattern.',
        ],
      },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    summary: 'Keys that save time',
    keywords: ['keys', 'keyboard', 'shortcuts', 'undo', 'redo', 'f1', 'accessibility'],
    body: [
      {
        keys: [
          ['F1', 'Help with what you are working on.'],
          ['?', 'These shortcuts.'],
          ['Ctrl + Z', 'Undo (⌘ Z on a Mac).'],
          ['Ctrl + Shift + Z or Ctrl + Y', 'Redo.'],
          ['← → ↑ ↓', 'Move around the chart.'],
          ['Space or Enter', 'Paint the square you are on.'],
          ['Shift + ← → ↑ ↓', 'Select squares.'],
          ['Ctrl + C, X, V', 'Copy, cut and paste the selection.'],
          ['Delete', 'Clear the selection.'],
          ['Escape', 'Finish selecting; close a dialog.'],
        ],
      },
      { p: 'In knitting mode, Space and the arrow keys move between rows.' },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    summary: 'Using Knit Patterner with a keyboard, a screen reader or high contrast',
    keywords: ['accessibility', 'a11y', 'screen reader', 'keyboard', 'contrast', 'motion', 'zoom', 'blind'],
    body: [
      {
        p: 'Everything in Knit Patterner can be done from the keyboard, and it is tested with automated accessibility checks.',
      },
      {
        list: [
          '**Skip to the chart:** the first thing Tab reaches. Press Enter to jump past the toolbar.',
          '**The chart:** Tab to it, move with the arrow keys, and press Space to paint the square. Each square is read out with its row, stitch and colour.',
          '**Screen readers:** every control is named, and the checks at the bottom are read out when they change.',
          '**High contrast:** in a Windows contrast theme the pattern keeps its own colours, so it still shows, and focus is outlined in your highlight colour.',
          '**Less motion:** if your device is set to reduce motion, the animations are turned off.',
          '**Zoom:** the page reflows when zoomed in, and on narrow screens the settings move to a sheet.',
        ],
      },
      { p: 'See [[shortcuts|keyboard shortcuts]] for the keys, and [[phone|phones and tablets]] for touch screens.' },
    ],
  },
  {
    id: 'phone',
    title: 'On a phone or tablet',
    summary: 'Tapping, swiping and where things are',
    keywords: ['mobile', 'phone', 'tablet', 'touch', 'ipad'],
    body: [
      {
        list: [
          'Tap a square to paint it; swipe to move around the chart.',
          'On phones, the bar at the bottom has **Chart**, **Samples**, **Pattern** (the written rows), **3D** and **File**.',
          'The **Pattern settings** bar opens the settings in a sheet.',
        ],
      },
    ],
  },
  {
    id: 'glossary',
    title: 'Glossary',
    summary: 'Knitting words, explained',
    keywords: ['words', 'terms', 'definitions', 'meaning', 'abbreviations'],
    body: [
      {
        terms: [
          ['Cable', 'Stitches crossed over each other, worked with a cable needle.'],
          ['Cast on', 'The first row of stitches put on the needle.'],
          ['Chart', 'A grid where each square is a stitch, seen from the right side.'],
          ['Decrease', 'Working stitches together so there are fewer.'],
          ['Float', 'The strand of an unused colour carried behind the work.'],
          ['Gauge', 'Stitches and rows to 10 cm (or 4 in): how big the stitches are.'],
          ['Increase', 'Making a new stitch, such as a yarn over or make 1.'],
          ['In the round', 'Knitting in a tube, always from the right side.'],
          ['Intarsia', 'Colourwork with a separate yarn for each area of colour.'],
          ['Mosaic', 'Colourwork with one colour per row, slipping the other colour’s stitches.'],
          ['Panel', 'A stretch of stitches worked as a chart of its own.'],
          ['Repeat', 'The stitches (or rows) worked again and again.'],
          ['RS / WS', 'Right side / wrong side of the work.'],
          ['Short rows', 'Rows worked part of the way, then turned, to add shaping.'],
          ['Stockinette', 'Knit on right-side rows and purl on wrong-side rows: smooth Vs.'],
          ['Stranded', 'Colourwork with two colours per row, the unused one carried behind.'],
          ['Swatch', 'A test square knitted to measure the gauge.'],
        ],
      },
    ],
  },
]
