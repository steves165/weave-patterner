import { describe, expect, it } from 'vitest'
import { decodePattern, encodePattern, patternFromHash, patternUrl } from './share'
import { greenBlocks } from './testUtils'

describe('share links', () => {
  it('round-trips a pattern through the URL encoding', async () => {
    const d = greenBlocks()
    expect(await decodePattern(await encodePattern('Green blocks', d))).toEqual({ name: 'Green blocks', draft: d })
  })

  it('keeps links short enough to paste', async () => {
    expect((await patternUrl('Green blocks', greenBlocks())).length).toBeLessThan(1000)
  })

  it('builds app links that patternFromHash can read back', async () => {
    const url = new URL(await patternUrl('x', greenBlocks(), 'http://localhost:5173/'))
    expect(url.origin + url.pathname).toBe('http://localhost:5173/')
    expect(patternFromHash(url.hash)).toMatch(/^[\w-]+$/)
    expect(patternFromHash('#other=1')).toBeNull()
  })

  it('rejects damaged links', async () => {
    const data = await encodePattern('x', greenBlocks())
    await expect(decodePattern(data.slice(0, 20))).rejects.toThrow(/damaged or incomplete/)
    await expect(decodePattern('!!!')).rejects.toThrow(/damaged or incomplete/)
  })
})
