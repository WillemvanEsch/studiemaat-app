/** Ik: wie je bent, je abonnement en de links naar instellingen, uitnodigen, privacy, uitloggen en account verwijderen. */

import Constants from 'expo-constants'
import { router, type Href } from 'expo-router'
import { Alert, Linking, Pressable, StyleSheet } from 'react-native'

import { Icon } from '@/components/icon'
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
        <Row icon="slider.horizontal.3" label="Niveau en instellingen" href="/(tabs)/ik/instellingen" />
        <Row icon="person.badge.plus" label="Vriend uitnodigen" href="/(tabs)/ik/uitnodigen" />
        <Row icon="hand.raised" label="Privacyverklaring" onPress={() => Linking.openURL('https://studiemaat.nl/privacy')} />
        <Row icon="questionmark.circle" label="Hulp en contact" onPress={() => Linking.openURL('mailto:info@studiemaat.nl')} last />
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

function Row({
  icon,
  label,
  href,
  onPress,
  color,
  last,
}: {
  icon: string
  label: string
  href?: Href
  onPress?: () => void
  color?: string
  last?: boolean
}) {
  const theme = useTheme()
  const tint = color ?? theme.text
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ?? (() => href && router.push(href))}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && { opacity: 0.6 },
      ]}>
      <Icon name={icon} size={20} tintColor={color ?? theme.primary} />
      <ThemedText style={{ flex: 1, color: tint }}>{label}</ThemedText>
      <Icon name="chevron.right" size={14} tintColor={theme.textSecondary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
})
