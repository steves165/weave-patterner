/**
 * The feedback form's endpoint (a Lambda function URL, infra/feedback/main.tf): checks a message from the form in
 * Weave, Knit or Sew Patterner and opens it as a GitHub issue, with a token limited to creating issues on the repo.
 * The token is read from SSM Parameter Store, once per container.
 *
 * Abuse is kept small here (allowed origins, a hidden honeypot field, length limits, a few messages per visitor an
 * hour) and kept free by the infrastructure (one copy at a time, and a kill switch on the request count).
 */

const KINDS = { problem: 'bug', idea: 'enhancement', other: null }
const APPS = { weave: 'Weave Patterner', knit: 'Knit Patterner', sew: 'Sew Patterner' }
export const MIN = 10
export const MAX = 4000
/** Messages a visitor may send in an hour (per warm container, which with one copy at a time is nearly all). */
export const PER_HOUR = 3

/** Checks what the form sent. Returns the message to file, `{ spam: true }` for a filled-in honeypot, or `{ error }`. */
export function check(input) {
  if (!input || typeof input !== 'object') return { error: 'Send the form as JSON.' }
  if (input.website) return { spam: true }
  const message = typeof input.message === 'string' ? input.message.trim() : ''
  if (message.length < MIN) return { error: `Write at least ${MIN} characters.` }
  if (message.length > MAX) return { error: `Keep it under ${MAX} characters.` }
  if (!Object.hasOwn(KINDS, input.kind)) return { error: 'Choose problem, idea or other.' }
  if (!Object.hasOwn(APPS, input.app)) return { error: 'Unknown app.' }
  const version = typeof input.version === 'string' && /^[\w.-]{1,20}$/.test(input.version) ? input.version : null
  const platform = input.platform === 'desktop' ? 'desktop' : 'web'
  return { message, kind: input.kind, app: input.app, version, platform }
}

/**
 * The GitHub issue for a checked message. @mentions are broken so a message can't ping people, and the title is the
 * message's first line.
 */
export function issueFor({ message, kind, app, version, platform }) {
  const safe = message.replace(/@(?=\w)/g, '@​')
  const first = safe.split('\n')[0].trim()
  const title = first.length > 70 ? `${first.slice(0, 69).trimEnd()}…` : first
  const where = `${APPS[app]} (${platform === 'desktop' ? 'desktop app' : 'website'}${version ? `, version ${version}` : ''})`
  return {
    title: `Feedback: ${title}`,
    body: `${safe}\n\n---\n_Sent with the feedback form in ${where}._`,
    labels: ['feedback', ...(KINDS[kind] ? [KINDS[kind]] : [])],
  }
}

const sent = new Map()

/** Whether this visitor may send another message now (and counts it if so). */
export function allow(visitor, now = Date.now()) {
  const recent = (sent.get(visitor) ?? []).filter((t) => now - t < 3_600_000)
  if (recent.length >= PER_HOUR) return false
  sent.set(visitor, [...recent, now])
  if (sent.size > 5000) sent.clear()
  return true
}

let token

async function githubToken() {
  if (token) return token
  const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm')
  const out = await new SSMClient({}).send(
    new GetParameterCommand({ Name: process.env.TOKEN_PARAMETER, WithDecryption: true }),
  )
  token = out.Parameter.Value
  return token
}

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export async function handler(event) {
  const origins = (process.env.ALLOWED_ORIGINS ?? '').split(',')
  const origin = event.headers?.origin ?? ''
  if (event.requestContext?.http?.method !== 'POST') return reply(405, { error: 'POST the form.' })
  if (!origins.includes(origin)) return reply(403, { error: 'Not from the app.' })

  let input
  try {
    input = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString() : (event.body ?? ''))
  } catch {
    return reply(400, { error: 'Send the form as JSON.' })
  }
  const checked = check(input)
  // A bot that filled in the hidden field is told it worked, and nothing is filed.
  if (checked.spam) return reply(200, { url: null })
  if (checked.error) return reply(400, { error: checked.error })
  if (!allow(event.requestContext?.http?.sourceIp ?? 'unknown'))
    return reply(429, { error: 'That’s a lot of feedback: please try again in an hour.' })

  const res = await fetch(`https://api.github.com/repos/${process.env.REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await githubToken()}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'weave-patterner-feedback',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(issueFor(checked)),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    console.error('GitHub said', res.status, await res.text())
    return reply(502, { error: 'GitHub didn’t take it: please try again later.' })
  }
  return reply(200, { url: (await res.json()).html_url })
}
