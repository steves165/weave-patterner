import { APP_URL, packJson, unpackJson } from '../share'
import { type KnitChart, parseChart } from './chart'

/** Key for a chart embedded in Knit Patterner's URL: `…/knit/?chart=<data>`. */
export const CHART_KEY = 'chart'
/** Key for one of the sample charts, by its slug: `…/knit/?sample=cable-panel`. */
export const SAMPLE_KEY = 'sample'
export const KNIT_URL = `${APP_URL}knit/`

export const encodeChart = (name: string, chart: KnitChart) => packJson({ name, chart })

export async function decodeChart(data: string): Promise<{ name: string; chart: KnitChart }> {
  const parsed = (await unpackJson(data, 'chart')) as { name?: unknown; chart?: unknown } | null
  const chart = parseChart(parsed?.chart)
  if (!chart) throw new Error('The chart link is damaged or incomplete')
  return { name: typeof parsed?.name === 'string' ? parsed.name : 'Shared chart', chart }
}

/** A link that opens this chart in Knit Patterner. */
export async function chartUrl(name: string, chart: KnitChart, base = KNIT_URL): Promise<string> {
  return `${base}?${CHART_KEY}=${await encodeChart(name, chart)}`
}
