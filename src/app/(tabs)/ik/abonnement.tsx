/**
 * Je abonnement, en een abonnement nemen via Apple of Google (automatisch verlengend).
 * Wie op studiemaat.nl betaalde, ziet hier gewoon zijn periode.
 * Let op (Apple 3.1.1 / 3.1.3): de app verwijst NIET naar de website om te betalen.
 * Apple eist bij abonnementen: duur, prijs, dat het automatisch verlengt, en links naar de voorwaarden (EULA) en privacy.
 */

import { useQuery } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native'

import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Button, Card, Loading, Notice, Screen } from '@/components/ui'
import { DisplayFont, Radius, Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/hooks/use-theme'
import { formatDate } from '@/lib/format'
import { buy, loadOffers, manageSubscriptions, onPurchaseEvent, restore, type StoreOffer } from '@/lib/purchases'
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

export default function SubscriptionScreen() {
  const { me, refreshMe } = useAuth()
  const theme = useTheme()
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<StoreOffer['plan']>('jaar')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

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
        if (e.kind === 'done') setMessage({ kind: 'ok', text: 'Gelukt! Je abonnement loopt. Veel succes met leren.' })
        if (e.kind === 'error') setMessage({ kind: 'error', text: e.message })
      }),
    [],
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
      setMessage({ kind: 'error', text: 'Het betaalscherm kon niet worden geopend. Probeer het nog eens.' })
    }
  }

  const doRestore = async () => {
    setMessage(null)
    setBusy(true)
    const r = await restore().catch(() => ({ restored: 0, message: 'Herstellen lukte niet. Probeer het later nog eens.' }))
    setBusy(false)
    setMessage(
      r.restored
        ? { kind: 'ok', text: 'Je abonnement is hersteld.' }
        : { kind: 'error', text: r.message ?? `We vonden geen abonnement bij ${STORE_TEXT}.` },
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
        {view.storeSub ? (
          <Button title="Abonnement beheren of opzeggen" kind="ghost" onPress={() => manageSubscriptions().catch(() => {})} />
        ) : null}
      </Card>

      {view.buyNote && !canBuy ? <Notice>{view.buyNote}</Notice> : null}
      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      {canBuy ? (
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
