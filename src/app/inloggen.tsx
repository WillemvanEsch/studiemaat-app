/**
 * Inloggen met de knop "Direct inloggen" uit de codemail (sinds 13 nov 2026).
 *
 * De knop in de mail opent een pagina op studiemaat.nl. Vroeg je de code aan in de app en open je die pagina op je
 * telefoon, dan opent "Open de Studiemaat-app" dit scherm met studiemaat://inloggen?t=<token>. Wij sturen het token
 * naar de website; die logt in zoals met de code (eenmalig, 10 minuten). Lukt het niet, dan kun je de code nog typen.
 */

import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'

import { Wordmark } from '@/components/brand'
import { ThemedText } from '@/components/themed-text'
import { Button, Loading, Notice, Screen } from '@/components/ui'
import { Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'

export default function LinkLoginScreen() {
  const { t } = useLocalSearchParams<{ t?: string }>()
  const { loginWithLink } = useAuth()
  const [failed, setFailed] = useState<string | null>(null)
  const error = t ? failed : 'Deze inloglink is niet compleet. Vul de code uit de mail in.'
  // Maar één keer proberen: het token is eenmalig, een tweede poging zou altijd mislukken.
  const tried = useRef(false)

  useEffect(() => {
    if (tried.current || !t) return
    tried.current = true
    loginWithLink(String(t)).then((r) => {
      if (r.ok) router.replace('/(tabs)')
      else setFailed(r.error.message)
    })
  }, [t, loginWithLink])

  if (!error) return <Loading />
  return (
    <Screen>
      <View style={{ gap: Spacing.three, paddingTop: Spacing.five }}>
        <Wordmark />
        <ThemedText type="subtitle">Inloggen lukte niet</ThemedText>
        <Notice kind="error">{error}</Notice>
        <Button title="Naar inloggen" onPress={() => router.replace('/(auth)/login')} />
      </View>
    </Screen>
  )
}
