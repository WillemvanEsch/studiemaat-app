/**
 * Je abonnement, en een abonnement nemen via Apple of Google (automatisch verlengend).
 * Wie op studiemaat.nl betaalde, ziet hier gewoon zijn periode.
 * Let op (Apple 3.1.1 / 3.1.3): de app verwijst NIET naar de website om te betalen.
 * Apple eist bij abonnementen: duur, prijs, dat het automatisch verlengt, en links naar de voorwaarden (EULA) en privacy.
 * Losse lessen (sinds 8 nov 2026): alleen voor wie geen abonnement en geen gratis periode heeft (access verlopen).
 */

import { useQuery } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native'

import { fetchMe } from '@/api'
import type { StoreName } from '@/api'
import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Button, Card, Loading, Notice, Screen } from '@/components/ui'
import { DisplayFont, Radius, Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/hooks/use-theme'
import { formatDate } from '@/lib/format'
import {
  buy,
  buyLesson,
  checkOpenPurchases,
  loadLessonOffers,
  loadOffers,
  manageSubscriptions,
  onPurchaseEvent,
  restore,
  type LessonOffer,
  type StoreOffer,
} from '@/lib/purchases'
import { subscriptionView } from '@/lib/subscription'

const PLAN_TEXT = { maand: 'Per maand', kwartaal: 'Per 3 maanden', jaar: 'Per jaar' } as const
const PLAN_TITLE = { maand: '1 maand', kwartaal: '3 maanden', jaar: '1 jaar' } as const
const PLAN_NOTE = { maand: 'Ideaal voor één toetsweek', kwartaal: 'Een hele toetsperiode', jaar: 'Het hele schooljaar' } as const
const PLAN_MONTHS = { maand: 1, kwartaal: 3, jaar: 12 } as const
// Jaar bovenaan: het voordeligst, en dat willen we het eerst laten zien.
const PLAN_ORDER = { jaar: 0, kwartaal: 1, maand: 2 } as const

/** Wat er in elk abonnement zit (zelfde als op de website: alles zit er altijd in). */
const BENEFITS = [
  'Foto van je boek wordt een uittreksel, begrippen en flitskaarten',
  'Oefenvragen op jouw niveau, ook hardop beantwoorden',
  'Proeftoetsen met een cijfer, zodat je weet waar je staat',
  'Herhaal precies wat je nog lastig vond',
  'Geen reclame, je lessen blijven altijd bewaard',
]

/** Bedrag in de munt van de winkel, bv. "€ 5,00". */
function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(amount)
  } catch {
    return amount.toFixed(2)
  }
}
const TERMS_URL =
  Platform.OS === 'ios' ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/' : 'https://play.google.com/about/play-terms/'
const STORE_TEXT = Platform.OS === 'ios' ? 'je Apple ID' : 'je Google-account'
const STORE_NAME = Platform.OS === 'ios' ? 'Apple' : 'Google'
// De winkel van deze telefoon; een abonnement uit de andere winkel kun je hier niet beheren.
const THIS_STORE: StoreName = Platform.OS === 'ios' ? 'apple' : 'google'

