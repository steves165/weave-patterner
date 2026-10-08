let audio: AudioContext | null = null

/**
 * A short two-note chime (and a buzz on phones that can) to say the weft colour changes on this pick. Browsers only
 * allow sound after the person has interacted with the page, which pressing "Next pick" counts as.
 */
export function playChime() {
  try {
    audio ??= new AudioContext()
    const now = audio.currentTime
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      const start = now + i * 0.16
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3)
      osc.connect(gain).connect(audio.destination)
      osc.start(start)
      osc.stop(start + 0.32)
    }
  } catch {
    // no sound available: the on-screen notice still shows
  }
  navigator.vibrate?.(200)
}

const KEY = 'weave-chime'

/** Whether to chime on weft changes; on unless turned off. */
export function loadChime(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveChime(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // just won't be remembered
  }
}
