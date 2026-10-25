/** Ik: wie je bent, je abonnement en de links naar instellingen, uitnodigen, privacy, uitloggen en account verwijderen. */

import Constants from 'expo-constants'
import { router } from 'expo-router'
import { Alert } from 'react-native'

import { ListRow as Row } from '@/components/list-row'
import { ThemedText } from '@/components/themed-text'
import { Card, Screen, Title } from '@/components/ui'
import { Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/hooks/use-theme'

export default function IkScreen() {
  const { me, logout } = useAuth()
  const theme = useTheme()

  const signOut = () =>
    Alert.alert('Uitloggen?', 'Je kunt altijd weer inloggen met een code per mail.', [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Uitloggen', style: 'destructive', onPress: () => logout() },
    ])

  return (
    <Screen>
      <Title sub={me?.user.email ?? undefined}>{me?.user.name || 'Ik'}</Title>

      <Card onPress={() => router.push('/(tabs)/ik/abonnement')}>
        <ThemedText type="smallBold">Abonnement</ThemedText>
        <ThemedText themeColor={me?.access.hasAccess ? 'text' : 'textSecondary'}>
          {me?.access.label ?? (me?.access.hasAccess ? 'Actief' : 'Geen actief abonnement')}
        </ThemedText>
      </Card>

      <Card style={{ paddingVertical: Spacing.one, gap: 0 }}>
        <Row icon="slider.horizontal.3" label="Instellingen" sub="Niveau, vragen en weergave (licht of donker)" href="/(tabs)/ik/instellingen" />
        <Row icon="person.badge.plus" label="Vriend uitnodigen" href="/(tabs)/ik/uitnodigen" />
        <Row icon="hand.raised" label="Privacy" href="/privacy" />
        <Row icon="questionmark.circle" label="Hulp en contact" href="/hulp" last />
      </Card>

      <Card style={{ paddingVertical: Spacing.one, gap: 0 }}>
        <Row icon="rectangle.portrait.and.arrow.right" label="Uitloggen" onPress={signOut} />
        <Row icon="trash" label="Account verwijderen" href="/(tabs)/ik/verwijderen" color={theme.destructive} last />
      </Card>

      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        Studiemaat {Constants.expoConfig?.version ?? ''}
      </ThemedText>
    </Screen>
  )
}

