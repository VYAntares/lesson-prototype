/** Deterministic shuffle: the same seed and salt always give the same order. */
export function seededShuffle<T>(items: readonly T[], seed: number, salt: string): T[] {
  let state = seed >>> 0
  for (const ch of salt) state = Math.imul(state ^ ch.charCodeAt(0), 2654435761) >>> 0
  const next = () => {
    state = (state + 1831565813) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
