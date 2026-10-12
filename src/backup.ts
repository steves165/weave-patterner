/**
 * A backup file: every pattern saved in Weave, Knit and Sew Patterner in this browser, with their settings, to keep
 * safe or to open on another device. Restoring adds its patterns beside the ones there.
 */
import { applyMove, collectBundle, type MoveData, type MoveResult } from './move'

export interface Backup {
  type: 'patterner-backup'
  version: 1
  /** When it was made (ISO). */
  created: string
  local: Record<string, string>
  patterns: MoveData['patterns']
}

/** How many patterns a backup holds, per app. */
export interface BackupCounts {
  weave: number
  knit: number
  sew: number
}

export const countsOf = (patterns: MoveData['patterns']): BackupCounts => ({
  weave: patterns['weave-patterner']?.length ?? 0,
  knit: patterns['knit-patterner']?.length ?? 0,
  sew: patterns['sew-patterner']?.length ?? 0,
})

/** "3 weaving drafts, 1 knitting chart and no sewing projects". */
export function describeCounts(c: BackupCounts): string {
  const one = (n: number, what: string) => `${n || 'no'} ${what}${n === 1 ? '' : 's'}`
  return `${one(c.weave, 'weaving draft')}, ${one(c.knit, 'knitting chart')} and ${one(c.sew, 'sewing project')}`
}

/** This browser's patterns and settings, as a backup. */
export async function makeBackup(now = new Date()): Promise<Backup> {
  const { local, patterns } = await collectBundle()
  return { type: 'patterner-backup', version: 1, created: now.toISOString(), local, patterns }
}

/** The backup's file name, dated: patterner-backup-2026-10-12.json. */
export const backupFileName = (b: Backup) => `patterner-backup-${b.created.slice(0, 10)}.json`

/** Reads a backup file's text, or says why it isn't one. */
export function parseBackup(text: string): Backup {
  let x: unknown
  try {
    x = JSON.parse(text)
  } catch {
    throw new Error('This isn’t a Patterner backup file: choose the .json file made by “Download backup”.')
  }
  const b = x as Backup
  if (!b || typeof b !== 'object' || b.type !== 'patterner-backup')
    throw new Error('This isn’t a Patterner backup file: choose the .json file made by “Download backup”.')
  if (b.version !== 1) throw new Error('This backup was made by a newer version. Reload the page and try again.')
  if (!b.local || typeof b.local !== 'object' || !b.patterns || typeof b.patterns !== 'object')
    throw new Error('This backup file is damaged and can’t be restored.')
  for (const list of Object.values(b.patterns))
    if (!Array.isArray(list)) throw new Error('This backup file is damaged and can’t be restored.')
  return b
}

/** Adds a backup's patterns, and (unless told not to) its settings, to this browser. */
export const restoreBackup = (b: Backup, { settings = true } = {}): Promise<MoveResult> =>
  applyMove({ type: 'patterner-move', version: 1, local: b.local, patterns: b.patterns }, { kind: 'backup', settings })
