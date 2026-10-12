import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { qrPath } from './qr'

/** Reads a QR path back as a phone would: drawn black on white with a quiet zone, then decoded. */
function scan(q: { size: number; d: string }): string | null {
  const scale = 4
  const quiet = 4
  const n = (q.size + quiet * 2) * scale
  const px = new Uint8ClampedArray(n * n * 4).fill(255)
  for (const m of q.d.matchAll(/M(\d+) (\d+)h(\d+)/g)) {
    const [c, r, w] = [Number(m[1]), Number(m[2]), Number(m[3])]
    for (let y = (r + quiet) * scale; y < (r + quiet + 1) * scale; y++)
      for (let x = (c + quiet) * scale; x < (c + quiet + w) * scale; x++)
        px.fill(0, (y * n + x) * 4, (y * n + x) * 4 + 3)
  }
  return jsQR(px, n, n)?.data ?? null
}

describe('QR codes', () => {
  it('encode a pattern link that scans back exactly', () => {
    const link = `https://weave-patterner.com/?pattern=${'abcXYZ_-0123456789'.repeat(25)}`
    const q = qrPath(link)
    if (!q) throw new Error('no code')
    expect(scan(q)).toBe(link)
  })

  it('give up on text too long for a code', () => {
    expect(qrPath('x'.repeat(5000))).toBeNull()
  })
})
