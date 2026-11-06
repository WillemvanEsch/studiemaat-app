/**
 * Hoe lang het maken van een les ongeveer duurt. De website rekent het uit uit echte lessen
 * (`/mobile/options` lessonEta, `/mobile/lessons/[id]` processingEtaSeconds); dit zijn dezelfde teksten als op de site.
 */

import type { Options } from '@/api/types'

/** Als de website (nog) geen schatting meestuurt. Zelfde terugval als studypro `DEFAULT_ETA`. */
const DEFAULT_ETA = { base: 45, perPage: 12 }

/** Vanaf dit aantal foto's de tip "maak liever een les per hoofdstuk" (website stuurt splitTipFrom mee). */
export const DEFAULT_SPLIT_TIP_FROM = 13

export function lessonEtaSeconds(options: Options | undefined, pages: number) {
  const m = options?.lessonEta ?? DEFAULT_ETA
  return Math.round(m.base + m.perPage * Math.max(1, pages))
}

/** "ongeveer een minuut", "ongeveer 4 minuten". Naar boven afgerond: liever eerder klaar dan later. */
export function etaText(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  return minutes === 1 ? 'ongeveer een minuut' : `ongeveer ${minutes} minuten`
}

/** "Nog ongeveer 3 minuten." / "Nog ongeveer 40 seconden." / "Bijna klaar…" */
export function remainingText(left: number) {
  if (left <= 5) return 'Bijna klaar…'
  if (left < 60) return `Nog ongeveer ${Math.round(left / 5) * 5 || 5} seconden.`
  const minutes = Math.round(left / 60)
  return minutes <= 1 ? 'Nog ongeveer een minuut.' : `Nog ongeveer ${minutes} minuten.`
}
