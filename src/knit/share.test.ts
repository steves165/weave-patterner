import { describe, expect, it } from 'vitest'
import { blankChart, paint } from './chart'
import { SAMPLES } from './samples'
import { CHART_KEY, chartUrl, decodeChart, encodeChart } from './share'

describe('chart links', () => {
  it('round-trips a chart through the link', async () => {
    const chart = paint(blankChart(12, 8), 2, 3, { stitch: 'p', color: 1 })
    expect(await decodeChart(await encodeChart('Moss', chart))).toEqual({ name: 'Moss', chart })
  })

  it('puts the chart in the query of a Knit Patterner link', async () => {
    const url = new URL(await chartUrl('Moss', blankChart(), 'http://localhost:5173/knit/'))
    expect(url.pathname).toBe('/knit/')
    expect(url.searchParams.get(CHART_KEY)).toMatch(/^[\w-]+$/)
  })

  it('keeps the sample charts short enough to share', async () => {
    for (const s of SAMPLES) expect((await chartUrl(s.name, s.chart())).length, s.name).toBeLessThan(4000)
  })

  it('rejects damaged links and things that are not charts', async () => {
    const data = await encodeChart('x', blankChart())
    await expect(decodeChart(data.slice(0, 20))).rejects.toThrow(/chart link is damaged/)
    const { packJson } = await import('../share')
    await expect(decodeChart(await packJson({ name: 'x', chart: { nope: 1 } }))).rejects.toThrow(/damaged/)
  })
})
