/**
 * Licht, donker of automatisch. Appearance.setColorScheme zet de keuze voor de hele app, ook voor de
 * schermkoppen en het toetsenbord; useColorScheme (en dus useTheme) volgt hem vanzelf.
 */

import { Appearance } from 'react-native'

import { getWeergave, saveWeergave, type Weergave } from '@/lib/storage'

function apply(v: Weergave) {
  Appearance.setColorScheme(v === 'licht' ? 'light' : v === 'donker' ? 'dark' : 'unspecified')
}

/** Bij het opstarten: de bewaarde keuze toepassen. */
export async function loadWeergave() {
  apply(await getWeergave())
}

export async function setWeergave(v: Weergave) {
  apply(v)
  await saveWeergave(v)
}

export { getWeergave, type Weergave }
