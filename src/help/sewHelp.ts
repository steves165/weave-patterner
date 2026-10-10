import { MEASUREMENT_IDS, MEASUREMENTS } from '../sew/measurements'
import type { Topic } from './types'

/** Sew Patterner's help: a guide to each part of the app, measuring, printing and cutting, and a glossary. */
export const SEW_HELP: Topic[] = [
  {
    id: 'start',
    title: 'Getting started',
    summary: 'Choose a design, your size, and print the pattern',
    keywords: ['begin', 'new', 'basics', 'introduction', 'how to', 'made to measure'],
    body: [
      {
        p: 'Sew Patterner makes sewing patterns to your size: choose a garment, choose a standard size or put in your own measurements, pick the style, and print the pattern at home. It also lays the pieces out on your fabric, says how much to buy, and gives the sewing steps.',
      },
      { h: 'Your first pattern' },
      {
        steps: [
          'Pick a design from the row at the top: a T-shirt, a dress, skirts, trousers, a bag and more.',
          'In **Pattern settings**, choose its style: neckline, sleeves, length, fit.',
          'Choose a **standard size**, or **My measurements** and fill them in (see [[measuring|how to measure]]).',
          'Check the pieces in the **Pattern** and the **Sketch**, and how much fabric the **Cutting layout** needs.',
          'Choose **Print** or **Export** for a PDF to print at home (A4 or Letter), at a copy shop (A0), or [[projector|to project]].',
          'Follow the **Instructions** to sew it.',
        ],
      },
      {
        tip: 'Everything stays in this browser: **Save** keeps a project to come back to, and **Share** makes a link with it inside.',
      },
    ],
  },
  {
    id: 'designs',
    title: 'Designs and style options',
    summary: 'The garments and projects, and how to change them',
    keywords: ['garment', 'neckline', 'sleeves', 'length', 'fit', 'ease', 'options', 'style', 'library'],
    body: [
      {
        p: 'Each design is drafted from your measurements every time you change something, the way a pattern cutter would draft it by hand. Its options change the pieces: a V-neck changes the front neckline, longer sleeves change the sleeve, and **Fit** adds more or less **ease** (room to move) all round.',
      },
      {
        list: [
          '**Tops**: a T-shirt and a tank top in stretch knit.',
          '**Dresses**: a shift dress, straight, A-line or fitted, with sleeves or without.',
          '**Skirts**: a fitted skirt (pencil, straight or A-line), a circle skirt, and a gathered skirt with tiers.',
          '**Trousers**: pull-on trousers with an elastic waist, from shorts to full length.',
          '**Accessories**: a tote bag, an apron, a cushion cover and a bucket hat.',
          '**Blocks**: a close-fitting bodice block (sloper) to test the fit and design from.',
        ],
      },
      {
        p: '**Lengthen or shorten** adds to the hem or takes from it. The double lines on the pieces show where to lengthen or shorten a printed pattern by hand.',
      },
    ],
  },
  {
    id: 'measuring',
    title: 'Taking your measurements',
    summary: 'What each measurement is and how to take it',
    keywords: ['measure', 'tape', 'bust', 'waist', 'hips', 'size', 'body', 'fit'],
    body: [
      {
        p: 'Measure over underwear or close-fitting clothes, with the tape snug but not tight and level all round. It helps to have someone else measure you. Only the measurements the design uses are shown.',
      },
      { terms: MEASUREMENT_IDS.map((id) => [MEASUREMENTS[id].name, MEASUREMENTS[id].how] as [string, string]) },
      {
        tip: '**Save measurements** keeps them under a name (yours, or someone you sew for), to use again with any design.',
      },
    ],
  },
  {
    id: 'sizes',
    title: 'Sizes, nested sizes and units',
    summary: 'Standard sizes, made to measure, several sizes on one pattern, cm or inches',
    keywords: ['size chart', 'grading', 'nested', 'multi-size', 'inches', 'cm', 'uk', 'mens', 'womens'],
    body: [
      {
        p: 'Choose **Standard size** for the women’s sizes UK 6 to 24 (EU 34 to 52, US 2 to 20) or men’s XS to 3XL, or **My measurements** to draft the pattern to you.',
      },
      {
        p: '**Nested sizes** draws more sizes’ cutting lines in colours round the pattern, as printed patterns do: handy to sew one size at the bust and another at the hip (blend between the lines), or to print one pattern for several people.',
      },
      { p: '**Units** shows lengths in centimetres or inches (to the nearest eighth) and fabric in metres or yards.' },
    ],
  },
  {
    id: 'reading',
    title: 'Reading the pattern',
    summary: 'Cutting and sewing lines, grainlines, folds, notches, darts and labels',
    keywords: ['grainline', 'notch', 'dart', 'fold', 'seam line', 'cutting line', 'markings', 'label'],
    body: [
      {
        terms: [
          ['Cutting line', 'The solid outline: cut along it.'],
          ['Sewing line', 'The dashed line inside it: sew along it. The space between is the seam allowance.'],
          [
            'Grainline',
            'The long arrow: lay it parallel to the selvedge (the fabric’s woven edge). On knits it marks the greatest stretch, across.',
          ],
          [
            'Place on fold',
            'The bracket along an edge: put that edge on the fold of the fabric and cut both layers, for a piece that opens out whole.',
          ],
          [
            'Notches',
            'Short marks across the cutting line: snip them and match them when sewing. One notch for the front, two for the back.',
          ],
          ['Darts', 'The pink V shapes: fold along the middle, match the lines and sew from the edge to the point.'],
          ['Dots', 'Points to match or mark, as the top of a sleeve or a pocket position.'],
          ['Lengthen or shorten here', 'The double line: cut across it and spread or overlap the pattern.'],
          ['Label', 'Each piece’s name, how many to cut, the fabric (if not the main one), the design and size.'],
        ],
      },
    ],
  },
  {
    id: 'allowances',
    title: 'Seam and hem allowances',
    summary: 'Included or not, and how wide',
    keywords: ['seam allowance', 'hem', 'sa', 'trace', 'tracing'],
    body: [
      {
        p: 'Seam and hem allowances are added for you outside the sewing line; edges on the fold and edges that are bound or neatened get none. Each design starts with the usual amounts for it (1 cm for knits and bags, 1.5 cm for woven garments; deeper hems where they suit).',
      },
      {
        p: 'Turn **Add seam allowances** off for a pattern of just the sewing lines, to trace and add your own when cutting.',
      },
    ],
  },
  {
    id: 'printing',
    title: 'Printing the pattern',
    summary: 'Home printer, copy shop or plotter, and putting the pages together',
    keywords: ['print', 'pdf', 'a4', 'letter', 'a0', 'copy shop', 'tile', 'tape', 'test square', 'plotter'],
    body: [
      {
        list: [
          '**PDF for home printers (A4 or Letter)**: the booklet (style, fabric, materials, cutting layouts, the sewing steps) and then the pattern tiled over pages, with a map of the pages.',
          '**PDF for a copy shop (A0)**: the pattern on as few A0 sheets as it takes.',
          '**Full-size PDF**: the booklet and the pattern on one large page, for a plotter or wide printer.',
          '**SVG** to open in Inkscape or Illustrator, and **DXF** (AAMA layers) for pattern CAD and cutting machines.',
        ],
      },
      {
        steps: [
          'Print at **100% or actual size**, never “fit to page”.',
          'Measure the test square: it must be 10 cm (or 4 inches).',
          'Trim each page along its frame on the right and bottom, and tape the pages together in order: rows are letters, columns numbers, and the edges say which page comes next.',
        ],
      },
    ],
  },
  {
    id: 'projector',
    title: 'Projector mode',
    summary: 'Cut straight from a projected pattern, without printing',
    keywords: ['projector', 'project', 'calibrate', 'scale', 'mirror'],
    body: [
      {
        p: 'With a projector over your cutting table, **Projector** shows the pattern full screen in light lines on black, at full size. Choose **Set the scale** and adjust it until the square measures 10 cm on your mat; it’s remembered on this device.',
      },
      {
        p: 'Drag the pattern or use the arrow keys to move it over the fabric. **Mirror** flips it, for cutting with the wrong side up. There’s also a projector PDF under Export, for projector apps.',
      },
    ],
  },
  {
    id: 'cutting',
    title: 'Cutting layout and fabric amounts',
    summary: 'How the pieces fit on the fabric, and how much to buy',
    keywords: ['yardage', 'fabric', 'how much', 'layout', 'width', 'selvedge', 'nap', 'one way', 'metres', 'yards'],
    body: [
      {
        p: 'The **Cutting layout** places every piece on the fabric with its grainline along the length: on the fold, and on fabric folded selvedge to selvedge so pairs are cut together, or on a single layer when something is too wide. Pieces are fitted together by their shapes, so the length shown is what to buy (plus 10 cm to straighten the ends).',
      },
      {
        p: 'Choose the fabric’s width, and turn on **One-way fabric** for a nap (velvet, corduroy) or a print with an up and down, so every piece points the same way. The table gives the amounts for the usual widths, and for any lining or interfacing.',
      },
    ],
  },
  {
    id: 'sewing',
    title: 'Instructions and materials',
    summary: 'The sewing steps, the notions, and the sketch',
    keywords: ['instructions', 'steps', 'notions', 'zip', 'elastic', 'buttons', 'materials', 'sketch', 'drawing'],
    body: [
      {
        p: '**Instructions** gives the steps to sew the garment, following the options you chose: the zip, pockets, sleeves or bindings. **Materials** lists suggested fabrics and the notions, with zip and elastic lengths for your size.',
      },
      {
        p: 'The **Sketch** is a flat drawing of the garment from the front, drawn from the pattern itself. Change its colour to try out a fabric.',
      },
    ],
  },
  {
    id: 'own',
    title: 'Your own pieces',
    summary: 'Add rectangles, circles and shapes you draw to any pattern',
    keywords: [
      'draft',
      'draw',
      'custom',
      'rectangle',
      'circle',
      'ruffle',
      'tie',
      'band',
      'strap',
      'add piece',
      'points',
      'curve',
    ],
    body: [
      {
        p: 'Under **Your own pieces**, add pieces to any pattern: a **Rectangle** for bands, ties, ruffles and pockets, a **Circle**, or **Draw one** point by point. Each gets its name, how many to cut, the fabric, whether it’s on the fold, in pairs or on the bias, and what its edges get (a seam allowance, a hem, or none).',
      },
      {
        steps: [
          'Choose **Draw one**: a starting shape appears on a 5 cm grid.',
          'Drag the points where you want them; click the outline to add a point, and double-click a point to make the outline curve smoothly through it.',
          'Or type each point’s position in the table (across and down from the top left), which works from the keyboard.',
          'For a piece cut on the fold, put the fold edge on the dashed line at 0 and turn on **On the fold**.',
        ],
      },
      {
        p: 'Your pieces are saved and shared with the project, laid out in the cutting layout, and printed in the PDFs.',
      },
    ],
  },
  {
    id: 'files',
    title: 'Save, load, share and export',
    summary: 'Keep projects in this browser, or share them as links and files',
    keywords: ['save', 'load', 'open', 'file', 'share', 'link', 'export', 'svg', 'dxf', 'undo'],
    body: [
      {
        list: [
          '**Save** keeps the project (design, options, size or measurements, allowances) in this browser; **Load** opens one again.',
          '**Share** makes a link with the whole project in it, links for Pinterest, Facebook, X, WhatsApp and email, and a picture of the sketch.',
          '**Export** saves PDFs, SVG, DXF or a project file to open again with **Import**.',
          '**Undo** and **Redo** (Ctrl+Z, Ctrl+Y) step back and forward through your changes.',
        ],
      },
    ],
  },
  {
    id: 'keys',
    title: 'Keyboard shortcuts',
    summary: 'Undo, help and moving the projection',
    keywords: ['keyboard', 'shortcut', 'keys'],
    body: [
      {
        keys: [
          ['Ctrl+Z', 'Undo'],
          ['Ctrl+Y or Ctrl+Shift+Z', 'Redo'],
          ['F1', 'Help for what you are working on'],
          ['?', 'These shortcuts'],
          ['Arrow keys', 'In projector mode: move the pattern 1 cm (with Shift, 10 cm)'],
        ],
      },
    ],
  },
  {
    id: 'glossary',
    title: 'Glossary',
    summary: 'Sewing and pattern words',
    keywords: ['words', 'terms', 'meaning', 'definition'],
    body: [
      {
        terms: [
          [
            'Bias',
            'The diagonal of woven fabric, at 45° to the grain: it stretches and drapes, so bindings and circle skirts use it.',
          ],
          [
            'Block (sloper)',
            'A close-fitting basic pattern to someone’s measurements, without style, to design other patterns from.',
          ],
          ['Ease', 'Room added beyond the body measurement, for movement and style.'],
          ['Facing', 'A piece sewn to an edge (a neckline) and turned inside to finish it.'],
          ['Grain', 'The direction of the threads: lengthwise along the selvedge, crosswise across it.'],
          ['Interfacing', 'A layer, often ironed on, that stiffens facings, waistbands and collars.'],
          ['Notions', 'The other things a garment needs: zips, buttons, elastic, thread.'],
          ['Selvedge', 'The finished woven edges along the length of the fabric.'],
          ['Toile (muslin)', 'A test version in cheap fabric, to check the fit before cutting the real thing.'],
          ['Understitching', 'Stitching a facing to the seam allowances close to the seam, so it rolls inside.'],
        ],
      },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    summary: 'Using Sew Patterner with a keyboard, a screen reader or high contrast',
    keywords: ['screen reader', 'keyboard', 'contrast', 'a11y'],
    body: [
      {
        p: 'Everything in Sew Patterner can be done from the keyboard, and it is tested with automated accessibility checks. The pattern, sketch and layouts have text descriptions, and the materials, fabric amounts and instructions are plain text.',
      },
    ],
  },
]
