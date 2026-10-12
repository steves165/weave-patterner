import qrcode from 'qrcode-generator'

/**
 * A QR code for `text` as one SVG path of its dark modules, in module units (`size` across, with no quiet zone), or
 * null when the text is too long for one. Medium error correction, so a printed code still scans if smudged.
 */
export function qrPath(text: string): { size: number; d: string } | null {
  let qr: ReturnType<typeof qrcode>
  try {
    qr = qrcode(0, 'M')
    qr.addData(text, 'Byte')
    qr.make()
  } catch {
    return null
  }
  const size = qr.getModuleCount()
  const d: string[] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (!qr.isDark(r, c)) continue
      // A run of dark modules along the row as one rectangle.
      let n = 1
      while (c + n < size && qr.isDark(r, c + n)) n++
      d.push(`M${c} ${r}h${n}v1h${-n}z`)
      c += n - 1
    }
  return { size, d: d.join('') }
}
