import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { longestFloats } from '../src/floats'
import { decodePattern, patternFromLink } from '../src/share'
import { greenBlocks } from '../src/testUtils'
import { computeDrawdown } from '../src/weave'
import { toWif } from '../src/wif'
import { createServer } from './server'
import { specToDraft } from './spec'

type Content = { type: string; text?: string; data?: string; mimeType?: string }
type Result = { content: Content[]; isError?: boolean }

const twill = {
  name: 'Twill',
  shafts: 4,
  threading: [1, 2, 3, 4],
  tieup: [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 1],
  ],
  treadling: [1, 2, 3, 4],
  ends: 16,
  picks: 16,
}

let client: Client
const call = async (name: string, args: Record<string, unknown>) =>
  (await client.callTool({ name, arguments: args })) as Result

beforeAll(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await createServer().connect(serverSide)
  client = new Client({ name: 'test', version: '0' })
  await client.connect(clientSide)
})
afterAll(() => client.close())

describe('MCP server', () => {
  it('offers the three tools', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(['create_weave_pattern', 'export_weave_pattern', 'read_weave_file'])
  })

  it('creates a pattern with a summary, an app link that decodes to it, and a PNG preview', async () => {
    const r = await call('create_weave_pattern', twill)
    expect(r.isError).toBeFalsy()
    const text = r.content[0].text ?? ''
    expect(text).toContain('"Twill": 4 shafts, 4 treadles, 16 ends × 16 picks.')
    expect(text).toContain('Longest floats: warp 2, weft 2 threads.')
    const link = /https:\/\/\S+/.exec(text)?.[0] ?? ''
    const shared = await decodePattern(patternFromLink(new URL(link).search) ?? '')
    expect(shared).toEqual({ name: 'Twill', draft: specToDraft(twill) })
    expect(r.content[1]).toMatchObject({ type: 'image', mimeType: 'image/png' })
    expect(
      Buffer.from(r.content[1].data ?? '', 'base64')
        .subarray(1, 4)
        .toString(),
    ).toBe('PNG')
  })

  it('warns about long floats', async () => {
    const r = await call('create_weave_pattern', { ...twill, tieup: [[1], [2], [3], [4]], treadling: [1] })
    expect(r.content[0].text).toMatch(/warp 16, weft 3 threads \(long floats may snag/)
  })

  it('returns errors the AI can act on', async () => {
    const r = await call('create_weave_pattern', { ...twill, threading: [1, 9] })
    expect(r.isError).toBe(true)
    expect(r.content[0].text).toBe('threading uses shaft 9 but there are only 4 shafts')
  })

  describe('export_weave_pattern', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weave-mcp-'))

    it('returns file text when no path is given', async () => {
      const r = await call('export_weave_pattern', { ...twill, format: 'liftplan' })
      expect(r.content[0].text).toContain('[LIFTPLAN]')
    })

    it('writes files, refusing to overwrite or use the wrong extension', async () => {
      const path = join(dir, 'twill.wif')
      expect((await call('export_weave_pattern', { ...twill, format: 'wif', path })).content[0].text).toContain(path)
      expect(readFileSync(path, 'utf8')).toContain('[TIEUP]')
      expect((await call('export_weave_pattern', { ...twill, format: 'wif', path })).content[0].text).toMatch(
        /already exists/,
      )
      expect(
        (await call('export_weave_pattern', { ...twill, format: 'wif', path, overwrite: true })).isError,
      ).toBeFalsy()
      const wrong = await call('export_weave_pattern', { ...twill, format: 'json', path: join(dir, 'x.wif') })
      expect(wrong.content[0].text).toMatch(/should end in \.weave\.json/)
    })

    it('reads a WIF back as pattern fields that recreate the same cloth', async () => {
      const path = join(dir, 'green.wif')
      writeFileSync(path, toWif('Green blocks', greenBlocks()))
      const r = await call('read_weave_file', { path })
      expect(r.content[0].text).toContain('"Green blocks": 4 shafts')
      const spec = JSON.parse((r.content[2].text ?? '').replace(/^Pattern fields:\n/, ''))
      expect(computeDrawdown(specToDraft(spec))).toEqual(computeDrawdown(greenBlocks()))
    })

    it('reads from text and needs exactly one source', async () => {
      const r = await call('read_weave_file', { content: toWif('T', specToDraft(twill)) })
      expect(r.content[0].text).toContain('"T": 4 shafts')
      expect((await call('read_weave_file', {})).content[0].text).toBe('Give exactly one of path or content')
    })
  })
})

describe('longestFloats', () => {
  it('measures the twill', () => {
    expect(longestFloats(specToDraft(twill))).toEqual({ warp: 2, weft: 2 })
  })
})
