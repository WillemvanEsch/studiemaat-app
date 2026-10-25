/**
 * Arceerkleur: de kleur waarmee ==de belangrijkste stof== in uittreksels wordt gemarkeerd.
 * Zelfde kleuren als op de website (studypro src/components/AppearanceSettings.tsx). De keuze staat
 * op dit toestel; elk scherm dat useMarkColor gebruikt, kleurt meteen mee als je hem wijzigt.
 */

import { useSyncExternalStore } from 'react'

import { MarkColors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { getMarkColor, saveMarkColor, type MarkColor } from '@/lib/storage'

export const MARK_OPTIONS: { id: MarkColor; label: string }[] = [
  { id: 'geel', label: 'Geel' },
  { id: 'roze', label: 'Roze' },
  { id: 'groen', label: 'Groen' },
  { id: 'blauw', label: 'Blauw' },
  { id: 'oranje', label: 'Oranje' },
]

let current: MarkColor = 'geel'
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function set(v: MarkColor) {
  current = v
  listeners.forEach((l) => l())
}

/** Bij het opstarten: de bewaarde keuze inlezen. */
export async function loadMarkColor() {
  set(await getMarkColor())
}

export async function setMarkColor(v: MarkColor) {
  set(v)
  await saveMarkColor(v)
}

/** De gekozen arceerkleur, en de kleur van de markering en de tekst erop in licht of donker. */
export function useMarkColor() {
  const mark = useSyncExternalStore(subscribe, () => current)
  const scheme = useColorScheme()
  const fill = MarkColors[mark][scheme === 'dark' ? 'dark' : 'light']
  return { mark, ...fill }
}

export type { MarkColor }
