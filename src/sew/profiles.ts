import { cleanMeasurements, type Figure, type Measurements, WOMENS } from './measurements'

/** Measurements saved under a name, for anyone you sew for. */
export interface Profile {
  name: string
  m: Measurements
  figure: Figure
}

const KEY = 'sew-measurements'

export function loadProfiles(): Profile[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(list)) return []
    return list
      .filter((p) => p && typeof p.name === 'string' && p.name.trim())
      .map((p) => ({
        name: p.name,
        m: cleanMeasurements(p.m, WOMENS[3].m),
        figure: p.figure === 'chest' ? 'chest' : 'bust',
      }))
  } catch {
    return []
  }
}

/** Saves the list; false when this browser won't keep it. */
export function storeProfiles(list: Profile[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

/** The list with a profile added, or replaced if one has its name. */
export const withProfile = (list: Profile[], p: Profile) =>
  [...list.filter((x) => x.name.toLowerCase() !== p.name.toLowerCase()), p].sort((a, b) => a.name.localeCompare(b.name))
