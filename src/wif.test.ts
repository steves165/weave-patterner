import { describe, expect, it } from 'vitest'
import { ascii, edgeCaseDraft, greenBlocks } from './testUtils'
import { computeDrawdown, defaultDraft } from './weave'
import { fromWif, toWif } from './wif'

describe('toWif', () => {
  const text = toWif('Green blocks', greenBlocks())

  it('writes a WIF 1.1 file with Windows line endings', () => {
    expect(text.startsWith('[WIF]\r\nVersion=1.1\r\n')).toBe(true)
    expect(text).not.toMatch(/[^\r]\n/)
  })

  it('numbers threads, shafts and treadles from 1', () => {
    expect(text).toContain('[THREADING]\r\n1=3\r\n2=3\r\n3=1\r\n')
    expect(text).toContain('[TREADLING]\r\n1=1\r\n')
    expect(text).toContain('[COLOR TABLE]\r\n1=0,102,0\r\n2=255,255,255\r\n')
  })

  it('writes a lift plan instead of tie-up and treadling when asked', () => {
    const lift = toWif('x', greenBlocks(), { liftplan: true })
    expect(lift).toContain('[LIFTPLAN]')
    expect(lift).not.toContain('[TIEUP]')
    expect(lift).not.toContain('[TREADLING]')
  })

  it('omits unthreaded ends and empty picks', () => {
    const wif = toWif('Edge', edgeCaseDraft())
    expect(wif).not.toMatch(/\[THREADING\][^[]*\r\n4=/)
    expect(wif).not.toMatch(/\[TREADLING\][^[]*\r\n3=/)
  })
})

describe('fromWif', () => {
  it.each([false, true])('round-trips the drawdown and colours (liftplan: %s)', (liftplan) => {
    for (const d of [greenBlocks(), edgeCaseDraft()]) {
      const back = fromWif(toWif('Round trip', d, { liftplan })).draft
      expect(computeDrawdown(back)).toEqual(computeDrawdown(d))
      expect(back.warpColors).toEqual(d.warpColors)
      expect(back.weftColors).toEqual(d.weftColors)
    }
  })

  it('restores tie-up and treadling exactly from a treadled file', () => {
    const d = edgeCaseDraft()
    const { name, draft, warnings } = fromWif(toWif('Edge', d))
    expect(name).toBe('Edge')
    expect(draft).toEqual(d)
    expect(warnings).toEqual([])
  })

  it('shows a lift plan as a straight tie-up and says so', () => {
    const { draft, warnings } = fromWif(toWif('x', defaultDraft(), { liftplan: true }))
    expect(draft.tieup.map((row) => row.map(Number).join(''))).toEqual(['1000', '0100', '0010', '0001'])
    expect(warnings[0]).toMatch(/Lift plan shown as 4 treadles/)
  })

  it("reads other programs' style: comments, lower case, LF, 0-999 colours, sinking shed, multi-shaft ends", () => {
    const wif = [
      '; another program',
      '[wif]',
      'version=1.1',
      '[weaving]',
      'shafts=4',
      'treadles=4',
      'rising shed=false',
      '[warp]',
      'threads=8',
      'color=1',
      '[weft]',
      'threads=4',
      'color=2',
      '[color palette]',
      'range=0,999',
      '[color table]',
      '1=999,0,0',
      '2=0,0,999',
      '[threading]',
      ...[1, 2, 3, '4,1', 1, 2, 3, 4].map((s, i) => `${i + 1}=${s}`),
      '[tieup]',
      '1=3,4',
      '2=1,4',
      '3=1,2',
      '4=2,3',
      '[treadling]',
      '1=1',
      '2=2',
      '3=3',
      '4=4',
      '[text]',
      'title=Sinking twill',
    ].join('\n')
    const { name, draft, warnings } = fromWif(wif)
    expect(name).toBe('Sinking twill')
    expect(draft.warpColors[0]).toBe('#ff0000')
    expect(draft.weftColors[0]).toBe('#0000ff')
    expect(ascii(draft)).toEqual(['##..##..', '.##..##.', '..##..##', '#..##..#'])
    expect(warnings).toEqual([
      '1 end was threaded on several shafts; kept the first shaft',
      'Converted from a sinking-shed draft to rising shed',
    ])
  })

  it('trims very large drafts', () => {
    const big = toWif('big', defaultDraft()).replace('Threads=32', 'Threads=1500')
    const { draft, warnings } = fromWif(big)
    expect(draft.ends).toBe(1000)
    expect(warnings[0]).toMatch(/Trimmed/)
  })

  it.each([
    ['hello', /no \[WIF\] section/],
    ['[WIF]\nVersion=1.1\n', /no shafts/],
    ['[WIF]\n[WEAVING]\nShafts=4\n[WARP]\nThreads=4\n[WEFT]\nThreads=4\n', /neither a treadling nor a lift plan/],
  ])('rejects %j', (text, message) => {
    expect(() => fromWif(text)).toThrow(message)
  })
})
