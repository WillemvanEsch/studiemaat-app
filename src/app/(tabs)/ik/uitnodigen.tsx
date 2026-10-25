/** Vrienden uitnodigen: zij krijgen een gratis periode. Zelfde regels als op de website (maximum, alleen nieuwe mailadressen). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Share, View } from 'react-native'

import { fetchInvites, sendInvite } from '@/api'
import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Button, Card, Field, Loading, Notice, Screen } from '@/components/ui'
import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'

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
  const left = d ? Math.max(0, d.max - d.invites.length) : 0
  const days = d?.friendDays ?? 30

  return (
    <Screen edges={[]}>
      <Card>
        <ThemedText style={{ fontSize: 20, fontWeight: 800 }}>Geef een maand Studiemaat cadeau</ThemedText>
        <ThemedText themeColor="textSecondary">
          Deel je eigen link via WhatsApp of waar je maar wilt. Wie via jouw link een account maakt, krijgt {days} dagen gratis.
          {d ? ` Je kunt nog ${left} ${left === 1 ? 'vriend' : 'vrienden'} uitnodigen.` : ''}
        </ThemedText>
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
