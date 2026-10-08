import { type Draft, parseDraft } from './weave'

/** The pattern being worked on, saved or not, so it comes back when the page is reopened on this device. */
export interface CurrentProject {
  /** Name it was saved or loaded as, or null if it hasn't been saved. */
  name: string | null
  draft: Draft
  /** What Reset returns to. */
  baseline: Draft
}

export const CURRENT_KEY = 'weave-current'

/** Reads a stored project, or null if there isn't a valid one. */
export function parseCurrent(json: string | null): CurrentProject | null {
  if (!json) return null
  try {
    const data = JSON.parse(json) as Record<string, unknown>
    const draft = parseDraft(data.draft)
    let baseline = draft
    try {
      baseline = parseDraft(data.baseline)
    } catch {
      // an unreadable baseline just means Reset has nothing older to go back to
    }
    return { name: typeof data.name === 'string' && data.name ? data.name : null, draft, baseline }
  } catch {
    return null
  }
}

export function loadCurrent(): CurrentProject | null {
  try {
    return parseCurrent(localStorage.getItem(CURRENT_KEY))
  } catch {
    return null
  }
}

export function saveCurrent(project: CurrentProject) {
  try {
    // Only store the baseline when it differs, which halves the size in the usual case.
    const { name, draft, baseline } = project
    localStorage.setItem(CURRENT_KEY, JSON.stringify(baseline === draft ? { name, draft } : project))
  } catch {
    // too big or storage blocked: the pattern just won't be restored
  }
}
