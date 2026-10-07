import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod'
import { longestFloats } from '../src/floats'
import { APP_URL, patternUrl } from '../src/share'
import { type Draft, exportFile, importFile } from '../src/weave'
import { fromWif, toWif } from '../src/wif'
import { renderDraftPng } from './png'
import { draftToSpec, type PatternSpec, patternShape, specToDraft } from './spec'

const appUrl = process.env.WEAVE_APP_URL ?? APP_URL

async function describe(name: string, d: Draft, extra: string[] = []) {
  const floats = longestFloats(d)
  const lines = [
    `"${name}": ${d.shafts} shafts, ${d.treadles} treadles, ${d.ends} ends × ${d.picks} picks.`,
    `Longest floats: warp ${floats.warp}, weft ${floats.weft} threads${
      Math.max(floats.warp, floats.weft) > 7 ? ' (long floats may snag; consider tightening the tie-up)' : ''
    }.`,
    ...extra,
    `Open in Weave Patterner: ${await patternUrl(name, d, appUrl)}`,
  ]
  return [
    { type: 'text' as const, text: lines.join('\n') },
    {
      type: 'image' as const,
      data: renderDraftPng(d).toString('base64'),
      mimeType: 'image/png',
    },
  ]
}

const formats = {
  json: 'Weave Patterner .weave.json',
  wif: 'WIF with tie-up and treadling',
  liftplan: 'WIF lift plan',
}
type Format = keyof typeof formats

function serialize(name: string, d: Draft, format: Format) {
  return format === 'json' ? exportFile(name, d) : toWif(name, d, { liftplan: format === 'liftplan' })
}

const fail = (e: unknown) => ({
  isError: true,
  content: [{ type: 'text' as const, text: e instanceof Error ? e.message : String(e) }],
})

export function createServer() {
  const server = new McpServer(
    { name: 'weave-patterner', version: '1.0.0' },
    {
      instructions: [
        'Design and export weaving drafts for floor and dobby looms.',
        'A draft has a threading (which shaft each warp end passes through), a tie-up (which shafts each treadle lifts)',
        'and a treadling (which treadle is pressed for each weft pick). Where a lifted warp end crosses a pick, warp',
        'shows; otherwise weft shows. Shafts and treadles are numbered from 1. Give one repeat of the threading and',
        'treadling and set `ends`/`picks` to tile it. Prefer floats of 7 threads or fewer for practical cloth.',
        'Each result includes a preview image and a link that opens the pattern in the Weave Patterner web app.',
      ].join(' '),
    },
  )

  server.registerTool(
    'create_weave_pattern',
    {
      title: 'Create weave pattern',
      description:
        'Builds a weaving draft, checks it, and returns a preview image of the full draft, float lengths and a link ' +
        'that opens it in the Weave Patterner app. Example 2/2 twill: shafts 4, threading [1,2,3,4], ' +
        'tieup [[1,2],[2,3],[3,4],[4,1]], treadling [1,2,3,4], ends 32, picks 32.',
      inputSchema: patternShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (spec) => {
      try {
        const d = specToDraft(spec)
        return { content: await describe(spec.name, d) }
      } catch (e) {
        return fail(e)
      }
    },
  )

  server.registerTool(
    'export_weave_pattern',
    {
      title: 'Export weave pattern',
      description:
        'Converts a pattern (same fields as create_weave_pattern) to a file: "wif" for weaving software and treadle ' +
        'looms, "liftplan" (WIF lift plan) for computer-dobby looms, or "json" for re-importing into Weave Patterner. ' +
        'With `path` the file is written there (.wif or .weave.json); otherwise its text is returned.',
      inputSchema: {
        ...patternShape,
        format: z.enum(['wif', 'liftplan', 'json']).describe('Output format'),
        path: z.string().optional().describe('File to write, relative to the server working directory'),
        overwrite: z.boolean().optional().describe('Replace the file if it already exists'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ format, path, overwrite, ...spec }) => {
      try {
        const d = specToDraft(spec as PatternSpec)
        const text = serialize(spec.name, d, format)
        if (!path) return { content: [{ type: 'text' as const, text }] }
        const want = format === 'json' ? '.weave.json' : '.wif'
        if (!path.toLowerCase().endsWith(want)) throw new Error(`A ${formats[format]} file should end in ${want}`)
        const full = resolve(path)
        if (existsSync(full) && !overwrite)
          throw new Error(`${full} already exists; pass overwrite: true to replace it`)
        await writeFile(full, text)
        return {
          content: [
            {
              type: 'text' as const,
              text: `Wrote ${formats[format]} to ${full}`,
            },
          ],
        }
      } catch (e) {
        return fail(e)
      }
    },
  )

  server.registerTool(
    'read_weave_file',
    {
      title: 'Read weave file',
      description:
        'Reads a WIF (.wif) or Weave Patterner (.weave.json) draft from a file path or from its text, and returns ' +
        'it as create_weave_pattern fields (so it can be modified and re-created), with a preview and app link.',
      inputSchema: {
        path: z.string().optional().describe('File to read'),
        content: z.string().optional().describe('File contents, if not reading from disk'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ path, content }) => {
      try {
        if (!path === !content) throw new Error('Give exactly one of path or content')
        const text = content ?? (await readFile(resolve(path as string), 'utf8'))
        const imported = text.trimStart().startsWith('{') ? { ...importFile(text), warnings: [] } : fromWif(text)
        const name =
          imported.name ?? (path ? path.replace(/^.*[\\/]/, '').replace(/(\.weave)?\.(json|wif)$/i, '') : 'Imported')
        const spec = draftToSpec(name, imported.draft)
        const notes = imported.warnings.length ? [`Notes: ${imported.warnings.join('; ')}.`] : []
        return {
          content: [
            ...(await describe(name, imported.draft, notes)),
            {
              type: 'text' as const,
              text: `Pattern fields:\n${JSON.stringify(spec)}`,
            },
          ],
        }
      } catch (e) {
        return fail(e)
      }
    },
  )

  return server
}
