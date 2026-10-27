/**
 * Account verwijderen (verplicht in de App Store en Play Store).
 * Lukt het niet meteen (bv. bij een lopend betaald abonnement), dan krijgt de beheerder een verzoek en hoor je het per mail.
 */

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { deleteAccount } from '@/api'
import { STORE_NAME } from '@/lib/version'
import { ThemedText } from '@/components/themed-text'
import { DisplayFont } from '@/constants/theme'
import { Button, Card, Field, Notice, Screen } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'

export default function DeleteAccountScreen() {
  const { logout } = useAuth()
  const [confirm, setConfirm] = useState('')
  const remove = useMutation({
    mutationFn: async () => {
      const r = await deleteAccount()
      if (!r.ok) throw new Error(r.error.message)
      return r.data
    },
    onSuccess: (r) => {
      // Weg: de sessie bestaat niet meer, dus lokaal ook uitloggen.
      if (r.deleted) logout()
    },
  })

  if (remove.data && !remove.data.deleted)
    return (
      <Screen edges={[]}>
        <Notice kind="ok">{remove.data.message ?? 'We hebben je verzoek ontvangen en handelen het zo snel mogelijk af.'}</Notice>
      </Screen>
    )

  return (
    <Screen edges={[]}>
      <Card>
        <ThemedText style={{ fontSize: 22, lineHeight: 28, fontFamily: DisplayFont.extraBold }}>Weet je het zeker?</ThemedText>
        <ThemedText>
          Je account, je lessen, je foto’s en je toetsresultaten worden definitief verwijderd. Dit kun je niet ongedaan maken.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Een abonnement via {STORE_NAME} zeg je op in de instellingen van je telefoon; dat stopt niet vanzelf.
        </ThemedText>
        <Field label="Typ VERWIJDEREN om te bevestigen" value={confirm} onChangeText={setConfirm} autoCapitalize="characters" autoCorrect={false} />
      </Card>
      {remove.isError ? <Notice kind="error">{(remove.error as Error).message}</Notice> : null}
      <Button
        title="Account definitief verwijderen"
        kind="danger"
        disabled={confirm.trim().toUpperCase() !== 'VERWIJDEREN'}
        loading={remove.isPending}
        onPress={() => remove.mutate()}
      />
    </Screen>
  )
}
