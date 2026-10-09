import { describe, expect, it } from 'vitest'
import { decodePattern, encodePattern, linkParam, patternFromLink, patternUrl, unpackJson, withoutParam } from './share'
import { greenBlocks } from './testUtils'

describe('share links', () => {
  it('round-trips a pattern through the URL encoding', async () => {
    const d = greenBlocks()
    expect(await decodePattern(await encodePattern('Green blocks', d))).toEqual({ name: 'Green blocks', draft: d })
  })

  it('keeps links short enough to paste', async () => {
    expect((await patternUrl('Green blocks', greenBlocks())).length).toBeLessThan(1000)
  })

  it('builds app links with the pattern in the query, that patternFromLink can read back', async () => {
    const url = new URL(await patternUrl('x', greenBlocks(), 'http://localhost:5173/'))
    expect(url.origin + url.pathname).toBe('http://localhost:5173/')
    expect(url.hash).toBe('')
    expect(patternFromLink(url.search)).toMatch(/^[\w-]+$/)
    expect(patternFromLink('?other=1', '#other=1')).toBeNull()
  })

  it('still reads links with the pattern in the hash', () => {
    expect(patternFromLink('', '#pattern=abc')).toBe('abc')
    expect(linkParam('chart', '?chart=q', '#chart=h')).toBe('q')
  })

  it('tidies the address once a link is opened, keeping anything else', () => {
    expect(withoutParam('pattern', '/app/', '?pattern=abc')).toBe('/app/')
    expect(withoutParam('pattern', '/app/', '?pattern=abc&x=1', '#help')).toBe('/app/?x=1#help')
    expect(withoutParam('pattern', '/app/', '', '#pattern=abc')).toBe('/app/')
    expect(withoutParam(['chart', 'sample'], '/knit/', '?chart=a&sample=b')).toBe('/knit/')
  })

  it('names what was damaged', async () => {
    await expect(unpackJson('!!!', 'chart')).rejects.toThrow('The chart link is damaged or incomplete')
  })

  it('rejects damaged links', async () => {
    const data = await encodePattern('x', greenBlocks())
    await expect(decodePattern(data.slice(0, 20))).rejects.toThrow(/damaged or incomplete/)
    await expect(decodePattern('!!!')).rejects.toThrow(/damaged or incomplete/)
  })
})