export default function SubscriptionScreen() {
  const { me, refreshMe, setMe } = useAuth()
  const theme = useTheme()
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<StoreOffer['plan']>('jaar')
  const [message, setMessage] = useState<{ kind: 'ok' | 'info' | 'error'; text: string } | null>(null)

  // Bij openen opnieuw ophalen: een periode kan net zijn toegevoegd (bv. door een uitnodiging of de beheerder).
  useFocusEffect(
    useCallback(() => {
      refreshMe().catch(() => {})
    }, [refreshMe]),
  )

  useEffect(
    () =>
      onPurchaseEvent((e) => {
        if (e.kind === 'busy') return setBusy(true)
        setBusy(false)
        if (e.kind === 'done')
          setMessage({
            kind: 'ok',
            text: e.lessons
              ? `Gelukt! Je hebt ${e.lessons === 1 ? 'een les' : `${e.lessons} lessen`} erbij. Maak je les via het tabblad Nieuw.`
              : 'Gelukt! Je abonnement loopt. Veel succes met leren.',
          })
        if (e.kind === 'done') refreshMe().catch(() => {})
        if (e.kind === 'pending') setMessage({ kind: 'info', text: e.message })
        if (e.kind === 'error') setMessage({ kind: 'error', text: e.message })
      }),
    [refreshMe],
  )

  const a = me?.access
  // Wat we laten zien en of er iets te koop is (geen dubbel betalen), zie lib/subscription.
  const view = a ? subscriptionView(a) : null
  const canBuy = !!view?.canBuy
  const offers = useQuery({
    queryKey: ['store-offers'],
    queryFn: async () => {
      const r = await loadOffers()
      if ('error' in r) throw new Error(r.error)
      return r
    },
    enabled: canBuy,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
  // Een aankoop die de website nog niet kon verwerken: dan geen koopknoppen, maar opnieuw proberen.
  const open = useQuery({
    queryKey: ['open-purchases'],
    queryFn: checkOpenPurchases,
    enabled: canBuy,
    staleTime: 0,
    retry: false,
  })
  // Losse lessen: alleen zonder abonnement en zonder gratis periode.
  const lessonsForSale = a?.kind === 'verlopen'
  const lessonOffers = useQuery({
    queryKey: ['lesson-offers'],
    queryFn: async () => {
      const r = await loadLessonOffers()
      if ('error' in r) throw new Error(r.error)
      return r
    },
    enabled: lessonsForSale,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
  const waiting = canBuy && !!open.data?.open
  const refetchOpen = open.refetch
  useEffect(() => onPurchaseEvent((e) => void (e.kind === 'error' && refetchOpen())), [refetchOpen])

  if (!a || !view) return null

  const sorted = [...(offers.data?.offers ?? [])].sort((x, y) => PLAN_ORDER[x.plan] - PLAN_ORDER[y.plan])
  const chosen = sorted.find((o) => o.plan === picked) ?? sorted[0]
  const month = sorted.find((o) => o.plan === 'maand')

  const start = async (offer: StoreOffer) => {
    if (!offers.data) return
    setMessage(null)
    setBusy(true)
    try {
      await buy(offer, offers.data.info.accountId)
    } catch {
      setBusy(false)
      setMessage({ kind: 'error', text: 'Kopen lukte niet. Probeer het nog eens.' })
    }
  }

  const startLesson = async (offer: LessonOffer) => {
    if (!lessonOffers.data) return
    setMessage(null)
    setBusy(true)
    try {
      await buyLesson(offer, lessonOffers.data.info.accountId)
    } catch {
      setBusy(false)
      setMessage({ kind: 'error', text: 'Kopen lukte niet. Probeer het nog eens.' })
    }
  }
  const single = lessonOffers.data?.offers.find((o) => o.lessons === 1)

  const doRestore = async () => {
    setMessage(null)
    setBusy(true)
    const r = await restore({ sync: true }).catch(() => ({ active: 0, message: `${STORE_NAME} was even niet bereikbaar. Probeer het later nog eens.` }))
    // De website kan de aankoop ook al rechtstreeks van Apple/Google hebben gekregen.
    const fresh = await fetchMe().catch(() => null)
    if (fresh?.ok) setMe(fresh.data)
    setBusy(false)
    const has = fresh?.ok && fresh.data.access.kind === 'actief' && fresh.data.access.store === THIS_STORE
    setMessage(
      r.active || has
        ? { kind: 'ok', text: 'Je abonnement is hersteld.' }
        : r.message
          ? { kind: 'error', text: r.message }
          : {
              kind: 'info',
              text:
                `Er is geen lopend abonnement bij ${STORE_TEXT} gevonden, dus er is niets om te herstellen. ` +
                `Ging een betaling net mis? Dan rekent ${STORE_NAME} ook niets af; een reservering bij je bank vervalt vanzelf.`,
            },
    )
  }

  return (
    <Screen edges={[]}>
      <Card>
        <ThemedText type="smallBold">Je hebt nu</ThemedText>
        <ThemedText style={{ fontSize: 24, lineHeight: 30, fontFamily: DisplayFont.extraBold }}>{view.title}</ThemedText>
        <ThemedText themeColor="textSecondary">{view.line}</ThemedText>
        {view.periods.length ? (
          <View style={[styles.periods, { borderColor: theme.border }]}>
            {view.periods.map((p, i) => (
              <View key={`${p.plan}-${p.startsAt}`} style={[styles.period, i ? { borderTopWidth: 1, borderColor: theme.border } : null]}>
                <View style={[styles.when, { backgroundColor: p.running ? theme.successSoft : theme.background }]}>
                  <ThemedText type="small" style={{ fontWeight: 700, color: p.running ? theme.success : theme.textSecondary }}>
                    {p.running ? 'Nu' : 'Daarna'}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: 700 }}>{p.label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {p.store
                      ? p.autoRenew
                        ? `Verlengt automatisch op ${formatDate(p.endsAt)}`
                        : `Tot en met ${formatDate(p.endsAt)}, verlengen staat uit`
                      : `${formatDate(p.startsAt)} t/m ${formatDate(p.endsAt)}${p.cancelled ? ', opgezegd' : ''}`}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {view.storeSub && view.storeSub.store === THIS_STORE ? (
          <Button title="Abonnement beheren of opzeggen" kind="ghost" onPress={() => manageSubscriptions().catch(() => {}).finally(() => refreshMe().catch(() => {}))} />
        ) : null}
        {view.storeSub && view.storeSub.store !== THIS_STORE ? (
          // Gekocht op het andere soort telefoon: de winkel van deze telefoon kent het abonnement niet, dus geen knop
          // die naar een lege abonnementenlijst gaat.
          <ThemedText type="small" themeColor="textSecondary">
            {view.storeSub.store === 'apple'
              ? 'Dit abonnement loopt via de App Store. Beheren of opzeggen doe je op een iPhone of iPad met de Apple ID waarmee je het kocht.'
              : 'Dit abonnement loopt via Google Play. Beheren of opzeggen doe je op een Android-telefoon met het Google-account waarmee je het kocht.'}
          </ThemedText>
        ) : null}
      </Card>

      {view.buyNote && !canBuy ? <Notice>{view.buyNote}</Notice> : null}
      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      {/* Op deze Apple ID / dit Google-account loopt nog een abonnement van een ander Studiemaat-account (bv. een oud
          testaccount). De winkel staat dan geen tweede abonnement toe; uitleggen hoe je verder kunt. */}
      {waiting && open.data?.otherAccount ? (
        <Card>
          <ThemedText style={styles.h2}>Abonnement van een ander account</ThemedText>
          <ThemedText themeColor="textSecondary">
            Op {STORE_TEXT} loopt nog een abonnement dat bij een ander Studiemaat-account hoort. Log in met dat account, of zeg
            het op via Abonnement beheren. Als het is afgelopen, kun je hier een nieuw abonnement nemen.
          </ThemedText>
          <Button title="Abonnement beheren" onPress={() => manageSubscriptions().catch(() => {}).finally(() => void refetchOpen())} />
          <Button title="Opnieuw controleren" kind="ghost" loading={open.isFetching} onPress={() => refetchOpen()} />
        </Card>
      ) : null}

      {waiting && !open.data?.otherAccount ? (
        <Card>
          <ThemedText style={styles.h2}>Je aankoop wordt verwerkt</ThemedText>
          <ThemedText themeColor="textSecondary">
            {open.data?.message ?? 'Je betaling is gelukt, maar we konden hem nog niet aan je account koppelen.'} Je hoeft niet
            opnieuw te betalen.
          </ThemedText>
          <Button title="Opnieuw proberen" loading={open.isFetching} onPress={() => refetchOpen()} />
        </Card>
      ) : null}

      {canBuy && !waiting ? (
        <>
          <Card style={{ borderColor: theme.primary }}>
            <ThemedText style={styles.h2}>
              {a.kind === 'actief' && view.endingSoon && !view.endingSoon.free ? 'Verlengen' : 'Leer slimmer voor je toetsen'}
            </ThemedText>
            {view.buyNote ? <ThemedText themeColor="textSecondary">{view.buyNote}</ThemedText> : null}
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefit}>
                <Icon name="checkmark.circle.fill" size={18} tintColor={theme.success} />
                <ThemedText style={{ flex: 1 }}>{b}</ThemedText>
              </View>
            ))}
          </Card>
          {offers.isLoading ? <Loading /> : null}
          {offers.isError ? <Notice>{(offers.error as Error).message}</Notice> : null}
          {sorted.map((o) => {
            const active = o.plan === chosen?.plan
            const perMonth = o.product.price && o.plan !== 'maand' ? money(o.product.price / PLAN_MONTHS[o.plan], o.product.currency) : null
            const save =
              month?.product.price && o.product.price && o.plan !== 'maand'
                ? Math.round((1 - o.product.price / (month.product.price * PLAN_MONTHS[o.plan])) * 100)
                : 0
            return (
              <Pressable
                key={o.product.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                disabled={busy}
                onPress={() => setPicked(o.plan)}
                style={({ pressed }) => [
                  styles.offer,
                  {
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? theme.accent : theme.backgroundElement,
                    borderWidth: active ? 2 : 1,
                  },
                  pressed && { opacity: 0.7 },
                ]}>
                {o.plan === 'jaar' ? (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <ThemedText type="smallBold" style={{ color: theme.primaryForeground }}>
                      Voordeligst
                    </ThemedText>
                  </View>
                ) : null}
                <Icon name={active ? 'checkmark.circle.fill' : 'circle'} size={22} tintColor={active ? theme.primary : theme.textSecondary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText style={{ fontWeight: 700, fontSize: 17 }}>{PLAN_TITLE[o.plan]}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {PLAN_NOTE[o.plan]}
                  </ThemedText>
                  {save >= 5 ? (
                    <ThemedText type="smallBold" style={{ color: theme.success }}>
                      Bespaar {save}%
                    </ThemedText>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText style={{ fontWeight: 800, fontSize: 18 }}>{o.product.displayPrice}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {perMonth ? `${perMonth} per maand` : PLAN_TEXT[o.plan].toLowerCase()}
                  </ThemedText>
                </View>
              </Pressable>
            )
          })}
          {chosen ? (
            <Button
              title={`Ga verder met ${PLAN_TITLE[chosen.plan]}`}
              loading={busy}
              onPress={() => start(chosen)}
              style={{ paddingVertical: Spacing.four }}
            />
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {chosen ? `${PLAN_TEXT[chosen.plan]} ${chosen.product.displayPrice}. ` : ''}Je betaalt via {STORE_TEXT}. Het abonnement wordt automatisch verlengd voor dezelfde periode en prijs, tenzij je het
            uiterlijk 24 uur voor het einde van de periode opzegt in de instellingen van je telefoon. Je lessen blijven altijd bewaard.
          </ThemedText>
          <View style={styles.links}>
            <ThemedText type="link" onPress={() => Linking.openURL(TERMS_URL)}>
              Gebruiksvoorwaarden
            </ThemedText>
            <ThemedText type="link" onPress={() => Linking.openURL('https://www.studiemaat.nl/privacy')}>
              Privacyverklaring
            </ThemedText>
          </View>
        </>
      ) : null}

      {/* Losse lessen staan los van een openstaand abonnement. Kan de winkel ze (nog) niet leveren, bv. zolang Apple ze
          keurt, dan geen kaartje met een foutmelding (behalve als er nog tegoed is om te melden). */}
      {lessonsForSale && (!lessonOffers.isError || !!a.lessonCredits) ? (
        <Card>
          <ThemedText style={styles.h2}>Eén toets op komst?</ThemedText>
          <ThemedText themeColor="textSecondary">
            Koop een losse les, zonder abonnement. Tot 20 bladzijdes lesstof met uittreksel, begrippen, flitskaarten, overhoren en
            proeftoetsen (120 toetsvragen). De les blijft altijd van jou.
          </ThemedText>
          {a.lessonCredits ? (
            <Notice kind="ok">Je hebt nog {a.lessonCredits === 1 ? '1 les' : `${a.lessonCredits} lessen`} tegoed. Maak je les via het tabblad Nieuw.</Notice>
          ) : null}
          {lessonOffers.isLoading ? <Loading /> : null}
          {lessonOffers.data?.offers.map((o) => {
            const bundle = o.lessons > 1
            const per = bundle && o.product.price ? money(o.product.price / o.lessons, o.product.currency) : null
            const save = bundle && single?.product.price && o.product.price ? Math.round((1 - o.product.price / (single.product.price * o.lessons)) * 100) : 0
            return (
              <Pressable
                key={o.product.id}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => startLesson(o)}
                style={({ pressed }) => [
                  styles.offer,
                  { borderColor: bundle ? theme.primary : theme.border, backgroundColor: bundle ? theme.accent : theme.backgroundElement, borderWidth: bundle ? 2 : 1 },
                  pressed && { opacity: 0.7 },
                ]}>
                {bundle ? (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <ThemedText type="smallBold" style={{ color: theme.primaryForeground }}>
                      Voor je toetsweek
                    </ThemedText>
                  </View>
                ) : null}
                <Icon name={bundle ? 'sparkles' : 'book.fill'} size={22} tintColor={theme.primary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText style={{ fontWeight: 700, fontSize: 17 }}>{bundle ? `${o.lessons} losse lessen` : '1 losse les'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {bundle ? `${per} per les` : 'Voor één toets'}
                  </ThemedText>
                  {save >= 5 ? (
                    <ThemedText type="smallBold" style={{ color: theme.success }}>
                      Bespaar {save}%
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText style={{ fontWeight: 800, fontSize: 18 }}>{o.product.displayPrice}</ThemedText>
              </Pressable>
            )
          })}
          {lessonOffers.data ? (
            <ThemedText type="small" themeColor="textSecondary">
              Eenmalige aankoop via {STORE_TEXT}, er wordt niets verlengd. Ga je vaker oefenen? Dan is een abonnement voordeliger.
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      {a.kind !== 'gratis' ? <Button title="Aankopen herstellen" kind="ghost" disabled={busy} onPress={doRestore} /> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  h2: { fontSize: 22, lineHeight: 28, fontFamily: DisplayFont.extraBold },
  benefit: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  offer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radius.lg, padding: Spacing.three, paddingTop: Spacing.four },
  badge: { position: 'absolute', top: -11, right: Spacing.three, borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  links: { flexDirection: 'row', gap: Spacing.four },
  periods: { borderWidth: 1, borderRadius: Radius.md, marginTop: Spacing.one },
  period: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  when: { borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 2 },
})
