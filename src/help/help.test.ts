import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { KNIT_HELP } from './knitHelp'
import { KNIT_TOUR, WEAVE_TOUR } from './tours'
import { searchTopics, type Topic, topicText } from './types'
import { WEAVE_HELP } from './weaveHelp'

/** Every source file under a folder. */
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !f.includes('.test.') ? [p] : []
  })

/** The help topics named in the code (data-help="x", help="x", help={'x'}), by file. */
function helpMarks(paths: string[]): string[] {
  const found: string[] = []
  for (const p of paths) {
    const text = readFileSync(p, 'utf8')
    for (const m of text.matchAll(/(?:data-help|\bhelp)=(?:"([a-z0-9-]+)"|\{'([a-z0-9-]+)'\})/g))
      found.push(m[1] ?? m[2])
    for (const m of text.matchAll(/openHelp\('([a-z0-9-]+)'\)/g)) found.push(m[1])
  }
  return [...new Set(found)]
}

const links = (topics: Topic[]) =>
  topics.flatMap((t) => [...topicText(t).matchAll(/\[\[([^|\]]+)\|/g)].map((m) => [t.id, m[1]] as const))

describe('help', () => {
  for (const [app, topics] of [
    ['weave', WEAVE_HELP],
    ['knit', KNIT_HELP],
  ] as const) {
    it(`${app}: every topic has a unique id, a title, a summary and something to say`, () => {
      const ids = topics.map((t) => t.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const t of topics) {
        expect(t.title, t.id).not.toBe('')
        expect(t.summary, t.id).not.toBe('')
        expect(t.body.length, t.id).toBeGreaterThan(0)
      }
      expect(ids).toContain('start')
      expect(ids).toContain('shortcuts')
      expect(ids).toContain('glossary')
    })

    it(`${app}: links between topics go somewhere`, () => {
      const ids = new Set([...topics.map((t) => t.id), 'tour'])
      for (const [from, to] of links(topics)) expect(ids.has(to), `${from} links to ${to}`).toBe(true)
    })
  }

  it('every part of the app marked for F1 help has a topic', () => {
    const weaveIds = new Set(WEAVE_HELP.map((t) => t.id))
    const knitIds = new Set(KNIT_HELP.map((t) => t.id))
    const knitFiles = files('src/knit')
    const weaveFiles = [...files('src/components'), 'src/App.tsx']
    expect(helpMarks(weaveFiles).length).toBeGreaterThan(8)
    expect(helpMarks(knitFiles).length).toBeGreaterThan(8)
    for (const id of helpMarks(weaveFiles)) expect(weaveIds.has(id), `weave: ${id}`).toBe(true)
    for (const id of helpMarks(knitFiles)) expect(knitIds.has(id), `knit: ${id}`).toBe(true)
    // The shared parts (the status bar) are used by both apps.
    expect(knitIds.has('checks') && weaveIds.has('checks')).toBe(true)
  })

  it('finds topics by any of their words, title matches first', () => {
    expect(searchTopics(WEAVE_HELP, 'lift plan').map((t) => t.id)[0]).toBe('treadling')
    expect(searchTopics(WEAVE_HELP, 'WIF').map((t) => t.id)).toContain('files')
    expect(searchTopics(KNIT_HELP, 'bobble').map((t) => t.id)).toContain('stitches')
    expect(searchTopics(KNIT_HELP, 'zzzz')).toEqual([])
    expect(searchTopics(KNIT_HELP, '')).toHaveLength(KNIT_HELP.length)
  })

  it('every tour step says something, and most point at a part of the screen', () => {
    for (const steps of [WEAVE_TOUR, KNIT_TOUR]) {
      for (const s of steps) expect(s.text.length).toBeGreaterThan(20)
      expect(steps.filter((s) => s.target).length).toBeGreaterThan(steps.length - 2)
    }
  })
})
