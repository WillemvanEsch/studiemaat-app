/**
 * Overhoren en proeftoetsen. Eén vraag per scherm.
 * - Oefenen en herhaling: na elk antwoord meteen het oordeel, het goede antwoord en de uitleg.
 * - Proeftoets: antwoorden worden alleen bewaard; bij inleveren kijkt de website alles na en krijg je een cijfer.
 * Antwoorden kunnen ook hardop (spraakherkenning in de taal van de vraag), en de vraag kan worden voorgelezen.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import * as Speech from 'expo-speech'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'

import { fetchTest, finishTest, submitAnswer } from '@/api'
import type { Grade, Test, TestQuestion } from '@/api'
import { Icon } from '@/components/icon'
import { RichText } from '@/components/rich-text'
import { ThemedText } from '@/components/themed-text'
import { Button, Card, Field, Loading, Notice, Screen } from '@/components/ui'
import { DisplayFont, Radius, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import { gradeText } from '@/lib/format'

export default function TestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const testId = Number(id)
  const test = useQuery({
    queryKey: ['test', testId],
    queryFn: async () => {
      const r = await fetchTest(testId)
      if (!r.ok) throw new Error(r.error.message)
      return r.data
    },
    // Tijdens het maken niet ongemerkt opnieuw laden: dan zou je huidige vraag verspringen.
    staleTime: Infinity,
  })

  useEffect(() => () => void Speech.stop(), [])

  if (test.isLoading) return <Loading />
  if (test.isError || !test.data)
    return (
      <Screen edges={[]}>
        <Notice kind="error">{(test.error as Error | null)?.message ?? 'Toets niet gevonden'}</Notice>
      </Screen>
    )
  return test.data.finishedAt ? <Result test={test.data} /> : <Runner test={test.data} />
}

const modeLabel = (t: Test) => (t.mode === 'proeftoets' ? 'Proeftoets' : t.mode === 'herhaling' ? 'Herhaling' : 'Oefenen')

function Runner({ test }: { test: Test }) {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const total = test.questions.length
  // Verder waar je gebleven was: de eerste vraag zonder antwoord.
  const firstOpen = useMemo(() => {
    const done = new Set(test.answers.map((a) => a.position))
    const i = test.questions.findIndex((_, p) => !done.has(p))
    return i === -1 ? total : i
  }, [test, total])
  const [index, setIndex] = useState(firstOpen)
  const [answer, setAnswer] = useState('')
  const [choice, setChoice] = useState<number | null>(null)
  const [grade, setGrade] = useState<Grade | null>(null)
  const [points, setPoints] = useState(0)
  const practice = test.mode !== 'proeftoets'
  const q = test.questions[index] as TestQuestion | undefined

  const finish = useMutation({
    mutationFn: async () => {
      const r = await finishTest(test.id)
      if (!r.ok) throw new Error(r.error.message)
      return r.data
    },
    onSuccess: (done) => {
      queryClient.setQueryData(['test', test.id], done)
      queryClient.invalidateQueries({ queryKey: ['tests'] })
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      for (const l of done.lessonIds) queryClient.invalidateQueries({ queryKey: ['lesson', l] })
    },
  })

  const send = useMutation({
    mutationFn: async () => {
      const given = q!.soort === 'meerkeuze' ? (choice === null ? '' : String(choice)) : answer.trim()
      const r = await submitAnswer(test.id, index, given)
      if (!r.ok) throw new Error(r.error.message)
      return r.data
    },
    onSuccess: (r) => {
      if ('saved' in r) return next()
      setGrade(r)
      setPoints((p) => p + r.score)
      Haptics.notificationAsync(
        r.oordeel === 'goed'
          ? Haptics.NotificationFeedbackType.Success
          : r.oordeel === 'deels'
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Error,
      ).catch(() => {})
    },
  })

  const next = () => {
    Speech.stop()
    setGrade(null)
    setAnswer('')
    setChoice(null)
    send.reset()
    setIndex((i) => i + 1)
  }

  const stop = () => {
    const answered = Math.max(index, test.answers.length)
    if (!answered) return router.back()
    Alert.alert(
      practice ? 'Stoppen met oefenen?' : 'Nu inleveren?',
      practice
        ? 'Je kunt later verder, of nu stoppen en je resultaat zien.'
        : 'Vragen zonder antwoord tellen als fout. Je kunt ook later verder.',
      [
        { text: 'Later verder', onPress: () => router.back() },
        { text: practice ? 'Resultaat zien' : 'Inleveren', onPress: () => finish.mutate() },
        { text: 'Doorgaan', style: 'cancel' },
      ],
    )
  }

  const header = (
    <Stack.Screen
      options={{
        title: modeLabel(test),
        headerLeft: () => (
          <Pressable accessibilityLabel="Stoppen" onPress={stop} hitSlop={12}>
            <Icon name="xmark" size={20} tintColor={theme.primary} />
          </Pressable>
        ),
      }}
    />
  )

  if (finish.isPending)
    return (
      <>
        {header}
        <Screen edges={[]}>
          <Card style={{ alignItems: 'center', paddingVertical: Spacing.five }}>
            <Loading />
            <ThemedText style={{ textAlign: 'center' }}>Je antwoorden worden nagekeken…</ThemedText>
          </Card>
        </Screen>
      </>
    )

  if (!q)
    return (
      <>
        {header}
        <Screen edges={[]}>
          <Card style={{ alignItems: 'center', gap: Spacing.three }}>
            <Icon name="checkmark.seal.fill" size={44} tintColor={theme.success} />
            <ThemedText style={styles.h1}>Alle vragen gehad!</ThemedText>
            {practice && points ? (
              <ThemedText themeColor="textSecondary">
                Deze ronde: {points.toString().replace('.', ',')} punt{points === 1 ? '' : 'en'}.
              </ThemedText>
            ) : null}
          </Card>
          {finish.isError ? <Notice kind="error">{(finish.error as Error).message}</Notice> : null}
          <Button title={practice ? 'Bekijk je resultaat' : 'Inleveren en cijfer zien'} onPress={() => finish.mutate()} />
        </Screen>
      </>
    )

  const ready = q.soort === 'meerkeuze' ? choice !== null : answer.trim().length > 0

  return (
    <>
      {header}
      <Screen edges={['bottom']}>
        <View style={[styles.progress, { backgroundColor: theme.muted }]}>
          <View style={{ width: `${(index / total) * 100}%`, height: '100%', backgroundColor: theme.primary, borderRadius: Radius.full }} />
        </View>
        <View style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
            Vraag {index + 1} van {total} · {q.lessonTitle}
          </ThemedText>
          <Pressable
            accessibilityLabel="Vraag voorlezen"
            hitSlop={12}
            onPress={() => {
              Speech.stop()
              Speech.speak(spoken(q), { language: q.taal || 'nl-NL' })
            }}>
            <Icon name="speaker.wave.2.fill" size={22} tintColor={theme.primary} />
          </Pressable>
        </View>

        <ThemedText style={styles.question}>{q.vraag}</ThemedText>

        {q.soort === 'meerkeuze' ? (
          <View style={{ gap: Spacing.two }}>
            {q.opties.map((o, i) => {
              const picked = choice === i
              const right = grade && Number(grade.correctAnswer) === i
              const wrong = grade && picked && !right
              return (
                <Pressable
                  key={i}
                  disabled={!!grade || send.isPending}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: picked }}
                  onPress={() => setChoice(i)}
                  style={[
                    styles.option,
                    {
                      borderColor: right ? theme.success : wrong ? theme.destructive : picked ? theme.primary : theme.border,
                      backgroundColor: right ? theme.successSoft : wrong ? theme.destructiveSoft : picked ? theme.accent : theme.backgroundElement,
                    },
                  ]}>
                  <ThemedText style={{ fontWeight: 700 }}>{String.fromCharCode(65 + i)}</ThemedText>
                  <ThemedText style={{ flex: 1 }}>{o}</ThemedText>
                </Pressable>
              )
            })}
          </View>
        ) : (
          <View style={{ gap: Spacing.two }}>
            <Field
              value={answer}
              onChangeText={setAnswer}
              editable={!grade && !send.isPending}
              placeholder={q.soort === 'open' ? 'Schrijf je antwoord in je eigen woorden' : 'Je antwoord'}
              multiline={q.soort === 'open'}
              style={q.soort === 'open' ? { minHeight: 120, paddingTop: Spacing.three, textAlignVertical: 'top' } : undefined}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!grade ? <MicButton lang={q.taal || 'nl-NL'} onText={(t) => setAnswer((a) => (a ? `${a} ${t}` : t))} /> : null}
          </View>
        )}

        {grade ? <Feedback grade={grade} question={q} /> : null}
        {send.isError ? <Notice kind="error">{(send.error as Error).message}</Notice> : null}

        {grade ? (
          <Button title={index + 1 < total ? 'Volgende vraag' : 'Klaar'} icon="arrow.right" onPress={next} />
        ) : (
          <Button
            title={practice ? 'Nakijken' : index + 1 < total ? 'Volgende' : 'Laatste antwoord opslaan'}
            disabled={!ready}
            loading={send.isPending}
            onPress={() => send.mutate()}
          />
        )}
        {!grade && !send.isPending ? <Button title="Weet ik niet, sla over" kind="ghost" onPress={() => (practice ? send.mutate() : next())} /> : null}
      </Screen>
    </>
  )
}

function Feedback({ grade, question }: { grade: Grade; question: TestQuestion }) {
  const kind = grade.oordeel === 'goed' ? 'ok' : grade.oordeel === 'deels' ? 'warn' : 'error'
  const title = grade.oordeel === 'goed' ? 'Goed!' : grade.oordeel === 'deels' ? 'Bijna goed' : 'Helaas, niet goed'
  return (
    <Notice kind={kind}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {grade.feedback ? <ThemedText type="small">{grade.feedback}</ThemedText> : null}
      {question.soort !== 'meerkeuze' && grade.oordeel !== 'goed' && grade.correctAnswer ? (
        <ThemedText type="small">
          <ThemedText type="smallBold">Antwoord: </ThemedText>
          {String(grade.correctAnswer)}
        </ThemedText>
      ) : null}
      {grade.explanation ? <RichText text={grade.explanation} /> : null}
    </Notice>
  )
}

/** Hardop antwoorden. De herkende tekst komt in het invoerveld, zodat je hem nog kunt verbeteren. */
function MicButton({ lang, onText }: { lang: string; onText: (text: string) => void }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useSpeechRecognitionEvent('start', () => setListening(true))
  useSpeechRecognitionEvent('end', () => setListening(false))
  useSpeechRecognitionEvent('result', (e) => {
    if (e.isFinal && e.results[0]?.transcript) onText(e.results[0].transcript.trim())
  })
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false)
    if (e.error !== 'aborted' && e.error !== 'no-speech') setError('Inspreken lukte niet. Typ je antwoord gerust.')
  })

  const toggle = async () => {
    setError(null)
    if (listening) return ExpoSpeechRecognitionModule.stop()
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!perm.granted) return setError('Geef Studiemaat toegang tot de microfoon in de instellingen van je telefoon.')
    Speech.stop()
    ExpoSpeechRecognitionModule.start({ lang, interimResults: false, continuous: false })
  }

  return (
    <View style={{ gap: Spacing.one }}>
      <Button
        title={listening ? 'Stop met inspreken' : 'Antwoord inspreken'}
        kind={listening ? 'danger' : 'secondary'}
        icon={listening ? 'stop.fill' : 'mic.fill'}
        onPress={toggle}
      />
      {error ? <Notice kind="warn">{error}</Notice> : null}
    </View>
  )
}

