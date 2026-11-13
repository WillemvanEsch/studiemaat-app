/**
 * Inloggen met een code per mail, precies zoals op studiemaat.nl.
 * Nog geen account? Dan maakt dezelfde stap er een aan, met een gratis proefweek.
 */

import { useEffect, useState } from 'react'
import { Image, KeyboardAvoidingView, Linking, Platform, StyleSheet, View } from 'react-native'

import { Wordmark } from '@/components/brand'
import { ThemedText } from '@/components/themed-text'
import { Button, Field, Notice, Screen } from '@/components/ui'
import { Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'

/** Zo lang wachten voor je een nieuwe code kunt laten sturen: mail heeft soms even nodig. */
const RESEND_SECONDS = 30
const CONTACT = 'info@studiemaat.nl'

export default function LoginScreen() {
  const { requestCode, verifyCode } = useAuth()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  // "Stuur opnieuw" kan pas een halve minuut na de laatst verstuurde code.
  const [sentAt, setSentAt] = useState(0)
  const [now, setNow] = useState(0)
  const wait = Math.max(0, Math.ceil((sentAt + RESEND_SECONDS * 1000 - now) / 1000))

  useEffect(() => {
    if (step !== 'code') return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [step])

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
    const t = Date.now()
    setSentAt(t)
    setNow(t)
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
          <Wordmark size={32} icon={false} />
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
            <Button
              title={wait > 0 ? `Stuur opnieuw (over ${wait} s)` : 'Stuur een nieuwe code'}
              kind="ghost"
              disabled={wait > 0 || busy}
              onPress={() => sendCode()}
            />
            <Button title="Ander mailadres" kind="ghost" onPress={() => setStep('email')} />
            {/* Veel nieuwe accounts vullen de code nooit in: spam, quarantaine (vaak bij schooladressen) of een typfout.
                Daarom voor iedereen dezelfde korte stappen, en een mailadres om ons te bereiken. */}
            <View style={styles.help}>
              <ThemedText type="smallBold">Geen mail gekregen?</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                • Kijk in je spam of ongewenste mail (bij Outlook ook bij Overige, bij een schooladres soms in de quarantaine).
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                • Klopt het mailadres hierboven? Zo niet, kies &quot;Ander mailadres&quot;.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                • Na een halve minuut kun je een nieuwe code laten sturen. Een code werkt 10 minuten.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                • Lukt het nog steeds niet? Mail ons op{' '}
                <ThemedText type="smallBold" themeColor="link" onPress={() => Linking.openURL(contactMail(email)).catch(() => {})}>
                  {CONTACT}
                </ThemedText>
                , dan helpen we je.
              </ThemedText>
            </View>
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  )
}

/** Mail aan ons met het adres erin, zodat we meteen kunnen kijken wat er misging. */
function contactMail(email: string) {
  const subject = encodeURIComponent('Geen inlogcode ontvangen')
  const body = encodeURIComponent(`Ik krijg geen inlogcode op dit adres: ${email}\n\n`)
  return `mailto:${CONTACT}?subject=${subject}&body=${body}`
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.five },
  header: { alignItems: 'center', gap: Spacing.two },
  logo: { width: 72, height: 72, borderRadius: 18 },
  center: { textAlign: 'center' },
  form: { gap: Spacing.three },
  help: { gap: Spacing.one },
  code: { fontSize: 28, letterSpacing: 8, textAlign: 'center' },
})
