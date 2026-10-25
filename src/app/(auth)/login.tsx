/**
 * Inloggen met een code per mail, precies zoals op studiemaat.nl.
 * Nog geen account? Dan maakt dezelfde stap er een aan, met een gratis proefweek.
 */

import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { Button, Field, Notice, Screen } from '@/components/ui'
import { Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'

export default function LoginScreen() {
  const { requestCode, verifyCode } = useAuth()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  async function sendCode(existing = false) {
    setBusy(true)
    setError(null)
    const r = await requestCode(email.trim(), existing)
    setBusy(false)
    if (!r.ok) return setError(r.error.message)
    setEmail(r.data.email)
    setNote(r.data.note)
    setCode('')
    setStep('code')
  }

  async function checkCode(value = code) {
    if (value.replace(/\D/g, '').length !== 6) return
    setBusy(true)
    setError(null)
    const r = await verifyCode(email, value)
    setBusy(false)
    // Gelukt: de (auth)-layout stuurt door naar de lessen.
    if (!r.ok) setError(r.error.message)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
          <ThemedText style={styles.brand}>Studiemaat</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Maak een foto van je lesstof. Studiemaat maakt er een uittreksel en oefenvragen van.
          </ThemedText>
        </View>

        {step === 'email' ? (
          <View style={styles.form}>
            <Field
              label="Je mailadres"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={() => sendCode()}
              placeholder="naam@voorbeeld.nl"
            />
            {error ? <Notice kind="error">{error}</Notice> : null}
            <Button title="Stuur me een code" loading={busy} disabled={!email.includes('@')} onPress={() => sendCode()} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Nieuw bij Studiemaat? Je krijgt een week gratis, zonder betaalgegevens.
            </ThemedText>
            <Button title="Ik heb al een code" kind="ghost" disabled={!email.includes('@') || busy} onPress={() => sendCode(true)} />
          </View>
        ) : (
          <View style={styles.form}>
            <ThemedText>
              We hebben een code van 6 cijfers gestuurd naar <ThemedText style={{ fontWeight: 700 }}>{email}</ThemedText>.
            </ThemedText>
            {note ? <Notice>{note}</Notice> : null}
            <Field
              label="Code"
              value={code}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, '').slice(0, 6)
                setCode(digits)
                if (digits.length === 6) checkCode(digits)
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              style={styles.code}
            />
            {error ? <Notice kind="error">{error}</Notice> : null}
            <Button title="Inloggen" loading={busy} disabled={code.length !== 6} onPress={() => checkCode()} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Geen mail gezien? Kijk ook in je spam. De code werkt 10 minuten.
            </ThemedText>
            <Button title="Ander mailadres" kind="ghost" onPress={() => setStep('email')} />
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.five },
  header: { alignItems: 'center', gap: Spacing.two },
  logo: { width: 72, height: 72, borderRadius: 18 },
  brand: { fontSize: 30, lineHeight: 36, fontWeight: 800 },
  center: { textAlign: 'center' },
  form: { gap: Spacing.three },
  code: { fontSize: 28, letterSpacing: 8, textAlign: 'center' },
})
