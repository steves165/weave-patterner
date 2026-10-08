import { computeDrawdown, type Draft } from './weave'

/**
 * Sheds on a rigid-heddle loom with one heddle, a pick-up stick behind it and (when needed) a heddle rod in front:
 * - up: heddle up, lifting the ends in the holes
 * - down: heddle down, lifting the ends in the slots
 * - stick: heddle in neutral, pick-up stick turned on edge, lifting only the slot ends it picked up
 * - up-stick: heddle up with the pick-up stick slid forward flat, lifting the hole ends and the picked-up ends
 * - rod, up-rod: the same with the heddle rod (its own set of slot ends) lifted instead of the stick
 * - stick-rod, up-stick-rod: both together
 */
export type RhShed = 'up' | 'down' | 'stick' | 'up-stick' | 'rod' | 'up-rod' | 'stick-rod' | 'up-stick-rod'

export const RH_SHED_TEXT: Record<RhShed, string> = {
  up: 'Heddle up',
  down: 'Heddle down',
  stick: 'Heddle neutral, pick-up stick on edge',
  'up-stick': 'Heddle up, pick-up stick slid forward',
  rod: 'Heddle neutral, heddle rod lifted',
  'up-rod': 'Heddle up, heddle rod lifted',
  'stick-rod': 'Heddle neutral, pick-up stick on edge and heddle rod lifted',
  'up-stick-rod': 'Heddle up, pick-up stick slid forward and heddle rod lifted',
}

export interface RigidHeddlePlan {
  /** Whether end 1 goes in a hole (then alternating slot, hole, …) or a slot. */
  firstEnd: 'hole' | 'slot'
  /** 1-based slot ends to pick up on the stick, in end order. */
  pickUp: number[]
  /** 1-based slot ends for the heddle rod, when a second set is needed (empty otherwise). */
  rod: number[]
  /** The shed for each pick (null for an empty pick). */
  sheds: (RhShed | null)[]
}

const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i])
const key = (a: number[]) => a.join(',')

/**
 * Works out whether a draft can be woven on a rigid-heddle loom, and how. Every end must be threaded, alternating
 * hole and slot. Each pick must lift the holes, the slots, or a set of slot ends (with or without the holes). A
 * pick-up stick holds one set of slot ends and a heddle rod another, and both can be lifted together, so up to two
 * sets (and the two combined) are possible. Returns the plan, or a reason it can't be done.
 */
export function rigidHeddlePlan(d: Draft, dd = computeDrawdown(d)): { plan: RigidHeddlePlan } | { reason: string } {
  const unthreaded = d.threading.findIndex((s) => s < 0)
  if (unthreaded >= 0) return { reason: `End ${unthreaded + 1} is unthreaded; every end goes in a hole or slot.` }
  const all = Array.from({ length: d.ends }, (_, e) => e)
  let firstFailure = ''
  for (const firstEnd of ['hole', 'slot'] as const) {
    const inHole = (e: number) => (e % 2 === 0) === (firstEnd === 'hole')
    const holes = all.filter(inHole)
    const slots = all.filter((e) => !inHole(e))
    // First pass: what each pick needs. Picks lifting a set of slot ends (alone or with the holes) need a stick or rod.
    const needs: ({ base: 'up' | 'down' | 'neutral' | 'with-up'; set: number[] } | null)[] = []
    let failure = ''
    for (let p = 0; p < d.picks && !failure; p++) {
      if (!d.treadling[p].some(Boolean)) {
        needs.push(null)
        continue
      }
      const lifted = all.filter((e) => dd[p][e])
      const liftedSlots = lifted.filter((e) => !inHole(e))
      const liftedHoles = lifted.filter(inHole)
      const allHoles = same(liftedHoles, holes)
      if (allHoles && liftedSlots.length === 0) needs.push({ base: 'up', set: [] })
      else if (liftedHoles.length === 0 && same(liftedSlots, slots)) needs.push({ base: 'down', set: [] })
      else if (liftedHoles.length === 0) needs.push({ base: 'neutral', set: liftedSlots })
      else if (allHoles) needs.push({ base: 'with-up', set: liftedSlots })
      else failure = `Pick ${p + 1} lifts only some of the hole ends, which a rigid heddle can't do.`
    }
    if (!failure) {
      // The different sets of slot ends needed, in order of first use. The first goes on the stick, a second on a
      // heddle rod; a third is only possible if it's the two together.
      const sets = [
        ...new Map(needs.flatMap((n) => (n?.set.length ? [n.set] : [])).map((set) => [key(set), set])).values(),
      ]
      const [stick = [], rod = []] = sets.filter((set, _, list) => {
        // Leave out any set that is the union of two others: it's the stick and rod together.
        const others = list.filter((o) => o !== set)
        return !others.some((a) =>
          others.some((b) => a !== b && key([...new Set([...a, ...b])].sort((x, y) => x - y)) === key(set)),
        )
      })
      const both = key([...new Set([...stick, ...rod])].sort((x, y) => x - y))
      const shedFor = (n: { base: string; set: number[] }): RhShed | null => {
        if (n.base === 'up') return 'up'
        if (n.base === 'down') return 'down'
        const up = n.base === 'with-up' ? 'up-' : ''
        if (key(n.set) === key(stick)) return `${up}stick` as RhShed
        if (rod.length && key(n.set) === key(rod)) return `${up}rod` as RhShed
        if (rod.length && key(n.set) === both) return `${up}stick-rod` as RhShed
        return null
      }
      const sheds = needs.map((n) => (n ? shedFor(n) : null))
      const impossible = needs.findIndex((n, p) => n && !sheds[p])
      if (impossible < 0)
        return { plan: { firstEnd, pickUp: stick.map((e) => e + 1), rod: rod.map((e) => e + 1), sheds } }
      failure = `Pick ${impossible + 1} needs a third set of picked-up ends; a pick-up stick and a heddle rod give two.`
    }
    firstFailure ||= failure
  }
  return { reason: firstFailure }
}
