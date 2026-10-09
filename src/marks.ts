/**
 * The apps' marks, shared by the logos in the apps and the static pages. Both are a rounded square in the accent
 * colour on a 30 × 30 grid.
 */

/** Weave Patterner: the steps of a twill line, as [x, y] of each little square. */
export const TWILL_STEPS = [
  [7, 7],
  [11, 7],
  [11, 11],
  [15, 11],
  [15, 15],
  [19, 15],
  [19, 19],
  [7, 19],
]

/** Knit Patterner: each knit V, two columns of three stitches, as [x, y] of the V's top left. */
export const KNIT_VS = [7, 15].flatMap((x) => [6.5, 12.5, 18.5].map((y) => [x, y]))

/** A mark as SVG markup, for pages without React: `accent` and `on` are CSS colours (variables work). */
export function markSvg(app: 'weave' | 'knit', accent: string, on: string, size = 30): string {
  const marks =
    app === 'weave'
      ? `<g fill="${on}">${TWILL_STEPS.map(([x, y]) => `<rect x="${x}" y="${y}" width="4" height="4" rx="1.3"/>`).join('')}</g>`
      : `<g fill="none" stroke="${on}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${KNIT_VS.map(([x, y]) => `<path d="M${x} ${y} L${x + 4} ${y + 5} L${x + 8} ${y}"/>`).join('')}</g>`
  return `<svg width="${size}" height="${size}" viewBox="0 0 30 30" aria-hidden="true" focusable="false"><rect width="30" height="30" rx="9" fill="${accent}"/>${marks}</svg>`
}
