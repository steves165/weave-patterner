import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const { isNewer } = createRequire(import.meta.url)('./updates.cjs') as { isNewer: (a: string, b: string) => boolean }

describe('isNewer', () => {
  it('compares versions number by number, with or without a v', () => {
    expect(isNewer('v1.1.0', '1.0.0')).toBe(true)
    expect(isNewer('1.0.10', '1.0.9')).toBe(true)
    expect(isNewer('v2.0.0', '1.9.9')).toBe(true)
  })
  it('is false for the same or an older version', () => {
    expect(isNewer('v1.0.0', '1.0.0')).toBe(false)
    expect(isNewer('1.0.9', '1.0.10')).toBe(false)
    expect(isNewer('v0.9.0', '1.0.0')).toBe(false)
  })
  it('ignores a pre-release label', () => {
    expect(isNewer('1.1.0-beta.1', '1.0.0')).toBe(true)
    expect(isNewer('1.0.0-beta.1', '1.0.0')).toBe(false)
  })
})
