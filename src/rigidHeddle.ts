import { computeDrawdown, type Draft } from './weave'

/**
 * Sheds on a rigid-heddle loom with one heddle and one pick-up stick behind it:
 * - up: heddle up, lifting the ends in the holes
 * - down: heddle down, lifting the ends in the slots
 * - stick: heddle in neutral, pick-up stick turned on edge, lifting only the slot ends it picked up
 * - up-stick: heddle up with the pick-up stick slid forward flat, lifting the hole ends and the picked-up ends
 */
export type RhShed = 'up' | 'down' | 'stick' | 'up-stick'

export const RH_SHED_TEXT: Record<RhShed, string> = {
  up: 'Heddle up',
  down: 'Heddle down',
  stick: 'Heddle neutral, pick-up stick on edge',
  'up-stick': 'Heddle up, pick-up stick slid forward',
}

export interface RigidHeddlePlan {
  /** Whether end 1 goes in a hole (then alternating slot, hole, …) or a slot. */
  firstEnd: 'hole' | 'slot'
  /** 1-based slot ends to pick up on the stick, in end order. */
  pickUp: number[]
  /** The shed for each pick (null for an empty pick). */
  sheds: (RhShed | null)[]
}

const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i])

/**
 * Works out whether a draft can be woven on a rigid-heddle loom with one pick-up stick, and how. Every end
 * must be threaded, alternating hole and slot; every pick must lift the holes, the slots, a fixed set of slot ends
 * (the pick-up stick), or the holes plus that set. Returns the plan, or a reason it can't be done.
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
    let pickUp: number[] | null = null
    const sheds: (RhShed | null)[] = []
    let failure = ''
    for (let p = 0; p < d.picks && !failure; p++) {
      if (!d.treadling[p].some(Boolean)) {
        sheds.push(null)
        continue
      }
      const lifted = all.filter((e) => dd[p][e])
      // Slot ends lifted, and whether every hole end (and no other) is up too.
      const liftedSlots = lifted.filter((e) => !inHole(e))
      const liftedHoles = lifted.filter(inHole)
      const allHoles = same(liftedHoles, holes)
      let shed: RhShed | null = null
      if (allHoles && liftedSlots.length === 0) shed = 'up'
      else if (liftedHoles.length === 0 && same(liftedSlots, slots)) shed = 'down'
      else if (liftedHoles.length === 0 || allHoles) {
        // Needs the pick-up stick: the same slot ends every time it's used.
        if (pickUp && !same(pickUp, liftedSlots)) {
          failure = `Pick ${p + 1} needs a different set of picked-up ends from an earlier pick; that needs a second pick-up stick or heddle rods.`
        } else {
          pickUp = liftedSlots
          shed = allHoles ? 'up-stick' : 'stick'
        }
      } else failure = `Pick ${p + 1} lifts only some of the hole ends, which a rigid heddle can't do.`
      sheds.push(shed)
    }
    if (!failure) return { plan: { firstEnd, pickUp: (pickUp ?? []).map((e) => e + 1), sheds } }
    firstFailure ||= failure
  }
  return { reason: firstFailure }
}
