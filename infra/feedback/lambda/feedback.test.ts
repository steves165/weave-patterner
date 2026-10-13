import { describe, expect, it } from 'vitest'
// @ts-expect-error: plain JavaScript, run by Lambda as it is
import { allow, check, handler, issueFor, MAX, PER_HOUR } from './feedback.mjs'

const good = { kind: 'idea', app: 'knit', message: 'A chart for cables, please', version: '1.1.0', platform: 'web' }

describe('check', () => {
  it('accepts a message from the form', () => {
    expect(check(good)).toEqual({ ...good, message: 'A chart for cables, please' })
  })
  it('turns away short, long, unknown and malformed messages', () => {
    expect(check({ ...good, message: ' hi ' }).error).toMatch(/at least/)
    expect(check({ ...good, message: 'x'.repeat(MAX + 1) }).error).toMatch(/under/)
    expect(check({ ...good, kind: 'spam' }).error).toBeTruthy()
    expect(check({ ...good, app: 'crochet' }).error).toBeTruthy()
    expect(check(null).error).toBeTruthy()
    expect(check({ ...good, kind: 'toString' }).error).toBeTruthy()
  })
  it('spots the honeypot, and drops a version that is not one', () => {
    expect(check({ ...good, website: 'http://spam' })).toEqual({ spam: true })
    expect(check({ ...good, version: '<script>' }).version).toBeNull()
    expect(check({ ...good, platform: 'anything' }).platform).toBe('web')
  })
})

describe('issueFor', () => {
  it('titles the issue with the first line, labels it, and says where it came from', () => {
    const issue = issueFor(
      check({ ...good, kind: 'problem', message: 'Undo is greyed out\nafter loading', platform: 'desktop' }),
    )
    expect(issue.title).toBe('Feedback: Undo is greyed out')
    expect(issue.labels).toEqual(['feedback', 'bug'])
    expect(issue.body).toContain('Knit Patterner (desktop app, version 1.1.0)')
  })
  it('shortens long titles and breaks @mentions', () => {
    const issue = issueFor(check({ ...good, kind: 'other', message: `@someone ${'word '.repeat(30)}` }))
    expect(issue.title.length).toBeLessThanOrEqual(80)
    expect(issue.title).toMatch(/…$/)
    expect(issue.body).not.toMatch(/@someone/)
    expect(issue.labels).toEqual(['feedback'])
  })
})

describe('allow', () => {
  it(`lets a visitor send ${PER_HOUR} an hour`, () => {
    const t = 1_000_000_000
    for (let i = 0; i < PER_HOUR; i++) expect(allow('1.2.3.4', t + i)).toBe(true)
    expect(allow('1.2.3.4', t + 10)).toBe(false)
    expect(allow('5.6.7.8', t + 10)).toBe(true)
    expect(allow('1.2.3.4', t + 3_600_001)).toBe(true)
  })
})

describe('handler', () => {
  process.env.ALLOWED_ORIGINS = 'https://weave-patterner.com,app://patterner'
  const event = (body: unknown, origin = 'https://weave-patterner.com') => ({
    headers: { origin },
    requestContext: { http: { method: 'POST', sourceIp: '9.9.9.9' } },
    body: JSON.stringify(body),
  })
  it('turns away other sites, bad messages and bots without calling GitHub', async () => {
    expect((await handler(event(good, 'https://elsewhere.example'))).statusCode).toBe(403)
    expect((await handler(event({ ...good, message: 'short' }))).statusCode).toBe(400)
    const bot = await handler(event({ ...good, website: 'x' }))
    expect([bot.statusCode, JSON.parse(bot.body)]).toEqual([200, { url: null }])
  })
})
