import type { CSSProperties } from 'react'

/** Accent colours used to tell steps / groups apart (CSS variable --review-color). */
export const REVIEW_COLORS = ['#a5b4fc', '#67e8f9', '#86efac', '#fcd34d', '#fda4af', '#d8b4fe']

export const reviewColor = (index: number) =>
  ({ '--review-color': REVIEW_COLORS[index % REVIEW_COLORS.length] }) as CSSProperties
