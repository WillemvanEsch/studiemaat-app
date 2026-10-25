/** Datum als "25 oktober" (of "25 oktober 2025" als het een ander jaar is). */
export function formatDate(iso: string): string {
  // De database geeft soms "2026-10-25 11:19:09" (zonder T en tijdzone, in UTC).
  const d = new Date(/T/.test(iso) ? iso : iso.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return ''
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) })
}

export function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000))
}

/** Cijfer met komma: 7,5 */
export const gradeText = (g: number | null) => (g === null ? '–' : g.toFixed(1).replace('.', ','))

/** Vaste kleur per vak, zelfde berekening als de website (studypro format.ts subjectColor). Geeft een index in SubjectColors. */
export function subjectColorIndex(subject: string, count: number): number {
  let h = 0
  for (const c of subject.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h % count
}

/** Kleur van een cijfer: groen vanaf 6,5, oranje vanaf 5,5, anders rood (zoals op de website). */
export const gradeTone = (g: number | null): 'gradeGood' | 'gradeOk' | 'gradeBad' | 'textSecondary' =>
  g === null ? 'textSecondary' : g >= 6.5 ? 'gradeGood' : g >= 5.5 ? 'gradeOk' : 'gradeBad'

/** "zaterdag 25 oktober", voor boven de begroeting. */
export const todayText = () => new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
