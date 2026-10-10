import type { TourStep } from './Tour'

/** The tour of Weave Patterner: what a draft is, part by part, then the tools around it. */
export const WEAVE_TOUR: TourStep[] = [
  {
    title: 'Welcome to Weave Patterner',
    text: 'A weaving draft is the plan for a cloth. This tour shows its four parts and the tools around them. It takes about a minute; use the arrow keys or the buttons, and Escape to stop.',
  },
  {
    target: '[role="group"][aria-label="Threading"]',
    title: 'Threading',
    text: 'Each column is one **end** (warp thread) and each row a **shaft**. Click a box to put that end on that shaft. The colour strip above sets each end’s colour.',
  },
  {
    target: '[role="group"][aria-label^="Tie-up"]',
    title: 'Tie-up',
    text: 'Each column is a **treadle**. Filled boxes are the shafts that treadle lifts.',
  },
  {
    target: '[role="group"][aria-label="Treadling"], [role="group"][aria-label="Lift plan"]',
    title: 'Treadling',
    text: 'Each row is one **pick** (a pass of the weft), from the top down. Choose the treadle (or treadles) to press for each one. The strip to the right sets the weft colours.',
  },
  {
    target: '.drawdown',
    title: 'The drawdown',
    text: 'The cloth those three make, worked out as you go. **Click any square** to see which threading, tie-up and treadling boxes decide it.',
  },
  {
    target: '[aria-label="Drawing tool"]',
    title: 'Drawing tools',
    text: '**Straight draw** and **Point draw** fill whole runs as you drag along the threading or treadling: 1 2 3 4 1 2… or 1 2 3 4 3 2 1…',
  },
  {
    target: '[aria-label="Show the drawdown, or the face or back of the cloth"]',
    title: 'Face and back',
    text: 'See the plain drawdown, or the face or back of the cloth as woven.',
  },
  {
    target: '[data-tour="settings"]',
    title: 'Pattern settings',
    text: 'The loom’s size (shafts, treadles, ends and picks), colours, view options, float checks, and New, Reset and Clear.',
  },
  {
    target: '[data-tour="tools"], [data-nav="Tools"]',
    title: 'Tools',
    text: 'Sequence tools, block profiles, double cloth, picture to draft, warp calculator, yarn library and many more. Type in the menu to find one.',
  },
  {
    target: '[data-tour="weave"]',
    title: 'Start weaving',
    text: 'A clear view to keep beside the loom: the treadles for each pick, the weft colour, and your place remembered.',
  },
  {
    target: '[data-tour="3d"], [data-nav="3D cloth"], [data-nav="3D"]',
    title: '3D cloth',
    text: 'See the threads in 3D, watch it being woven, or see the cloth made up as a sofa, rug, coat and more.',
  },
  {
    target: 'nav[aria-label="File"], nav[aria-label="Main"]',
    title: 'Save, export and print',
    text: '**Save** keeps patterns in this browser. **Export** downloads a pattern file, WIF for looms and software, a picture, or a link to share.',
  },
  {
    target: 'footer [data-tour="checks"], footer',
    title: 'Checks as you go',
    text: 'The bar at the bottom shows the longest floats, any threads that aren’t woven in, and whether the weft catches the edges.',
  },
  {
    target: '[data-tour="help"], [data-nav="File"]',
    title: 'Help is always here',
    text: 'Press **F1** for help with whatever you are working on, **?** for keyboard shortcuts, or open Help to search the guides and take this tour again.',
  },
]

