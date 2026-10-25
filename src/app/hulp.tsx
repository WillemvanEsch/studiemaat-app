/** Hulp en contact: veelgestelde vragen in het kort, en mailen of de website openen (met "naar buiten"-icoon). */

import Constants from 'expo-constants'
import { StyleSheet, View } from 'react-native'

import { ListRow } from '@/components/list-row'
import { ThemedText } from '@/components/themed-text'
import { Card, Screen } from '@/components/ui'
import { Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'

const FAQ: [string, string][] = [
  ['Hoe lang duurt het maken van een les?', 'Meestal 1 tot 3 minuten. Je krijgt een melding als hij klaar is, ook als je de app hebt dichtgedaan.'],
  ['Mijn les is niet gelukt', 'Open de les en tik op opnieuw proberen. Lukt het weer niet? Maak scherpe foto\'s bij goed licht, met de tekst recht in beeld.'],
  ['Kan ik meer vragen krijgen?', 'Ja. Open een les en tik op Maak nieuwe vragen. Hoeveel vragen een toets heeft, stel je in onder Ik → Niveau en instellingen.'],
  ['Hoe zeg ik mijn abonnement op?', 'Een abonnement uit de app zeg je op in de instellingen van je telefoon (App Store of Google Play). Onder Ik → Abonnement staat een knop daarheen.'],
]

export default function HulpScreen() {
  const { me } = useAuth()
  const subject = encodeURIComponent('Vraag over de Studiemaat-app')
  const body = encodeURIComponent(
    `\n\n---\nAccount: ${me?.user.email ?? ''}\nApp: ${Constants.expoConfig?.version ?? ''}`,
  )
  return (
    <Screen edges={[]}>
      <Card>
        {FAQ.map(([q, a]) => (
          <View key={q} style={styles.item}>
            <ThemedText type="smallBold">{q}</ThemedText>
            <ThemedText>{a}</ThemedText>
          </View>
        ))}
      </Card>
      <ThemedText type="smallBold">Kom je er niet uit?</ThemedText>
      <Card style={{ paddingVertical: Spacing.one, gap: 0 }}>
        <ListRow
          icon="envelope"
          label="Mail ons"
          sub="info@studiemaat.nl, we antwoorden meestal binnen een dag"
          url={`mailto:info@studiemaat.nl?subject=${subject}&body=${body}`}
        />
        <ListRow icon="globe" label="Website" sub="studiemaat.nl" url="https://www.studiemaat.nl" last />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  item: { gap: 2 },
})
