/**
 * Privacy in het kort, in de app. De volledige privacyverklaring staat op de website (link met "naar buiten"-icoon).
 * Houd dit in lijn met studiemaat.nl/privacy: daar staat wat juridisch telt.
 */

import { StyleSheet, View } from 'react-native'

import { ListRow } from '@/components/list-row'
import { STORE_NAME } from '@/lib/version'
import { ThemedText } from '@/components/themed-text'
import { Card, Screen } from '@/components/ui'
import { Spacing } from '@/constants/theme'

const POINTS: [string, string][] = [
  ['Wat we bewaren', 'Je mailadres, naam, niveau en leerjaar, je foto\'s, de lessen en vragen die daaruit komen, en je antwoorden en cijfers.'],
  ['Waarvoor', 'Alleen om Studiemaat te laten werken: je account, je lessen, het nakijken en je abonnement. We verkopen niets door.'],
  ['AI', 'Je foto\'s en antwoorden worden door een AI-dienst geanalyseerd om je lesstof en vragen te maken en na te kijken. Die mag ze niet voor iets anders gebruiken.'],
  ['Geen reclame', 'In de app zitten geen advertenties en geen trackers. Alleen als de app vastloopt, krijgen we een technische foutmelding.'],
  ['Betalen', `Een abonnement in de app loopt via ${STORE_NAME}. Wij zien je betaalgegevens niet.`],
  ['Weg ermee', 'Je kunt je account en alles wat erbij hoort zelf verwijderen, onder Ik → Account verwijderen.'],
]

export default function PrivacyScreen() {
  return (
    <Screen edges={[]}>
      <ThemedText themeColor="textSecondary">
        Veel van onze gebruikers zijn jong. Daarom bewaren we zo weinig mogelijk en gaan we zorgvuldig om met je gegevens.
      </ThemedText>
      <Card>
        {POINTS.map(([title, text]) => (
          <View key={title} style={styles.point}>
            <ThemedText type="smallBold">{title}</ThemedText>
            <ThemedText>{text}</ThemedText>
          </View>
        ))}
      </Card>
      <Card style={{ paddingVertical: Spacing.one, gap: 0 }}>
        <ListRow icon="doc.text" label="Volledige privacyverklaring" sub="studiemaat.nl/privacy" url="https://www.studiemaat.nl/privacy" />
        <ListRow icon="envelope" label="Vraag over je gegevens" sub="info@studiemaat.nl" url="mailto:info@studiemaat.nl" last />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  point: { gap: 2 },
})
