/**
 * Herkent mailadressen die waarschijnlijk van een school zijn.
 *
 * Waarom: leerlingadressen van scholen (bijv. naam@ll.school.nl) nemen onze mail wel aan
 * (Postmark zegt 'Delivered'), maar zetten hem daarna vaak in quarantaine of weigeren mail
 * van buitenaf naar leerlingen. Dan komt de inlogcode nooit aan. Met deze grove schatting
 * tonen we op het inlogscherm een waarschuwing en raden we een privé-adres aan.
 * Liever een keer te vaak waarschuwen dan een leerling die niet kan inloggen.
 * Dezelfde regels staan op de website (studypro, src/lib/school-mail.ts).
 */

/** Bekende mailboeren: nooit een schooladres. */
const PRIVATE_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'icloud.com', 'me.com', 'mac.com', 'hotmail.com', 'hotmail.nl', 'outlook.com',
  'outlook.nl', 'live.com', 'live.nl', 'msn.com', 'yahoo.com', 'yahoo.nl', 'ziggo.nl', 'kpnmail.nl', 'planet.nl',
  'home.nl', 'xs4all.nl', 'telenet.be', 'skynet.be', 'proton.me', 'protonmail.com',
])

/** Onderdelen van het domein (tussen de puntjes) die op leerlingen of een school wijzen. */
const SCHOOL_LABELS = new Set([
  'll', 'lln', 'leerling', 'leerlingen', 'student', 'students', 'stud', 'edu', 'school', 'scholen', 'csg', 'rsg',
  'osg', 'ksg', 'pcc', 'vmbo', 'mavo', 'havo', 'vwo', 'mbo', 'roc',
])

/** Woorden die ergens in het domein mogen staan (scholengemeenschap, hogeschool, lyceum...). */
const SCHOOL_WORDS = /(school|scholen|college|lyceum|gymnasium|atheneum|onderwijs|leerling|scholengroep|scholengemeenschap|campus)/

export function looksLikeSchoolEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1]?.replace(/\.$/, '')
  if (!domain || !domain.includes('.')) return false
  if (PRIVATE_DOMAINS.has(domain)) return false
  const labels = domain.split('.')
  if (labels[labels.length - 1] === 'edu') return true
  // Laatste deel (nl, be, com) telt niet mee; de rest wel, ook samengestelde stukken als 'smdb-lunteren'.
  const parts = labels.slice(0, -1).flatMap((l) => l.split('-'))
  if (parts.some((p) => SCHOOL_LABELS.has(p))) return true
  return SCHOOL_WORDS.test(labels.slice(0, -1).join('.'))
}