/** The tour of Knit Patterner. */
export const KNIT_TOUR: TourStep[] = [
  {
    title: 'Welcome to Knit Patterner',
    text: 'Design a knitting chart square by square, and get the written pattern, stitch-count checks and a picture of the fabric as you go. This tour takes about a minute.',
  },
  {
    target: '[aria-label="Stitch to paint"]',
    title: 'Stitches',
    text: 'Pick a stitch (hover for its name), then click or drag across the chart to paint it. Cables fill the squares they cross.',
  },
  {
    target: '[data-tour="colours"]',
    title: 'Colours',
    text: 'Pick a colour to paint colours instead of stitches. Click a round swatch to change it, and **+** to add one.',
  },
  {
    target: '[role="grid"][aria-label="Knitting chart"]',
    title: 'The chart',
    text: 'Each square is one stitch as seen from the right side. Row 1 is at the bottom; right-side rows are read from the right, wrong-side rows from the left. Row numbers show where each row starts.',
  },
  {
    target: '[data-tour="select"]',
    title: 'Select',
    text: 'Select squares to copy, paste, flip or repeat them, add or delete rows and stitches, or make them the pattern repeat or a panel.',
  },
  {
    target: '[data-testid="knit-written"]',
    title: 'The written pattern',
    text: 'Every row written out as you design: repeats found for you, colours lettered, and stitch counts given.',
  },
  {
    target: 'img[aria-label="Knitted fabric preview"]',
    title: 'Knitted preview',
    text: 'What the fabric will look like: knit Vs, purl bumps, eyelets, cables and colours.',
  },
  {
    target: '[data-tour="settings"]',
    title: 'Pattern settings',
    text: 'The chart’s size, flat or in the round, the gauge, colourwork, and tools such as Mirror, Panels and Make a mosaic.',
  },
  {
    target: 'footer',
    title: 'Checks as you go',
    text: 'The bar at the bottom says if a row’s stitch count doesn’t add up, or a float is too long.',
  },
  {
    target: '[data-tour="knit"]',
    title: 'Start knitting',
    text: 'Follow the chart a row at a time, with a row counter that remembers your place.',
  },
  {
    target: 'nav[aria-label="File"], nav[aria-label="Main"]',
    title: 'Save, export and print',
    text: '**Save** keeps charts in this browser. **Export** makes a PDF pattern booklet, a chart picture with its key, or the written pattern.',
  },
  {
    target: '[data-tour="help"], [data-nav="File"]',
    title: 'Help is always here',
    text: 'Press **F1** for help with whatever you are working on, **?** for keyboard shortcuts, or open Help to search the guides and take this tour again.',
  },
]

/** The tour of Sew Patterner. */
export const SEW_TOUR: TourStep[] = [
  {
    title: 'Welcome to Sew Patterner',
    text: 'Sewing patterns made to your size: choose a design and a size or your measurements, print it, and sew it. This tour takes about a minute.',
  },
  {
    target: '[data-tour="designs"]',
    title: 'Designs',
    text: 'Tops, dresses, skirts, trousers and accessories. Pick one to start; your size and units stay as they are.',
  },
  {
    target: '[data-tour="settings"]',
    title: 'Pattern settings',
    text: 'The design’s style (neckline, sleeves, length, fit), your size or measurements, nested sizes and the seam allowances.',
  },
  {
    target: '[data-tour="pattern"]',
    title: 'The pattern',
    text: 'Every piece with its cutting and sewing lines, grainline, notches and darts, redrafted as you change things. Zoom in, or see it at actual size.',
  },
  {
    target: '[data-testid="sew-cutting"]',
    title: 'Cutting layout',
    text: 'The pieces laid out on your fabric, and how much to buy for its width.',
  },
  {
    target: '[data-testid="sew-steps"]',
    title: 'Instructions',
    text: 'The steps to sew it, following the options you chose, and the materials to buy.',
  },
  {
    target: '[data-tour="projector"]',
    title: 'Projector',
    text: 'Cut straight from a projector: the pattern full screen at full size, once you set the scale.',
  },
  {
    target: 'nav[aria-label="File"], nav[aria-label="Main"]',
    title: 'Save, print and share',
    text: '**Print** makes a PDF to print at home with a test square and a page map. **Export** has A0, SVG and DXF too. **Save** keeps projects in this browser.',
  },
  {
    target: '[data-tour="help"], [data-nav="File"]',
    title: 'Help is always here',
    text: 'Press **F1** for help with whatever you are working on, including how to take your measurements, or open Help to search the guides and take this tour again.',
  },
]
