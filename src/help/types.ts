/**
 * A piece of a help topic. Text can hold **bold** and links to other topics as [[topic-id|words]].
 * - p: a paragraph; h: a subheading; list: bullet points; steps: numbered steps; tip: a highlighted tip;
 *   keys: keyboard shortcuts (the keys, what they do); terms: a glossary (the word, what it means).
 */
export type Block =
  | { p: string }
  | { h: string }
  | { list: string[] }
  | { steps: string[] }
  | { tip: string }
  | { keys: [string, string][] }
  | { terms: [string, string][] }

export interface Topic {
  id: string
  title: string
  /** One line, shown under the title in the list and in search results. */
  summary: string
  /** Extra words people might search for. */
  keywords?: string[]
  body: Block[]
}

/** The words in a topic, for searching. */
export function topicText(t: Topic): string {
  const parts: string[] = [t.title, t.summary, ...(t.keywords ?? [])]
  for (const b of t.body) {
    if ('p' in b) parts.push(b.p)
    else if ('h' in b) parts.push(b.h)
    else if ('tip' in b) parts.push(b.tip)
    else if ('list' in b) parts.push(...b.list)
    else if ('steps' in b) parts.push(...b.steps)
    else if ('keys' in b) parts.push(...b.keys.flat())
    else parts.push(...b.terms.flat())
  }
  return parts.join(' ').toLowerCase()
}

/** Topics matching every word of the search, the best (title matches) first. */
export function searchTopics(topics: Topic[], query: string): Topic[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return topics
  const scored = topics
    .map((t) => {
      const text = topicText(t)
      if (!words.every((w) => text.includes(w))) return null
      const title = `${t.title} ${(t.keywords ?? []).join(' ')}`.toLowerCase()
      // The whole search in the title counts most, then each word in the title or keywords.
      const phrase = t.title.toLowerCase().includes(words.join(' ')) ? 10 : 0
      return { t, score: phrase + words.filter((w) => title.includes(w)).length }
    })
    .filter((x): x is { t: Topic; score: number } => x !== null)
  return scored.sort((a, b) => b.score - a.score).map((x) => x.t)
}
