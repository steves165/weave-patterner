/** How a yarn looks and feels in the 3D preview. */
export type Texture = 'smooth' | 'wool' | 'silk' | 'slub' | 'boucle'

interface TextureSpec {
  name: string
  /** Surface roughness for the 3D material: 0 is mirror-like, 1 completely matte. */
  roughness: number
  /** Extra sheen on the surface (0–1), for silk's glow. */
  sheen: number
  /** How strongly the twist of the plies shows as stripes along the yarn (0–1). */
  twist: number
}

export const TEXTURES: Record<Texture, TextureSpec> = {
  smooth: { name: 'Smooth (cotton)', roughness: 0.75, sheen: 0, twist: 0.35 },
  wool: { name: 'Wool', roughness: 0.95, sheen: 0.15, twist: 0.2 },
  silk: { name: 'Silk', roughness: 0.3, sheen: 0.6, twist: 0.15 },
  slub: { name: 'Slub (linen)', roughness: 0.85, sheen: 0, twist: 0.25 },
  boucle: { name: 'Bouclé', roughness: 0.95, sheen: 0.1, twist: 0.1 },
}

export const isTexture = (v: unknown): v is Texture => typeof v === 'string' && v in TEXTURES

/** A repeatable pseudo-random number in [0, 1) for a thread and a position along it. */
function noise(seed: number, i: number) {
  const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Smoothly varying noise along a thread: `t` is a position in thread spacings. */
function smoothNoise(seed: number, t: number) {
  const i = Math.floor(t)
  const f = t - i
  const s = f * f * (3 - 2 * f)
  return noise(seed, i) * (1 - s) + noise(seed, i + 1) * s
}

/**
 * How much thicker or thinner a thread is at a point: 1 is its normal size. `along` is the distance along the thread
 * in thread spacings and `around` the angle round it (0–1); `seed` makes each thread differ.
 * - slub: long thick and thin stretches, as in linen.
 * - bouclé: lumpy loops every half thread or so, all round the yarn.
 * - wool: a slightly uneven, hairy surface.
 * - smooth and silk: even.
 */
export function thickness(texture: Texture, seed: number, along: number, around: number): number {
  switch (texture) {
    case 'slub':
      return 0.8 + 0.45 * smoothNoise(seed, along / 2.5)
    case 'boucle': {
      const loop = smoothNoise(seed, along * 2.2 + around * 3)
      return 0.85 + 0.5 * loop * loop
    }
    case 'wool':
      return 0.94 + 0.12 * noise(seed, Math.round(along * 12) * 7 + Math.round(around * 8))
    default:
      return 1
  }
}
