/**
 * Je abonnement. Wie op studiemaat.nl betaalde, ziet hier gewoon zijn periode.
 * Let op (Apple 3.1.1 / 3.1.3): de app verwijst NIET naar de website om te betalen. Kopen in de app
 * gaat straks via Apple/Google (in-app aankopen); tot die tijd tonen we alleen de status.
 */

import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'

import { ThemedText } from '@/components/themed-text'
import { Card, Notice, Screen } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { daysLeft, formatDate } from '@/lib/format'

export default function SubscriptionScreen() {
  const { me, refreshMe } = useAuth()
  // Bij openen opnieuw ophalen: een periode kan net zijn toegevoegd (bv. door een uitnodiging of de beheerder).
  useFocusEffect(
    useCallback(() => {
      refreshMe().catch(() => {})
    }, [refreshMe]),
  )
  const a = me?.access
  if (!a) return null

  return (
    <Screen edges={[]}>
      <Card>
        <ThemedText type="smallBold">Je hebt nu</ThemedText>
        <ThemedText style={{ fontSize: 22, fontWeight: 800 }}>
          {a.kind === 'gratis' ? 'Altijd gratis' : a.label ?? (a.kind === 'actief' ? 'Actief' : 'Geen abonnement')}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {a.kind === 'gratis'
            ? 'Je kunt Studiemaat voor altijd gratis gebruiken.'
            : a.kind === 'actief'
              ? `${a.cancelled ? 'Opgezegd, loopt' : 'Loopt'} tot en met ${formatDate(a.until)} (nog ${daysLeft(a.until)} dagen).`
              : a.until
                ? `Afgelopen op ${formatDate(a.until)}. Je lessen en toetsen blijven bewaard.`
                : 'Je lessen en toetsen blijven bewaard.'}
        </ThemedText>
      </Card>
      {a.kind === 'verlopen' ? (
        <Notice>Een abonnement nemen in de app kan binnenkort. Heb je al een abonnement? Log dan in met hetzelfde mailadres.</Notice>
      ) : null}
    </Screen>
  )
}
