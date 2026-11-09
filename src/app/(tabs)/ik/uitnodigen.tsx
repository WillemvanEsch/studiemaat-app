/**
 * Vrienden uitnodigen: zij krijgen een gratis periode. Zelfde regels als op de website (alleen nieuwe mailadressen).
 * Sinds 8 nov 2026 geen maximum meer, en de ambassadeursbeloning: neemt een vriend een jaar, dan krijg jij een gratis maand.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Share, View } from 'react-native'

import { fetchInvites, sendInvite } from '@/api'
import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Button, Card, Field, Loading, Notice, Screen } from '@/components/ui'
import { DisplayFont, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import { formatDate } from '@/lib/format'

export default function InviteScreen() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const invites = useQuery({
    queryKey: ['invites'],
    queryFn: async () => {
      const r = await fetchInvites()
      if (!r.ok) throw new Error(r.error.message)
      return r.data
    },
  })
  const send = useMutation({
    mutationFn: async () => {
      const r = await sendInvite(email.trim())
      if (!r.ok) throw new Error(r.error.message)
      return r.data.sent
    },
    onSuccess: () => {
      setEmail('')
      queryClient.invalidateQueries({ queryKey: ['invites'] })
    },
  })

  if (invites.isLoading) return <Loading />
  const d = invites.data
  // Geen maximum meer; oudere websites gaven er nog een mee (10).
  // Op de laatste dag van een gratis periode geeft de website geen maand meer weg (tegen freeriden, sinds 9 nov 2026).
  const stopped = d?.canGift === false
  const left = d && !stopped ? Math.max(0, d.max - d.invites.length) : 0
  const days = d?.friendDays ?? 30
  const rewards = d?.rewards ?? []
  const earned = rewards.filter((r) => r.status !== 'wacht').length

  return (
    <Screen edges={[]}>
      <Card>
        <ThemedText style={{ fontSize: 22, lineHeight: 28, fontFamily: DisplayFont.extraBold }}>Geef een maand Studiemaat cadeau</ThemedText>
        <ThemedText themeColor="textSecondary">
          Deel je eigen link via WhatsApp of waar je maar wilt. Wie via jouw link een account maakt, krijgt {days} dagen gratis.
        </ThemedText>
        {d?.rewards ? (
          <Notice kind="info">
            {'En jij verdient gratis maanden: neemt een vriend die jij uitnodigde een jaarabonnement? Dan krijg jij een maand Studiemaat cadeau. Voor elke vriend opnieuw.'}
          </Notice>
        ) : null}
        {stopped ? <Notice kind="info">{d?.giftStoppedText ?? 'Op dit moment kun je geen gratis maand cadeau geven.'}</Notice> : null}
        <Button
          title="Deel je link"
          icon="square.and.arrow.up"
          disabled={!left}
          onPress={() =>
            // Met de persoonlijke link (studiemaat.nl/vriend/...) krijgt je vriend de gratis maand en zien wij wie uitnodigde.
            // Oudere website zonder shareUrl: gewoon de voorpagina.
            Share.share({
              message: `Ik leer voor mijn toetsen met Studiemaat: maak een foto van je boek en je krijgt een uittreksel en oefenvragen. Via deze link krijg je ${days} dagen gratis: ${d?.shareUrl ?? 'https://www.studiemaat.nl'}`,
            })
          }
        />
      </Card>

      <Card>
        <ThemedText type="smallBold">Of stuur een uitnodiging per mail</ThemedText>
        <Field
          placeholder="naam@voorbeeld.nl"
          value={email}
          onChangeText={(t) => {
            send.reset()
            setEmail(t)
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
        />
        {send.isSuccess ? <Notice kind="ok">{`Uitnodiging verstuurd naar ${send.data}.`}</Notice> : null}
        {send.isError ? <Notice kind="error">{(send.error as Error).message}</Notice> : null}
        <Button title="Uitnodiging sturen" kind="secondary" icon="envelope.badge" disabled={!email.includes('@') || !left} loading={send.isPending} onPress={() => send.mutate()} />
      </Card>

      {rewards.length ? (
        <Card>
          <ThemedText type="smallBold">{earned ? `Jouw gratis maanden · ${earned} verdiend` : 'Jouw gratis maanden'}</ThemedText>
          {rewards.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <Icon name={r.status === 'wacht' ? 'clock' : 'gift.fill'} size={18} tintColor={r.status === 'wacht' ? theme.textSecondary : theme.success} />
              <View style={{ flex: 1 }}>
                <ThemedText>{`${r.friend} nam een jaar`}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {r.status === 'wacht'
                    ? `Je maand komt op ${formatDate(r.dueAt!)}`
                    : r.status === 'tegoed'
                      ? 'Tegoed: gaat in als je abonnement in de app stopt'
                      : r.how === 'periode'
                        ? `Gratis tot en met ${formatDate(r.endsAt!)}`
                        : `Je abonnement loopt gratis door tot ${formatDate(r.endsAt!)}`}
                </ThemedText>
              </View>
            </View>
          ))}
          <ThemedText type="small" themeColor="textSecondary">
            {`Je maand komt ${d?.rewardWaitDays ?? 14} dagen na de aankoop van je vriend. Wordt de aankoop teruggedraaid, dan vervalt de maand.`}
          </ThemedText>
        </Card>
      ) : null}

      {d?.invites.length ? (
        <Card>
          <ThemedText type="smallBold">Uitgenodigd</ThemedText>
          {d.invites.map((i) => (
            <View key={i.email} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <Icon name={i.accepted_at ? 'checkmark.circle.fill' : 'clock'} size={18} tintColor={i.accepted_at ? theme.success : theme.textSecondary} />
              <ThemedText style={{ flex: 1 }}>{i.email}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {i.accepted_at ? 'Doet mee' : 'Nog niet'}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  )
}
