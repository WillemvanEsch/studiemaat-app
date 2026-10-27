/**
 * Abonnementen kopen in de app via Apple (StoreKit) en Google (Play Billing), met expo-iap.
 *
 * Volgorde bij een aankoop:
 * 1. buy() opent het betaalscherm van Apple/Google, met onze account-id (zodat meldingen van de winkel bij het
 *    juiste account terechtkomen).
 * 2. De winkel meldt de aankoop via purchaseUpdatedListener (ook later, bv. na een onderbroken aankoop of bij opstarten).
 * 3. Wij melden hem aan de website (/mobile/store/purchase), die hem bij de winkel controleert en de periode zet.
 * 4. Pas daarna finishTransaction (Google: bevestigen binnen 3 dagen, anders terugbetaald; Apple: anders komt hij
 *    bij elke start terug). Lukt stap 3 niet door een storing, dan ronden we niet af en proberen we het later opnieuw.
 *
 * Belangrijk (Apple 3.1.1/3.1.3): nergens in de app verwijzen naar betalen op de website.
 */

import {
  deepLinkToSubscriptions,
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap'
import { Platform } from 'react-native'

import { fetchStoreInfo, reportPurchase } from '@/api'
import type { Me, StoreInfo, StoreName } from '@/api'
import { Sentry } from '@/lib/sentry'

const STORE: StoreName = Platform.OS === 'ios' ? 'apple' : 'google'
const ANDROID_PACKAGE = 'nl.studiemaat.app'

export type PurchaseEvent =
  | { kind: 'busy' }
  | { kind: 'done'; me: Me | null }
  | { kind: 'error'; message: string }
  | { kind: 'cancelled' }

type Listener = (e: PurchaseEvent) => void
const listeners = new Set<Listener>()
const emit = (e: PurchaseEvent) => listeners.forEach((l) => l(e))

/** Het abonnementsscherm luistert hiermee naar de afloop van een aankoop. */
export function onPurchaseEvent(l: Listener) {
  listeners.add(l)
  return () => void listeners.delete(l)
}

let connected: Promise<boolean> | null = null
let subscriptions: { remove: () => void }[] = []
let onMe: ((me: Me) => void) | null = null

const storeId = (p: Purchase) => (STORE === 'apple' ? p.id : p.purchaseToken) ?? null

/** Eén aankoop verwerken: melden bij de website en, als dat definitief is, afronden bij de winkel. */
async function handle(purchase: Purchase) {
  if (purchase.purchaseState !== 'purchased') return // bv. Google "in afwachting" (contant betalen in een winkel)
  const id = storeId(purchase)
  if (!id) return
  emit({ kind: 'busy' })
  const r = await reportPurchase(STORE, id)
  if (r.ok) {
    await finishTransaction({ purchase, isConsumable: false }).catch((err) => Sentry.captureException(err))
    if (r.data.me) onMe?.(r.data.me)
    emit({ kind: 'done', me: r.data.me })
    return
  }
  // 409: de website kent de aankoop maar kan hem niet koppelen (bv. ander account). Afronden, anders blijft hij terugkomen.
  if (r.status === 409) await finishTransaction({ purchase, isConsumable: false }).catch(() => {})
  emit({ kind: 'error', message: r.error.message })
}

/**
 * Verbinding met de winkel openen en luisteren naar aankopen. Bij het opstarten (ingelogd) aanroepen:
 * onafgeronde aankopen komen dan alsnog binnen. setMe werkt de toegang in de app bij na een aankoop.
 */
export function startPurchases(setMe: (me: Me) => void) {
  onMe = setMe
  if (connected) return
  connected = initConnection().catch((err) => {
    connected = null
    Sentry.captureException(err)
    return false
  })
  subscriptions = [
    purchaseUpdatedListener((p) => {
      handle(p).catch((err) => {
        Sentry.captureException(err)
        emit({ kind: 'error', message: 'Je aankoop is gelukt, maar we konden hem nog niet verwerken. Open de app straks opnieuw.' })
      })
    }),
    purchaseErrorListener((err) => {
      if (isUserCancelledError(err)) return emit({ kind: 'cancelled' })
      emit({ kind: 'error', message: err.message || 'Kopen lukte niet. Probeer het nog eens.' })
    }),
  ]
}

export function stopPurchases() {
  subscriptions.forEach((s) => s.remove())
  subscriptions = []
  onMe = null
  if (connected) endConnection().catch(() => {})
  connected = null
}

export interface StoreOffer {
  plan: StoreInfo['products'][number]['plan']
  product: ProductSubscription
}

/** Abonnementen met de prijs zoals de winkel die toont (munt en btw van de koper). */
export async function loadOffers(): Promise<{ info: StoreInfo; offers: StoreOffer[] } | { error: string }> {
  const info = await fetchStoreInfo()
  if (!info.ok) return { error: info.error.message }
  if (!info.data.available[STORE]) return { error: 'Een abonnement nemen in de app kan binnenkort.' }
  if (!(await (connected ?? initConnection()))) return { error: 'De winkel is nu niet bereikbaar. Probeer het later nog eens.' }
  const skus = info.data.products.map((p) => p.productId)
  const products = ((await fetchProducts({ skus, type: 'subs' })) ?? []) as ProductSubscription[]
  const offers = info.data.products
    .map((p) => ({ plan: p.plan, product: products.find((x) => x.id === p.productId) }))
    .filter((o): o is StoreOffer => !!o.product)
  // Geeft de winkel niets terug (abonnementen nog niet goedgekeurd, of geen verbinding met de winkel),
  // dan liever een melding dan een leeg scherm.
  if (!offers.length) return { error: 'De abonnementen konden niet worden geladen. Probeer het later nog eens.' }
  return { info: info.data, offers }
}

/** Betaalscherm van Apple/Google openen. De afloop komt binnen via onPurchaseEvent. */
export async function buy(offer: StoreOffer, accountId: string) {
  const p = offer.product
  if (p.platform === 'android') {
    // Google: het basisabonnement (zonder actie) kiezen.
    const token = p.subscriptionOffers.find((o) => o.offerTokenAndroid && !o.offerTagsAndroid?.length)?.offerTokenAndroid
      ?? p.subscriptionOffers.find((o) => o.offerTokenAndroid)?.offerTokenAndroid
    await requestPurchase({
      type: 'subs',
      request: {
        google: {
          skus: [p.id],
          obfuscatedAccountId: accountId,
          subscriptionOffers: token ? [{ sku: p.id, offerToken: token }] : undefined,
        },
      },
    })
  } else {
    await requestPurchase({ type: 'subs', request: { apple: { sku: p.id, appAccountToken: accountId } } })
  }
}

/** "Aankopen herstellen": alles wat de winkel nog als lopend kent opnieuw aan de website melden. */
export async function restore(): Promise<{ found: number; restored: number; message?: string }> {
  if (!(await (connected ?? initConnection()))) return { found: 0, restored: 0, message: 'De winkel is nu niet bereikbaar.' }
  const purchases = await getAvailablePurchases()
  let found = 0
  let restored = 0
  let message: string | undefined
  for (const p of purchases) {
    const id = storeId(p)
    if (!id) continue
    found++
    const r = await reportPurchase(STORE, id)
    if (r.ok) {
      restored++
      if (r.data.me) onMe?.(r.data.me)
      await finishTransaction({ purchase: p, isConsumable: false }).catch(() => {})
    } else message = r.error.message
  }
  return { found, restored, message }
}

/**
 * Heeft de winkel een lopend abonnement dat de website (nog) niet aan dit account heeft gekoppeld? Bijvoorbeeld omdat
 * de controle bij Google of Apple even mislukte. We melden het opnieuw; lukt dat niet, dan geeft dit de melding terug
 * en laat het abonnementsscherm geen koopknoppen zien. Anders betaalt iemand per ongeluk twee keer.
 */
export async function checkOpenPurchases(): Promise<{ open: boolean; message?: string }> {
  const r = await restore()
  return r.found > r.restored ? { open: true, message: r.message } : { open: false }
}

/** Abonnementen beheren (opzeggen, wisselen) in de instellingen van de telefoon. */
export const manageSubscriptions = (productId?: string) =>
  deepLinkToSubscriptions({ skuAndroid: productId ?? null, packageNameAndroid: ANDROID_PACKAGE })
