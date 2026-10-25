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

import { ThemedText } from '@/components/themed-text'
import { Button, Card, Loading, Notice, Screen } from '@/components/ui'
import { Radius, Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/hooks/use-theme'
import { daysLeft, formatDate } from '@/lib/format'
import { buy, loadOffers, manageSubscriptions, onPurchaseEvent, restore, type StoreOffer } from '@/lib/purchases'

const PLAN_TEXT = { maand: 'Per maand', kwartaal: 'Per 3 maanden', jaar: 'Per jaar' } as const
const TERMS_URL =
  Platform.OS === 'ios' ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/' : 'https://play.google.com/about/play-terms/'
const STORE_TEXT = Platform.OS === 'ios' ? 'je Apple ID' : 'je Google-account'

export default function SubscriptionScreen() {
  const { me, refreshMe } = useAuth()
  const theme = useTheme()
  const [busy, setBusy] = useState(false)
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
  // Alleen tonen als je nu geen (doorlopend) abonnement hebt: dubbel betalen willen we niet.
  const canBuy = !!a && a.kind !== 'gratis' && !(a.kind === 'actief' && a.store && !a.cancelled)
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

  if (!a) return null

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
        <ThemedText style={{ fontSize: 22, fontWeight: 800 }}>
          {a.kind === 'gratis' ? 'Altijd gratis' : (a.label ?? (a.kind === 'actief' ? 'Actief' : 'Geen abonnement'))}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {a.kind === 'gratis'
            ? 'Je kunt Studiemaat voor altijd gratis gebruiken.'
            : a.kind === 'actief'
              ? a.store && !a.cancelled
                ? `Wordt automatisch verlengd. Volgende verlenging op ${formatDate(a.until)}.`
                : `${a.cancelled ? 'Opgezegd, loopt' : 'Loopt'} tot en met ${formatDate(a.until)} (nog ${daysLeft(a.until)} dagen).`
              : a.until
                ? `Afgelopen op ${formatDate(a.until)}. Je lessen en toetsen blijven bewaard.`
                : 'Je lessen en toetsen blijven bewaard.'}
        </ThemedText>
        {a.kind === 'actief' && a.store ? (
          <Button title="Abonnement beheren of opzeggen" kind="ghost" onPress={() => manageSubscriptions().catch(() => {})} />
        ) : null}
      </Card>

      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      {canBuy ? (
        <>
          <ThemedText style={styles.h2}>
            {a.kind === 'actief' ? 'Daarna doorgaan met een abonnement' : 'Kies een abonnement'}
          </ThemedText>
          {offers.isLoading ? <Loading /> : null}
          {offers.isError ? <Notice>{(offers.error as Error).message}</Notice> : null}
          {offers.data?.offers.map((o) => (
            <Pressable
              key={o.product.id}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => start(o)}
              style={({ pressed }) => [
                styles.offer,
                { borderColor: o.plan === 'jaar' ? theme.primary : theme.border, backgroundColor: theme.backgroundElement },
                (pressed || busy) && { opacity: 0.6 },
              ]}>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText style={{ fontWeight: 700, fontSize: 17 }}>{o.product.displayName || o.product.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {PLAN_TEXT[o.plan]}, automatisch verlengd
                </ThemedText>
              </View>
              <ThemedText style={{ fontWeight: 800, fontSize: 18 }}>{o.product.displayPrice}</ThemedText>
            </Pressable>
          ))}
          {busy ? <Loading /> : null}
          <ThemedText type="small" themeColor="textSecondary">
            Je betaalt via {STORE_TEXT}. Het abonnement wordt automatisch verlengd voor dezelfde periode en prijs, tenzij je het
            uiterlijk 24 uur voor het einde van de periode opzegt in de instellingen van je telefoon. Je lessen blijven altijd bewaard.
          </ThemedText>
          <View style={styles.links}>
            <ThemedText type="link" onPress={() => Linking.openURL(TERMS_URL)}>
              Gebruiksvoorwaarden
            </ThemedText>
            <ThemedText type="link" onPress={() => Linking.openURL('https://studiemaat.nl/privacy')}>
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
  h2: { fontSize: 19, lineHeight: 26, fontWeight: 700 },
  offer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.three },
  links: { flexDirection: 'row', gap: Spacing.four },
})
