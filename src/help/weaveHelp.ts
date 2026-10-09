import type { Topic } from './types'

/** Weave Patterner's help: a guide to each part of the app, the shortcuts and a glossary. */
export const WEAVE_HELP: Topic[] = [
  {
    id: 'start',
    title: 'Getting started',
    summary: 'What a draft is, and how to make your first pattern',
    keywords: ['begin', 'new', 'basics', 'introduction', 'how to'],
    body: [
      {
        p: 'A weaving **draft** is the plan for a cloth. It has four parts, laid out the way weavers have drawn them for centuries:',
      },
      {
        list: [
          '**[[threading|Threading]]** (top): which shaft each warp thread (end) goes through.',
          '**[[tieup|Tie-up]]** (top right): which shafts each treadle lifts.',
          '**[[treadling|Treadling]]** (right): which treadle you press for each weft thread (pick).',
          '**[[drawdown|Drawdown]]** (the big grid): the cloth they make, worked out for you as you go.',
        ],
      },
      { h: 'Your first pattern' },
      {
        steps: [
          'Choose **New** in the pattern settings for empty grids, or start from the twill that opens the first time.',
          'Click boxes in the threading to put each end on a shaft. Try **Straight draw** in the bar above the draft and drag along the threading to fill it 1 2 3 4 1 2 3 4…',
          'Click boxes in the tie-up to choose which shafts each treadle lifts.',
          'Click a box in each row of the treadling to choose the treadle for that pick.',
          'Watch the drawdown change. Click any square in it to see exactly why it is warp or weft.',
          'Change the colours by clicking the colour strips along the top and right of the draft.',
          'Choose **Save** to keep it in this browser, or **Export** to download it.',
        ],
      },
      {
        tip: 'Press **F1** at any time for help with the part you are working on, or take [[tour|the tour]] for a one-minute walk round the screen.',
      },
    ],
  },
  {
    id: 'threading',
    title: 'Threading',
    summary: 'Putting each warp end on a shaft',
    keywords: ['ends', 'shafts', 'harness', 'draw in', 'straight draw', 'point draw'],
    body: [
      {
        p: 'Each column of the threading is one **end** (warp thread), and each row is a **shaft**. A filled box puts that end through a heddle on that shaft. Shaft 1 is the row next to the drawdown.',
      },
      {
        list: [
          'Click a box to put the end on that shaft (each end can be on one shaft). Click it again to leave the end unthreaded.',
          'Drag to fill several ends at once.',
          'Use [[drawing|Straight draw or Point draw]] to draw whole runs by dragging.',
          'The colour strip above the threading is the warp colours: click a swatch to change that end.',
          'The numbers along the top count the ends. Set how often they appear with **Ruler every** in the settings.',
        ],
      },
      {
        p: 'More threading tools (repeat, mirror, reverse, insert or delete ends, and named sequences such as advancing twills) are in **Tools › Sequence tools**.',
      },
      {
        tip: 'Turn on **End 1 on the right** in the view settings if your loom is threaded from the right. It changes only how the draft is drawn.',
      },
    ],
  },
  {
    id: 'tieup',
    title: 'Tie-up',
    summary: 'Which shafts each treadle lifts',
    keywords: ['treadles', 'sinking shed', 'rising shed', 'lift plan', 'dobby'],
    body: [
      {
        p: 'Each column of the tie-up is a **treadle** and each row a **shaft**. A filled box means pressing that treadle lifts that shaft. Click or drag to change it.',
      },
      {
        list: [
          '**Sinking shed**: for counterbalance and countermarch looms where you tie the shafts that go down. The tie-up then shows the sinking shafts; the cloth is the same.',
          '**No tie-up (lift plan)**: for table looms and dobby looms. The treadling becomes a lift plan, marking the shafts lifted on each pick. See [[treadling|Treadling and lift plans]].',
        ],
      },
    ],
  },
  {
    id: 'treadling',
    title: 'Treadling and lift plans',
    summary: 'Which treadle (or shafts) each pick uses',
    keywords: ['picks', 'weft', 'lift plan', 'tromp as writ', 'dobby'],
    body: [
      {
        p: 'Each row of the treadling is one **pick** (a pass of the weft), read from the top. Fill the box under the treadle to press for that pick. A pick can use several treadles at once.',
      },
      {
        list: [
          'With **No tie-up** turned on, the treadling is a **lift plan**: each row marks the shafts lifted for that pick, for table and dobby looms.',
          '**Tools › Convert to lift plan** (or **to tie-up and treadling**) switches between the two, keeping the same cloth.',
          '**Tools › Tromp as writ** treadles the pattern as it is threaded.',
          'The colour strip to the right of the treadling is the weft colours: click a swatch to change that pick.',
        ],
      },
    ],
  },
  {
    id: 'drawdown',
    title: 'The drawdown',
    summary: 'The cloth, worked out from the threading, tie-up and treadling',
    keywords: ['cloth', 'face', 'back', 'trace', 'fabric view', 'crosshair'],
    body: [
      {
        p: 'Each square of the drawdown is where an end crosses a pick: warp colour where the warp is on top, weft colour where the weft is.',
      },
      {
        list: [
          '**Click a square** to trace it: the threading, tie-up and treadling boxes that decide it are outlined, with an explanation. Press Escape to stop.',
          '**Drawdown / Face / Back** (above the draft): the plain drawdown, or the face or back of the cloth as woven (they differ for double cloth and other layered weaves).',
          '**Fabric view** (view settings) shades the squares like threads.',
          'Hover over the draft to see which end and pick you are on.',
        ],
      },
      { p: 'When you change the draft, the squares that changed glow for a moment so you can see what your edit did.' },
    ],
  },
  {
    id: 'drawing',
    title: 'Drawing tools',
    summary: 'Click, Straight draw and Point draw',
    keywords: ['straight', 'point', 'draw', 'drag', 'paint'],
    body: [
      { p: 'The three drawing tools above the draft change how dragging along the threading or treadling works:' },
      {
        list: [
          '**Click**: each box you click or drag over is set or cleared, one at a time.',
          '**Straight draw**: press a box and drag along to fill 1 2 3 4 1 2 3 4… Drag up the shafts to climb, down to descend.',
          '**Point draw**: as straight draw, but turning back at the top and bottom: 1 2 3 4 3 2 1…',
        ],
      },
      {
        p: 'Clicking a single treadling box always toggles it, so a pick can use several treadles whichever tool is on.',
      },
      {
        tip: 'On a touch screen, swipes move around the pattern. Tap the brush button in the toolbar to drag-paint instead.',
      },
    ],
  },
  {
    id: 'colours',
    title: 'Colours',
    summary: 'Warp and weft colours, stripes and colourways',
    keywords: ['colour', 'color', 'stripes', 'palette', 'colourways', 'houndstooth'],
    body: [
      {
        list: [
          'Click a swatch in the colour strips (above the threading, right of the treadling) to change one end or pick.',
          'In the settings, choose a colour and **Set all warp** or **Set all weft** to colour every end or pick.',
          '**Colours and presets…** (settings, or Tools) makes stripe sequences and classic colour patterns such as houndstooth and log cabin.',
          '**Tools › Colourways** shows the same cloth in other colours side by side.',
          'Turn on **Thread colours in boxes** to fill threading and treadling boxes with their thread colour.',
        ],
      },
    ],
  },
  {
    id: 'blocks',
    title: 'Blocks of ends',
    summary: 'Name stretches of the threading and save them to reuse',
    keywords: ['blocks', 'block store', 'saved block', 'sections'],
    body: [
      {
        p: 'Split the threading into named blocks (A, B, C… from end 1), shown in a strip above the draft. Drag along the strip to mark a block, or use the **Blocks** button above the draft.',
      },
      {
        list: [
          'Click a block label to rename it, change its ends, or remove it.',
          '**Save to store** keeps the block (its threading and warp colours) on this device. Unnamed blocks are called "Saved block 1" and so on.',
          '**Put in** adds a saved block anywhere; **Swap in** replaces a block with a saved one.',
        ],
      },
      { p: 'For block weaves such as overshot or summer and winter, see **Tools › Block profile**.' },
    ],
  },
  {
    id: 'settings',
    title: 'Pattern settings',
    summary: 'Size, colours, view options and the pattern itself',
    keywords: [
      'size',
      'shafts',
      'treadles',
      'ends',
      'picks',
      'view',
      'cell size',
      'ruler',
      'reset',
      'trim',
      'clear',
      'theme',
      'halloween',
      'christmas',
      'seasonal',
      'colour theme',
    ],
    body: [
      {
        p: 'The settings are in the sidebar on the right (fold it away with **Hide**), or on phones and tablets in the **Pattern settings** sheet at the bottom.',
      },
      { h: 'Loom' },
      { p: 'Shafts, treadles, ends (warp threads) and picks (weft threads). Up to 128 shafts and treadles.' },
      { h: 'View' },
      {
        terms: [
          [
            'Colour theme',
            'Seasonal colours for the app in place of the pink: Halloween, Christmas, Winter, Spring, Summer or Autumn, or Halloween and Christmas only when it’s time. Your pattern’s colours stay as they are. Knit Patterner uses the same choice.',
          ],
          ['Cell size', 'How big the boxes are.'],
          ['Ruler every', 'Number every this many ends and picks (0 for none).'],
          ['No tie-up', 'Show a lift plan instead of a tie-up and treadling.'],
          ['Thread colours in boxes', 'Fill threading and treadling boxes with their colour.'],
          ['End 1 on the right', 'Draw the draft mirrored, as for looms threaded from the right.'],
          ['Numbers in boxes', 'Show the shaft or treadle number in filled boxes.'],
          ['Fabric view', 'Shade the drawdown like threads.'],
          ['Sinking shed', 'Show the tie-up as the shafts that sink.'],
          ['Threading below', 'Put the threading and tie-up under the drawdown.'],
        ],
      },
      { h: 'Pattern' },
      {
        list: [
          '**Trim to one repeat**: cut the draft down to the smallest repeat.',
          '**Clear grids**: empty the threading, tie-up and treadling.',
          '**Reset**: undo everything since the pattern was opened or saved.',
          '**New**: start again with empty grids.',
        ],
      },
    ],
  },
  {
    id: 'checks',
    title: 'Floats, edges and repeats',
    summary: 'What the status bar at the bottom tells you',
    keywords: ['floats', 'selvedge', 'edges', 'unwoven', 'repeat', 'status'],
    body: [
      { p: 'The bar along the bottom checks the cloth as you design:' },
      {
        list: [
          '**Longest floats**: the most ends (warp) or picks (weft) a thread passes over without interlacing. Long floats snag. Turn on **Highlight floats longer than** in the settings to see them in the drawdown.',
          '**Not woven in**: threads that never go over and under, so would fall out.',
          '**Edges**: whether the weft catches the edge end at each turn. If not, use a floating selvedge or change the edge threading.',
        ],
      },
      {
        p: 'The repeat (the smallest part that repeats) is shown in the Pattern settings, with **Trim to one repeat**.',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    summary: 'Every tool in the Tools menu, and what it does',
    keywords: ['tools', 'menu', 'profile', 'double cloth', 'picture', 'echo', 'variations', 'transform', 'calculator'],
    body: [
      { p: 'Open **Tools** in the toolbar. Type in the box at the top of the menu to find a tool by name.' },
      {
        terms: [
          ['Sequence tools', 'Fill, repeat, mirror, reverse, insert or delete ends and picks; copy and paste them.'],
          ['Tromp as writ', 'Treadle as threaded.'],
          ['Colours and presets', 'Stripe sequences and classic colour patterns.'],
          ['Draw the cloth', 'Paint the cloth you want and get a threading, tie-up and treadling for it.'],
          ['Block profile', 'Design in blocks: overshot, summer and winter, lace, crackle, turned twill and more.'],
          ['Double cloth', 'Two layers: separate, a tube, double width, or blocks that swap faces.'],
          ['Picture to draft', 'Turn a picture into blocks and a draft.'],
          ['Echo weave', 'A design line threaded with its echo, in two colours.'],
          ['Variations', 'The same threading with other tie-ups and treadlings.'],
          ['Colourways', 'The same cloth in other colours.'],
          ['Transform draft', 'Turn 90°, swap face and back, flip, or move the repeat.'],
          ['Convert', 'Between a lift plan and a tie-up with treadling.'],
          ['Cloth report', 'Warp and weft faces, interlacing, floats and firmness.'],
          ['Warp winding plan', 'Colour order for the warping board, in bouts.'],
          ['Warp calculator', 'Warp length, width in the reed and yarn per colour.'],
          ['Yarn library', 'Your yarns, with grist and price, matched by colour.'],
          ['Rigid heddle', 'Weave this draft on a rigid heddle loom with pick-up sticks.'],
          ['Drawloom', 'Damask and other pattern-harness designs.'],
          ['Tablet weaving', 'Design card-woven bands.'],
        ],
      },
    ],
  },
  {
    id: 'weaving',
    title: 'Weaving at the loom',
    summary: 'Step through the picks, or thread the loom end by end',
    keywords: ['start weaving', 'loom', 'weaving mode', 'threading mode', 'chime', 'progress'],
    body: [
      {
        p: '**Start weaving** opens a big, clear view to keep beside the loom. It shows the treadle (or shafts) for each pick in large type, the weft colour, and warns when the weft changes.',
      },
      {
        list: [
          'Press **Next pick** (or Space, or the arrow keys) after each pick.',
          'Switch to **Thread** to thread the loom end by end, with the shaft and heddle count for each.',
          'Your place is remembered for each pattern.',
          'Turn on the chime to hear when the weft colour changes.',
        ],
      },
    ],
  },
  {
    id: '3d',
    title: '3D cloth',
    summary: 'See the cloth in 3D, woven, or made up into things',
    keywords: ['3d', 'preview', 'sofa', 'rug', 'tapestry', 'coat', 'skirt', 'draped'],
    body: [
      {
        p: '**3D cloth** shows the threads crossing over and under. Drag to turn it, scroll or pinch to zoom.',
      },
      {
        list: [
          '**Show as**: flat, draped, a cushion or rolled; or made up as a sofa, rug, tapestry, coat or skirt at the cloth’s real size.',
          '**Weave it** animates the weaving pick by pick.',
          '**Show back** turns the cloth over.',
          'Thread thickness and spacing come from the warp calculator’s sett and the yarns in your yarn library.',
          '**Save image** downloads a picture.',
        ],
      },
    ],
  },
  {
    id: 'files',
    title: 'Saving, sharing and printing',
    summary: 'Save in the browser, export files, share links and print',
    keywords: ['save', 'load', 'export', 'import', 'wif', 'print', 'share', 'link', 'png', 'svg'],
    body: [
      {
        list: [
          '**Save** keeps the pattern in this browser, by name (up to 200). **Load** opens, renames or deletes them.',
          'The pattern you are working on is kept automatically, so it is still there next time.',
          '**Export**: a pattern file (.weave.json), WIF for weaving software and computer looms, a WIF lift plan for dobby looms, or a PNG or SVG picture.',
          '**Export › Copy a link to this pattern** makes a link that opens the pattern for anyone.',
          '**Import** opens a .weave.json or .wif file.',
          '**Print** prints the draft, with written threading and treadling lists if you like.',
        ],
      },
      {
        tip: 'Patterns saved in the browser stay on this device. Export them to keep a copy or move them to another device.',
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
          ['Tab', 'Move between the threading, tie-up, treadling and controls.'],
          ['← → ↑ ↓', 'Move around a grid.'],
          ['Space or Enter', 'Set or clear the box you are on.'],
          ['Escape', 'Stop tracing a drawdown square; close a dialog.'],
        ],
      },
      { p: 'In weaving mode, Space and the arrow keys move between picks.' },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    summary: 'Using Weave Patterner with a keyboard, a screen reader or high contrast',
    keywords: ['accessibility', 'a11y', 'screen reader', 'keyboard', 'contrast', 'motion', 'zoom', 'blind'],
    body: [
      {
        p: 'Everything in Weave Patterner can be done from the keyboard, and it is tested with automated accessibility checks.',
      },
      {
        list: [
          '**Skip to the draft:** the first thing Tab reaches. Press Enter to jump past the toolbar.',
          '**Grids:** Tab into the threading, tie-up or treadling, move with the arrow keys, and press Space to set or clear a box. Each box is read out as, say, “End 3, shaft 2, checked”.',
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
    keywords: ['mobile', 'phone', 'tablet', 'touch', 'ipad', 'brush'],
    body: [
      {
        list: [
          'Tap a box to set or clear it; swipe to move around the pattern.',
          'Tap the **brush** in the toolbar to drag-paint instead of scrolling; tap it again to scroll.',
          'On phones, the bar at the bottom has **Draft**, **3D cloth**, **Tools** and **File** (save, load, export, print and help).',
          'The **Pattern settings** bar opens the settings in a sheet.',
        ],
      },
    ],
  },
  {
    id: 'glossary',
    title: 'Glossary',
    summary: 'Weaving words, explained',
    keywords: ['words', 'terms', 'definitions', 'meaning', 'vocabulary'],
    body: [
      {
        terms: [
          ['Block', 'A group of ends (or picks) that weave together as a unit, for pattern weaves.'],
          ['Dobby', 'A loom that lifts shafts from a pattern (a lift plan) rather than tied treadles.'],
          ['Draft', 'The plan of a cloth: threading, tie-up, treadling and drawdown.'],
          ['Drawdown', 'The picture of the cloth worked out from the draft.'],
          ['End', 'One warp thread.'],
          ['Float', 'A thread passing over several others without interlacing.'],
          ['Heddle', 'The eye on a shaft that an end passes through.'],
          ['Lift plan', 'The shafts lifted for each pick, for dobby and table looms.'],
          ['Pick', 'One pass of the weft.'],
          ['Profile draft', 'A draft in blocks, turned into a full draft for a block weave.'],
          ['Selvedge', 'The edge of the cloth, where the weft turns.'],
          ['Sett', 'How closely the warp is spaced: ends per cm or inch.'],
          ['Shaft', 'A frame holding heddles; lifting it raises the ends threaded through it.'],
          ['Shed', 'The opening between raised and lowered ends that the weft passes through.'],
          ['Tabby', 'Plain weave: over one, under one.'],
          ['Tie-up', 'Which shafts each treadle lifts.'],
          ['Treadle', 'A pedal that lifts the shafts tied to it.'],
          ['Twill', 'A weave whose interlacings step along, making diagonal lines.'],
          ['Warp', 'The threads held lengthwise on the loom.'],
          ['Weft', 'The thread woven across the warp.'],
          ['WIF', 'Weaving Information File: a standard draft format for weaving software and looms.'],
        ],
      },
    ],
  },
]
