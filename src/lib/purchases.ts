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
 * Losse lessen (sinds 8 nov 2026): eenmalige aankopen ("consumable") studiemaat_les en studiemaat_5_lessen. Zelfde
 * volgorde; de website schrijft tegoed bij en wij ronden af met isConsumable: true, zodat je ze opnieuw kunt kopen.
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
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  showManageSubscriptionsIOS,
  syncIOS,
  type Product,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap'
import { Platform } from 'react-native'

import { fetchMe, fetchStoreInfo, reportPurchase } from '@/api'
import type { Me, StoreInfo, StoreName } from '@/api'
import { Sentry } from '@/lib/sentry'

const STORE: StoreName = Platform.OS === 'ios' ? 'apple' : 'google'
const ANDROID_PACKAGE = 'nl.studiemaat.app'

export type PurchaseEvent =
  | { kind: 'busy' }
  | { kind: 'done'; me: Me | null; lessons?: number }
  | { kind: 'pending'; message: string }
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

/** Codes van de losse lessen in de winkels, met het aantal lessen (staan ook in /mobile/store). */
export const LESSON_PRODUCTS: Record<string, number> = { studiemaat_les: 1, studiemaat_5_lessen: 5 }
const isLesson = (p: Purchase) => p.productId in LESSON_PRODUCTS

/** Eén aankoop verwerken: melden bij de website en, als dat definitief is, afronden bij de winkel. */
async function handle(purchase: Purchase) {
  // Google "in afwachting" (bv. contant betalen in een winkel of goedkeuring door ouders): pas als hij betaald is,
  // komt hij opnieuw binnen en verwerken we hem. Wel laten weten, anders blijft de knop draaien.
  if (purchase.purchaseState === 'pending') return emit({ kind: 'pending', message: PENDING_TEXT })
  if (purchase.purchaseState !== 'purchased') return
  const id = storeId(purchase)
  if (!id) return
  emit({ kind: 'busy' })
  const consumable = isLesson(purchase)
  const r = await reportPurchase(STORE, id, purchase.productId)
  if (r.ok) {
    await finishTransaction({ purchase, isConsumable: consumable }).catch((err) => Sentry.captureException(err))
    if (r.data.me) onMe?.(r.data.me)
    // Een oud, al afgelopen abonnement (bv. van een ander account) is wel afgerond, maar geen "Gelukt!".
    if (!consumable && !r.data.active) return emit({ kind: 'cancelled' })
    emit({ kind: 'done', me: r.data.me, lessons: consumable ? LESSON_PRODUCTS[purchase.productId] : undefined })
    return
  }
  // 409: de website kent de aankoop maar kan hem niet koppelen (bv. ander account). Afronden, anders blijft hij terugkomen.
  if (r.status === 409) await finishTransaction({ purchase, isConsumable: consumable }).catch(() => {})
  emit({ kind: 'error', message: r.error.message })
}

const STORE_LABEL = STORE === 'apple' ? 'de App Store' : 'Google Play'
const PENDING_TEXT =
  'Je betaling wacht nog op goedkeuring (bijvoorbeeld van je bank of van een ouder). Zodra hij is goedgekeurd, zetten we hem ' +
  'vanzelf aan. Je hoeft niet opnieuw te kopen.'

/** Loopt er nu een betaalscherm (requestPurchase)? Dan meldt buy() de afloop, niet purchaseErrorListener. */
let buying = false

const codeOf = (err: unknown) => String((err as { code?: unknown } | null)?.code ?? '')

/**
 * Een mislukte aankoop vertalen naar een melding die klopt. Vroeger was elke fout "Het betaalscherm kon niet worden
 * geopend", ook als het betaalscherm er wél was en het daarna misging (9 nov 2026: Apple gaf "Gateway Timeout" na de
 * bankcontrole van Rabobank). Bij twijfel controleren we daarna een paar keer of de aankoop toch is gelukt.
 */