function Result({ test }: { test: Test }) {
  const theme = useTheme()
  const byPos = new Map(test.answers.map((a) => [a.position, a]))
  const g = test.grade ?? 0
  const color = g >= 7 ? theme.success : g >= 5.5 ? theme.warning : theme.destructive
  return (
    <>
      <Stack.Screen options={{ title: modeLabel(test), headerLeft: undefined }} />
      <Screen edges={['bottom']}>
        <Card style={{ alignItems: 'center' }}>
          <ThemedText type="small" themeColor="textSecondary">
            {test.title}
          </ThemedText>
          <ThemedText style={[styles.grade, { color }]}>{gradeText(test.grade)}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {String(test.score ?? 0).replace('.', ',')} van {test.maxScore ?? test.questions.length} punten
          </ThemedText>
        </Card>
        <Button title="Terug" kind="secondary" onPress={() => router.back()} />
        {test.questions.map((q, i) => {
          const a = byPos.get(i)
          const score = a?.score ?? 0
          const tint = score >= 1 ? theme.success : score > 0 ? theme.warning : theme.destructive
          const given = q.soort === 'meerkeuze' && a?.answer !== undefined && a.answer !== '' ? q.opties[Number(a.answer)] : a?.answer
          const right = q.soort === 'meerkeuze' ? q.opties[q.juisteOptie] : q.antwoord
          return (
            <Card key={i}>
              <View style={styles.row}>
                <Icon name={score >= 1 ? 'checkmark.circle.fill' : score > 0 ? 'circle.lefthalf.filled' : 'xmark.circle.fill'} size={20} tintColor={tint} />
                <ThemedText type="smallBold" style={{ flex: 1 }}>
                  {i + 1}. {q.vraag}
                </ThemedText>
              </View>
              <ThemedText type="small">
                <ThemedText type="smallBold">Jouw antwoord: </ThemedText>
                {given || '(geen antwoord)'}
              </ThemedText>
              {score < 1 && right ? (
                <ThemedText type="small">
                  <ThemedText type="smallBold">Goede antwoord: </ThemedText>
                  {right}
                </ThemedText>
              ) : null}
              {a?.feedback ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {a.feedback}
                </ThemedText>
              ) : null}
            </Card>
          )
        })}
      </Screen>
    </>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, lineHeight: 32, fontFamily: DisplayFont.extraBold, textAlign: 'center' },
  question: { fontSize: 21, lineHeight: 29, fontWeight: 700 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  progress: { height: 6, borderRadius: Radius.full, overflow: 'hidden' },
  option: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center', borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.three },
  grade: { fontSize: 68, lineHeight: 76, fontFamily: DisplayFont.extraBold },
})

/**
 * Wat er wordt voorgelezen. Bij meerkeuze ook de letters (A, B, C), net als op het scherm, zodat je weet welke
 * je moet kiezen. De punt na de letter zorgt dat hij als letter wordt uitgesproken, met een korte pauze.
 */
function spoken(q: { soort: string; vraag: string; opties: string[] }) {
  if (q.soort !== 'meerkeuze') return q.vraag
  return [q.vraag, ...q.opties.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`)].join('. ')
}
