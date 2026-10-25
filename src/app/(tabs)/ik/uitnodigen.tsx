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
          Je vriend of vriendin krijgt {days} dagen gratis. Vul het mailadres in, dan sturen wij een uitnodiging.
          {d ? ` Je kunt nog ${left} ${left === 1 ? 'vriend' : 'vrienden'} uitnodigen.` : ''}
        </ThemedText>
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
        <Button title="Uitnodiging sturen" icon="envelope.badge" disabled={!email.includes('@') || !left} loading={send.isPending} onPress={() => send.mutate()} />
        <Button
          title="Vertel het via WhatsApp of berichten"
          kind="ghost"
          icon="square.and.arrow.up"
          onPress={() =>
            Share.share({ message: 'Ik leer voor mijn toetsen met Studiemaat: foto van je boek, en je krijgt een uittreksel en oefenvragen. https://studiemaat.nl' })
          }
        />
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
