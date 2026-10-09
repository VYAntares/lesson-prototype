/** Round to one decimal, half up (avoids 12.25 → 12.2 float issues). */
export function roundScore(value: number) {
  return Math.floor(value * 10 + 0.5 + 1e-9) / 10
}

export function formatPercent(value: number, locale: string) {
  const n = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${n.format(roundScore(value))}%`
}

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}
