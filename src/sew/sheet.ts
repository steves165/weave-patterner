import { arrange, drawPiece, type Item, moveItems, type Placed, SIZE_COLOURS } from './drawing'
import { type Box, bounds } from './geometry'
import { outlines, type Piece } from './pattern'
import { designOf, nestedPieces, type Project, piecesOf, sizeName } from './project'

export interface Sheet {
  pieces: Piece[]
  /** Each piece's drawing in its own coordinates, and the box round it (nested sizes included). */
  drawn: { piece: Piece; items: Item[]; box: Box }[]
}

/** Every piece of the project drawn, nested sizes and all. */
export function drawSheet(p: Project): Sheet {
  const pieces = piecesOf(p)
  const nested = nestedPieces(p)
  const d = designOf(p)
  const title = `${d.name} · ${sizeName(p)}`
  const drawn = pieces.map((piece, i) => {
    const others = nested
      .map((n, k) => {
        const match = n.pieces.find((q) => q.id === piece.id) ?? n.pieces[i]
        return match
          ? { name: n.name, cut: outlines(match, p.allowances).cut, colour: SIZE_COLOURS[k % SIZE_COLOURS.length] }
          : null
      })
      .filter((x) => x !== null)
    const items = drawPiece(piece, p.allowances, { title, nested: others })
    const box = bounds([...outlines(piece, p.allowances).cut, ...others.flatMap((o) => o.cut)])
    return { piece, items, box }
  })
  return { pieces, drawn }
}

/** The pieces arranged in rows `width` cm across, as one drawing. */
export function layoutSheet(sheet: Sheet, width: number, gap = 2): { items: Item[]; box: Box; placed: Placed[] } {
  const { placed, w, h } = arrange(
    sheet.drawn.map((x) => ({ piece: x.piece, box: x.box })),
    width,
    gap,
  )
  const items = placed.flatMap((pl) => {
    const found = sheet.drawn.find((x) => x.piece === pl.piece)
    return found ? moveItems(found.items, pl.dx, pl.dy) : []
  })
  return { items, box: { x: 0, y: 0, w, h }, placed }
}
