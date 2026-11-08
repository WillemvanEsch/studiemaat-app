/**
 * Indeling voor tablets (iPad, Samsung Galaxy Tab enz.).
 *
 * We kijken naar de kortste kant van het scherm: een telefoon die je kantelt is breed, maar blijft een telefoon.
 * Vanaf 600 punten (de grens die Android ook voor tablets gebruikt) krijg je:
 * - grotere letters en meer ruimte, zodat uittreksel, vragen en toetsen lezen zoals op de website op een computer;
 * - lessen, begrippen en foto's in twee kolommen.
 * De kolom blijft hooguit MaxContentWidth breed en staat in het midden, ook liggend.
 */

import { useWindowDimensions } from 'react-native'

/** Hoeveel groter de letters op een tablet zijn (bovenop de lettergrootte die je in je telefoon hebt gekozen). */
export const TABLET_TEXT_SCALE = 1.15

export function isTabletSize(width: number, height: number) {
  return Math.min(width, height) >= 600
}

export function useLayout() {
  const { width, height } = useWindowDimensions()
  const isTablet = isTabletSize(width, height)
  return { isTablet, columns: isTablet ? 2 : 1, textScale: isTablet ? TABLET_TEXT_SCALE : 1 }
}
