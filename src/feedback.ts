import { DESKTOP } from './platform'

/**
 * The feedback form's endpoint (infra/feedback), which opens what's sent as a GitHub issue. Without one set at build
 * time (VITE_FEEDBACK_URL), there's no Feedback link.
 */
export const FEEDBACK_URL: string | null = import.meta.env.VITE_FEEDBACK_URL || null

export type FeedbackKind = 'problem' | 'idea' | 'other'
export type FeedbackApp = 'weave' | 'knit' | 'sew'

/** The app a page belongs to, from its address: Knit Patterner at knit/, Sew Patterner at sew/. */
export function appAt(pathname: string): FeedbackApp {
  if (/\/knit\//.test(pathname)) return 'knit'
  if (/\/sew\//.test(pathname)) return 'sew'
  return 'weave'
}

/** Sends feedback. Resolves to the new issue's address, or throws with a message to show. */
export async function sendFeedback(kind: FeedbackKind, message: string, website = ''): Promise<string | null> {
  if (!FEEDBACK_URL) throw new Error('Feedback isn’t set up in this version.')
  let res: Response
  try {
    res = await fetch(FEEDBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        message,
        app: appAt(location.pathname),
        version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined,
        platform: DESKTOP ? 'desktop' : 'web',
        website,
      }),
    })
  } catch {
    throw new Error('Couldn’t reach the feedback service: check your connection and try again.')
  }
  const body = (await res.json().catch(() => ({}))) as { url?: string | null; error?: string }
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong: please try again later.')
  return body.url ?? null
}