function failed(err: unknown) {
  const code = codeOf(err)
  if (code === 'user-cancelled') return emit({ kind: 'cancelled' })
  // Apple: "in afwachting" = goedkeuring van de bank (3D Secure) of "Vraag om te kopen" nog niet rond.
  if (code === 'deferred-payment' || code === 'pending') {
    emit({ kind: 'pending', message: PENDING_TEXT })
    return recheckSoon()
  }
  // Heb je hem al (bv. een eerdere poging die toch lukte)? Dan opnieuw melden aan de website.
  if (code === 'already-owned' || code === 'duplicate-purchase') {
    emit({ kind: 'busy' })
    return void restore()
      .then((r) =>
        emit(r.active ? { kind: 'done', me: null } : { kind: 'error', message: r.message ?? 'Je hebt dit al gekocht. Tik op "Aankopen herstellen".' }),
      )
      .catch(() => emit({ kind: 'error', message: 'Je hebt dit al gekocht. Tik op "Aankopen herstellen".' }))
  }
  Sentry.captureException(err, { tags: { area: 'iap', code: code || 'onbekend' } })
  emit({
    kind: 'error',
    message:
      `${STORE_LABEL} gaf een storing tijdens het betalen. Soms is de betaling toch gelukt: we controleren het zo nog even. ` +
      'Zie je over een minuut nog geen abonnement, probeer het dan nog eens. Je betaalt nooit twee keer voor hetzelfde abonnement.',
  })
  recheckSoon()
}

let rechecks: ReturnType<typeof setTimeout>[] = []

/**
 * Na een storing of "in afwachting" een paar keer kijken of de aankoop toch binnen is: bij de winkel (onafgeronde of
 * lopende aankopen opnieuw melden) en bij de website (die krijgt de aankoop ook rechtstreeks van Apple/Google, via onze
 * account-id). Komt hij later pas (bank keurt na uren goed), dan pakt purchaseUpdatedListener hem alsnog op.
 */
function recheckSoon() {
  rechecks.forEach(clearTimeout)
  rechecks = [5, 20, 60].map((s, i, all) =>
    setTimeout(() => {
      recheck()
        .then((ok) => {
          if (!ok) return
          rechecks.forEach(clearTimeout)
          rechecks = []
        })
        .catch(() => {})
      if (i === all.length - 1) rechecks = []
    }, s * 1000),
  )
}

async function recheck(): Promise<boolean> {
  const r = await restore().catch(() => null)
  if (r?.active) {
    emit({ kind: 'done', me: null })
    return true
  }
  const me = await fetchMe()
  if (me.ok && me.data.access.kind === 'actief' && me.data.access.store === STORE) {
    onMe?.(me.data)
    emit({ kind: 'done', me: me.data })
    return true
  }
  return false
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
      // Tijdens buy() gooit requestPurchase dezelfde fout; die handelt buy() af (anders twee meldingen).
      if (buying) return
      failed(err)
    }),
  ]
}

