/**
 * Wat we over iemands abonnement laten zien, op één plek (abonnementsscherm, Ik-tab en dashboard).
 *
 * Twee soorten betaald:
 * - Op de website koop je een losse periode ("Abonnement 1 maand"). Die loopt af; verlengen = opnieuw kopen.
 * - In de app neem je een doorlopend abonnement ("Maandabonnement (App Store)") dat automatisch verlengt tot je het
 *   in de telefoon opzegt.
 * Apple en Google laten een abonnement altijd meteen ingaan. Wie nog een betaalde periode van de website heeft,
 * zou dus dubbel betalen; daarom bieden we het abonnement in de app pas aan in de laatste week van die periode.
 */

import type { Access, Period, StoreSubscription } from '@/api'

import { daysLeft, formatDate } from './format'

/** Zoveel dagen voor het einde van een periode mag je verlengen (zelfde als de herinneringsmail van de website). */
export const RENEW_DAYS = 7

export interface SubscriptionView {
  title: string
  /** Eén zin onder de titel: tot wanneer, of wanneer het automatisch verlengt. */
  line: string
  /** Lopend abonnement uit de app (ook als een websiteperiode langer doorloopt). */
  storeSub: StoreSubscription | null
  /** Doorlopend abonnement dat automatisch verlengt: dan niets te koop. */
  renewing: boolean
  /** Laat de abonnementen uit de winkel zien. */
  canBuy: boolean
  /** Uitleg bij kopen of waarom het nu nog niet kan, of null. */
  buyNote: string | null
  /** Loopt binnen RENEW_DAYS af en verlengt niet vanzelf: rustige melding met "Verlengen". */
  endingSoon: { days: number; until: string; free: boolean } | null
  /** De stapel periodes (nu en daarna), alleen als het er meer dan één zijn. */
  periods: Period[]
}

const DAY = 86400_000

export function subscriptionView(a: Access): SubscriptionView {
  const periods = a.periods ?? []
  // Oudere website zonder storeSubscription: afleiden uit het plan dat nu het laatst afloopt.
  const storeSub =
    a.storeSubscription ??
    (a.kind === 'actief' && a.store ? { store: a.store, plan: a.plan, label: a.label ?? '', until: a.until, autoRenew: !a.cancelled } : null)
  const renewing = !!storeSub?.autoRenew
  const base = { storeSub, renewing, periods: periods.length > 1 ? periods : [] }

  if (a.kind === 'gratis')
    return { ...base, title: 'Altijd gratis', line: 'Je kunt Studiemaat voor altijd gratis gebruiken.', canBuy: false, buyNote: null, endingSoon: null }

  if (a.kind === 'verlopen')
    return {
      ...base,
      title: a.until ? 'Je abonnement is afgelopen' : 'Geen abonnement',
      line: a.until ? `${a.label ?? 'Je periode'} liep tot en met ${formatDate(a.until)}. Je lessen en toetsen blijven bewaard.` : 'Je lessen en toetsen blijven bewaard.',
      canBuy: true,
      buyNote: null,
      endingSoon: null,
    }

  const days = daysLeft(a.until)
  if (storeSub) {
    // Abonnement uit de app. Loopt er een websiteperiode langer door, dan noemen we die er ook bij.
    const later = a.until > storeSub.until && !a.store ? ` Daarna loopt je ${a.label?.toLowerCase() ?? 'periode'} nog tot en met ${formatDate(a.until)}.` : ''
    return {
      ...base,
      title: storeSub.label || (a.label ?? 'Abonnement'),
      line: storeSub.autoRenew
        ? `Wordt automatisch verlengd op ${formatDate(storeSub.until)}.${later}`
        : `Automatisch verlengen staat uit. Je kunt alles gebruiken tot en met ${formatDate(a.until)} (nog ${days} ${days === 1 ? 'dag' : 'dagen'}).`,
      canBuy: false,
      buyNote: storeSub.autoRenew ? null : 'Wil je toch doorgaan? Zet automatisch verlengen weer aan bij Abonnement beheren.',
      endingSoon: !storeSub.autoRenew && days <= RENEW_DAYS ? { days, until: a.until, free: false } : null,
    }
  }

  // Website of gratis periode. Is de laatste periode van de stapel betaald, dan pas in de laatste week verlengen.
  const last = periods.length ? periods[periods.length - 1] : null
  const paid = last ? last.paid : !/^(proef|vriend|extra|gratis_)/.test(a.plan)
  const soon = days <= RENEW_DAYS
  const from = new Date(new Date(a.until).getTime() - RENEW_DAYS * DAY).toISOString()
  return {
    ...base,
    title: a.label ?? 'Actief',
    line: `${a.cancelled ? 'Opgezegd, loopt' : 'Loopt'} tot en met ${formatDate(a.until)} (nog ${days} ${days === 1 ? 'dag' : 'dagen'}).`,
    canBuy: !paid || soon,
    buyNote: !paid
      ? 'Neem je nu een abonnement, dan gaat het meteen in en verlengt het daarna automatisch.'
      : soon
        ? 'Je nieuwe abonnement gaat meteen in en verlengt daarna automatisch. Zo mis je geen dag.'
        : `Je hebt al betaald tot en met ${formatDate(a.until)}. Vanaf ${formatDate(from)} kun je hier verlengen met een abonnement dat daarna automatisch doorloopt.`,
    endingSoon: soon ? { days, until: a.until, free: !paid } : null,
  }
}
