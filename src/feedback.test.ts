import { describe, expect, it } from 'vitest'
import { appAt } from './feedback'

describe('appAt', () => {
  it('knows the app from the address, on the site or in the desktop app', () => {
    expect(appAt('/')).toBe('weave')
    expect(appAt('/knit/')).toBe('knit')
    expect(appAt('/sew/')).toBe('sew')
    expect(appAt('/weave-patterner/knit/')).toBe('knit')
  })
})
