/**
 * Eén les: uittreksel, begrippen, flitskaarten en de foto's, plus knoppen om te oefenen of een proeftoets te maken.
 * Wordt de les nog gemaakt, dan kijken we elke 5 seconden of hij klaar is (je krijgt ook een pushbericht).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native'

import { authHeaders, BASE_URL, createTest, deleteLesson, fetchLesson, makeQuestions, retryLesson } from '@/api'
import type { Lesson, TopicStat } from '@/api'
import { Flashcards } from '@/components/flashcards'
import { Icon } from '@/components/icon'
import { RichText } from '@/components/rich-text'
import { ThemedText } from '@/components/themed-text'
import { Button, Card, Chips, Loading, Notice, Screen } from '@/components/ui'
import { Radius, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'

type Tab = 'uittreksel' | 'begrippen' | 'kaarten' | 'fotos'

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const lessonId = Number(id)
  const theme = useTheme()
  const queryClient = useQueryClient()
  const lesson = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const r = await fetchLesson(lessonId)
      if (!r.ok) throw new Error(r.error.message)
      return r.data
    },
    refetchInterval: (q) => (q.state.data?.status === 'processing' || q.state.data?.makingQuestions ? 5000 : false),
  })

  // Klaar gekomen terwijl je keek: ook de lijst bijwerken.
  const status = lesson.data?.status
  useEffect(() => {
    if (status === 'ready') queryClient.invalidateQueries({ queryKey: ['lessons'] })
  }, [status, queryClient])

  const remove = () =>
    Alert.alert('Les verwijderen?', 'De les, de foto’s en de vragen zijn daarna weg. Je toetsresultaten blijven staan.', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: async () => {
          await deleteLesson(lessonId)
          queryClient.invalidateQueries({ queryKey: ['lessons'] })
          router.back()
        },
      },
    ])

  return (
    <>
      <Stack.Screen
        options={{
          title: lesson.data?.title ?? '',
          headerRight: () => (
            <Pressable accessibilityLabel="Les verwijderen" onPress={remove} hitSlop={12}>
              <Icon name="trash" size={20} tintColor={theme.destructive} />
            </Pressable>
          ),
        }}
      />
      {lesson.isLoading ? (
        <Loading />
      ) : lesson.isError || !lesson.data ? (
        <Screen edges={[]}>
          <Notice kind="error">{(lesson.error as Error | null)?.message ?? 'Les niet gevonden'}</Notice>
        </Screen>
      ) : (
        <LessonBody lesson={lesson.data} />
      )}
    </>
  )
}

function LessonBody({ lesson }: { lesson: Lesson }) {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('uittreksel')
  const [count, setCount] = useState<'10' | '20' | '30'>('20')

  const start = useMutation({
    mutationFn: async (mode: 'oefenen' | 'proeftoets') => {
      const r = await createTest({ mode, lessonIds: [lesson.id], count: mode === 'oefenen' ? 15 : Number(count) })
      if (!r.ok) throw new Error(r.error.message)
      return r.data.id
    },
    onSuccess: (id) => router.push(`/toets/${id}`),
  })
  const more = useMutation({
    mutationFn: async () => {
      const r = await makeQuestions(lesson.id)
      if (!r.ok) throw new Error(r.error.message)
      return r.data.message
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['lesson', lesson.id] }),
  })
  const retry = useMutation({
    mutationFn: () => retryLesson(lesson.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['lesson', lesson.id] }),
  })

  if (lesson.status === 'processing')
    return (
      <Screen edges={[]}>
        <Card style={{ alignItems: 'center', paddingVertical: Spacing.five }}>
          <ActivityIndicator color={theme.primary} size="large" />
          <ThemedText style={styles.h2}>Je les wordt gemaakt</ThemedText>
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
            Dit duurt meestal 1 tot 3 minuten. Je mag de app gerust sluiten: je krijgt een berichtje als hij klaar is.
          </ThemedText>
        </Card>
      </Screen>
    )

  if (lesson.status === 'error' || !lesson.content)
    return (
      <Screen edges={[]}>
        <Notice kind="error">{lesson.error ?? 'Het maken van deze les is niet gelukt.'}</Notice>
        <Button title="Opnieuw proberen" icon="arrow.clockwise" loading={retry.isPending} onPress={() => retry.mutate()} />
      </Screen>
    )

  const c = lesson.content
  const hasQuestions = c.vragen.length > 0

  return (
    <Screen edges={[]}>
      <View style={{ gap: Spacing.one }}>
        <ThemedText type="small" themeColor="textSecondary">
          {lesson.subject}
        </ThemedText>
        <ThemedText style={styles.h1}>{lesson.title}</ThemedText>
        <ThemedText themeColor="textSecondary">{c.korteSamenvatting}</ThemedText>
      </View>

      {hasQuestions ? (
        <Card>
          <ThemedText type="smallBold">Overhoren</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {c.vragen.length} vragen{lesson.freshCount ? `, waarvan ${lesson.freshCount} nog niet gehad` : ''}.
          </ThemedText>
          <Button title="Oefenen" icon="checklist" loading={start.isPending && start.variables === 'oefenen'} onPress={() => start.mutate('oefenen')} />
          <View style={styles.testRow}>
            <Chips
              options={[
                { id: '10', label: '10' },
                { id: '20', label: '20' },
                { id: '30', label: '30' },
              ]}
              value={count}
              onChange={setCount}
            />
            <Button
              title="Proeftoets"
              kind="secondary"
              icon="graduationcap.fill"
              style={{ flex: 1 }}
              loading={start.isPending && start.variables === 'proeftoets'}
              onPress={() => start.mutate('proeftoets')}
            />
          </View>
          {start.isError ? <Notice kind="error">{(start.error as Error).message}</Notice> : null}
          <Button
            title={lesson.makingQuestions || more.isPending ? 'Nieuwe vragen worden gemaakt…' : 'Maak nieuwe vragen'}
            kind="ghost"
            disabled={lesson.makingQuestions || more.isPending}
            onPress={() => more.mutate()}
          />
          {more.data ? <Notice kind="ok">{more.data}</Notice> : null}
          {more.isError ? <Notice kind="error">{(more.error as Error).message}</Notice> : null}
        </Card>
      ) : null}

      {lesson.topics.some((t) => t.verdict !== 'onbekend') ? <Topics topics={lesson.topics} /> : null}

      <Chips
        options={[
          { id: 'uittreksel', label: 'Uittreksel' },
          { id: 'begrippen', label: 'Begrippen' },
          { id: 'kaarten', label: 'Flitskaarten' },
          { id: 'fotos', label: "Foto's" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'uittreksel' ? <Summary lesson={lesson} /> : null}
      {tab === 'begrippen' ? (
        c.begrippen.length ? (
          c.begrippen.map((b, i) => (
            <Card key={i}>
              <ThemedText style={{ fontWeight: 700, fontSize: 17 }}>{b.term}</ThemedText>
              <ThemedText>{b.uitleg}</ThemedText>
              {b.voorbeeld ? <ThemedText themeColor="textSecondary">Bijv. {b.voorbeeld}</ThemedText> : null}
            </Card>
          ))
        ) : (
          <ThemedText themeColor="textSecondary">Deze les heeft geen begrippen.</ThemedText>
        )
      ) : null}
      {tab === 'kaarten' ? <Flashcards cards={c.begrippen} /> : null}
      {tab === 'fotos' ? <Photos lesson={lesson} /> : null}
    </Screen>
  )
}

function Summary({ lesson }: { lesson: Lesson }) {
  const theme = useTheme()
  const c = lesson.content!
  return (
    <View style={{ gap: Spacing.three }}>
      {c.kernpunten.length ? (
        <Card>
          <ThemedText type="smallBold">Het belangrijkste</ThemedText>
          {c.kernpunten.map((k, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: Spacing.two }}>
              <Icon name="star.fill" size={14} tintColor={theme.secondary} style={{ marginTop: 5 }} />
              <View style={{ flex: 1 }}>
                <RichText text={k} />
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      {c.secties.map((s, i) => (
        <Card key={i}>
          <ThemedText style={styles.h2}>{s.titel}</ThemedText>
          <RichText text={s.inhoud} />
          {s.sidenotes.map((n, j) => (
            <View key={j} style={[styles.sidenote, { backgroundColor: theme.muted, borderLeftColor: theme.secondary }]}>
              <ThemedText type="smallBold" style={{ textTransform: 'capitalize' }}>
                {n.soort}
              </ThemedText>
              <ThemedText type="small">{n.tekst}</ThemedText>
            </View>
          ))}
        </Card>
      ))}
      {c.tabellen.map((t, i) => (
        <Card key={`t${i}`}>
          <ThemedText style={styles.h2}>{t.titel}</ThemedText>
          <View style={{ gap: 1, backgroundColor: theme.border, borderRadius: Radius.sm, overflow: 'hidden' }}>
            {[t.kolommen, ...t.rijen].map((row, r) => (
              <View key={r} style={{ flexDirection: 'row', gap: 1 }}>
                {row.map((cell, k) => (
                  <ThemedText
                    key={k}
                    type={r === 0 ? 'smallBold' : 'small'}
                    style={{ flex: 1, padding: Spacing.two, backgroundColor: r === 0 ? theme.muted : theme.backgroundElement }}>
                    {cell}
                  </ThemedText>
                ))}
              </View>
            ))}
          </View>
        </Card>
      ))}
    </View>
  )
}

function Topics({ topics }: { topics: TopicStat[] }) {
  const theme = useTheme()
  const color = (v: TopicStat['verdict']) =>
    v === 'voldoende' ? theme.success : v === 'twijfel' ? theme.warning : v === 'onvoldoende' ? theme.destructive : theme.textSecondary
  const label = (v: TopicStat['verdict']) =>
    v === 'voldoende' ? 'Voldoende' : v === 'twijfel' ? 'Twijfel' : v === 'onvoldoende' ? 'Nog oefenen' : 'Nog te weinig geoefend'
  return (
    <Card>
      <ThemedText type="smallBold">Hoe sta je ervoor?</ThemedText>
      {topics.map((t) => (
        <View key={t.topic} style={styles.topic}>
          <ThemedText style={{ flex: 1 }}>{t.topic}</ThemedText>
          <ThemedText type="smallBold" style={{ color: color(t.verdict) }}>
            {label(t.verdict)}
          </ThemedText>
        </View>
      ))}
    </Card>
  )
}

function Photos({ lesson }: { lesson: Lesson }) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null)
  useEffect(() => {
    authHeaders().then(setHeaders)
  }, [])
  if (!headers) return <Loading />
  return (
    <View style={{ gap: Spacing.three }}>
      {lesson.pages.map((p) => (
        <Image
          key={p.id}
          source={{ uri: `${BASE_URL.replace(/\/api\/v1$/, '')}${p.url}`, headers }}
          style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: Radius.md }}
          contentFit="contain"
          accessibilityLabel={`Foto ${p.position + 1}`}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, lineHeight: 32, fontWeight: 800 },
  h2: { fontSize: 19, lineHeight: 26, fontWeight: 700 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sidenote: { borderLeftWidth: 4, borderRadius: Radius.sm, padding: Spacing.two, gap: 2 },
  topic: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
})