export function stopPurchases() {
  rechecks.forEach(clearTimeout)
  rechecks = []
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

export interface LessonOffer {
  lessons: number
  product: Product
}

/** Losse lessen met de prijs zoals de winkel die toont. Leeg als de winkel ze (nog) niet kent. */
export async function loadLessonOffers(): Promise<{ info: StoreInfo; offers: LessonOffer[] } | { error: string }> {
  const info = await fetchStoreInfo()
  if (!info.ok) return { error: info.error.message }
  if (!info.data.available[STORE]) return { error: 'Losse lessen kopen in de app kan binnenkort.' }
  if (!(await (connected ?? initConnection()))) return { error: 'De winkel is nu niet bereikbaar. Probeer het later nog eens.' }
  const list = info.data.lessonProducts ?? Object.entries(LESSON_PRODUCTS).map(([productId, lessons]) => ({ productId, lessons }))
  const products = ((await fetchProducts({ skus: list.map((p) => p.productId), type: 'in-app' })) ?? []) as Product[]
  const offers = list
    .map((p) => ({ lessons: p.lessons, product: products.find((x) => x.id === p.productId) }))
    .filter((o): o is LessonOffer => !!o.product)
    .sort((a, b) => a.lessons - b.lessons)
  if (!offers.length) return { error: 'Losse lessen konden niet worden geladen. Probeer het later nog eens.' }
  return { info: info.data, offers }
}

/**
 * requestPurchase starten. Gooit nooit: de afloop (gelukt, in afwachting, storing, geannuleerd) komt altijd binnen via
 * onPurchaseEvent, met een melding die past bij wat er misging.
 */
async function request(run: () => Promise<unknown>) {
  rechecks.forEach(clearTimeout)
  rechecks = []
  buying = true
  try {
    await run()
  } catch (err) {
    failed(err)
  } finally {
    buying = false
  }
}

/** Betaalscherm voor een losse les (eenmalige aankoop). De afloop komt binnen via onPurchaseEvent. */
export async function buyLesson(offer: LessonOffer, accountId: string) {
  const sku = offer.product.id
  await request(() =>
    Platform.OS === 'android'
      ? requestPurchase({ type: 'in-app', request: { google: { skus: [sku], obfuscatedAccountId: accountId } } })
      : requestPurchase({ type: 'in-app', request: { apple: { sku, appAccountToken: accountId } } }),
  )
}

/** Betaalscherm van Apple/Google openen. De afloop komt binnen via onPurchaseEvent. */
export async function buy(offer: StoreOffer, accountId: string) {
  const p = offer.product
  if (p.platform === 'android') {
    // Google: het basisabonnement (zonder actie) kiezen.
    const token = p.subscriptionOffers.find((o) => o.offerTokenAndroid && !o.offerTagsAndroid?.length)?.offerTokenAndroid
      ?? p.subscriptionOffers.find((o) => o.offerTokenAndroid)?.offerTokenAndroid
    await request(() =>
      requestPurchase({
        type: 'subs',
        request: {
          google: {
            skus: [p.id],
            obfuscatedAccountId: accountId,
            subscriptionOffers: token ? [{ sku: p.id, offerToken: token }] : undefined,
          },
        },
      }),
    )
  } else {
    await request(() => requestPurchase({ type: 'subs', request: { apple: { sku: p.id, appAccountToken: accountId } } }))
  }
}

/**
 * "Aankopen herstellen": alles wat de winkel nog als lopend kent opnieuw aan de website melden.
 * Met sync (de knop) vraagt iOS eerst de laatste stand op bij Apple (AppStore.sync, kan om je Apple ID-wachtwoord
 * vragen); zonder sync alleen wat de telefoon al weet, zodat we niet bij elk scherm om een wachtwoord vragen.
 * active = aankopen die nu toegang geven (een oud, afgelopen abonnement telt wel als hersteld, maar niet als actief).
 */
export async function restore(
  opts: { sync?: boolean } = {},
): Promise<{ found: number; restored: number; active: number; message?: string; otherAccount?: boolean }> {
  if (!(await (connected ?? initConnection()))) return { found: 0, restored: 0, active: 0, message: 'De winkel is nu niet bereikbaar.' }
  if (opts.sync && Platform.OS === 'ios') await syncIOS().catch(() => {}) // geannuleerd of geen verbinding: toch verder
  const purchases = await getAvailablePurchases()
  let found = 0
  let restored = 0
  let active = 0
  let message: string | undefined
  let otherAccount = false
  for (const p of purchases) {
    const id = storeId(p)
    if (!id) continue
    found++
    const r = await reportPurchase(STORE, id, p.productId)
    if (r.ok) {
      restored++
      if (isLesson(p) || r.data.active) active++
      if (r.data.me) onMe?.(r.data.me)
      await finishTransaction({ purchase: p, isConsumable: isLesson(p) }).catch(() => {})
    } else {
      message = r.error.message
      if (r.error.reason === 'other_account') otherAccount = true
    }
  }
  return { found, restored, active, message, otherAccount }
}

/**
 * Heeft de winkel een lopend abonnement dat de website (nog) niet aan dit account heeft gekoppeld? Bijvoorbeeld omdat
 * de controle bij Google of Apple even mislukte. We melden het opnieuw; lukt dat niet, dan geeft dit de melding terug
 * en laat het abonnementsscherm geen koopknoppen zien. Anders betaalt iemand per ongeluk twee keer.
 */
export async function checkOpenPurchases(): Promise<{ open: boolean; message?: string; otherAccount?: boolean }> {
  const r = await restore()
  return r.found > r.restored ? { open: true, message: r.message, otherAccount: r.otherAccount } : { open: false }
}

/**
 * Abonnementen beheren (opzeggen, wisselen) in de instellingen van de telefoon.
 * iOS: het beheerscherm van StoreKit in de app. De gewone link (apps.apple.com/account/subscriptions) toont alleen
 * echte aankopen van de Apple ID van de telefoon, dus geen TestFlight-/sandbox-abonnementen. Lukt het scherm niet,
 * dan alsnog die link.
 */
export async function manageSubscriptions(productId?: string): Promise<void> {
  if (Platform.OS === 'ios') {
    try {
      await showManageSubscriptionsIOS()
      return
    } catch {
      // val terug op de link hieronder
    }
  }
  await deepLinkToSubscriptions({ skuAndroid: productId ?? null, packageNameAndroid: ANDROID_PACKAGE })
}
