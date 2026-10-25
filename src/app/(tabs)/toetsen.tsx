/** Alle toetsen en oefenrondes, nieuwste eerst, met cijfer. Nog niet afgemaakte rondes kun je hier hervatten. */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Alert, StyleSheet, View } from 'react-native'

import { deleteTest, fetchTests } from '@/api'
import type { TestListItem } from '@/api'
import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Card, Loading, Notice, Screen, Title } from '@/components/ui'
import { DisplayFont, Spacing } from '@/constants/theme'
import { usePullRefresh } from '@/hooks/use-pull-refresh'
import { useTheme } from '@/hooks/use-theme'
import { formatDate, gradeText } from '@/lib/format'

export default function TestsScreen() {
  const queryClient = useQueryClient()
  const tests = useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      const r = await fetchTests()
      if (!r.ok) throw new Error(r.error.message)
      return r.data.tests
    },
  })
  const list = tests.data ?? []

  const remove = (t: TestListItem) =>
    Alert.alert('Toets verwijderen?', t.title, [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: async () => {
          await deleteTest(t.id)
          queryClient.invalidateQueries({ queryKey: ['tests'] })
        },
      },
    ])

  const refresh = usePullRefresh(tests.refetch)
  return (
    <Screen refreshControl={refresh}>
      <Title sub="Je proeftoetsen en oefenrondes. Houd ingedrukt om te verwijderen.">Toetsen</Title>
      {tests.isLoading ? <Loading /> : null}
      {tests.isError ? <Notice kind="error">{(tests.error as Error).message}</Notice> : null}
      {!tests.isLoading && !list.length ? (
        <Notice>Nog geen toetsen. Open een les en kies Oefenen of Proeftoets.</Notice>
      ) : null}
      {list.map((t) => (
        <TestRow key={t.id} test={t} onDelete={() => remove(t)} />
      ))}
    </Screen>
  )
}

function TestRow({ test: t, onDelete }: { test: TestListItem; onDelete: () => void }) {
  const theme = useTheme()
  const done = !!t.finishedAt
  const g = t.grade ?? 0
  const color = !done ? theme.textSecondary : g >= 7 ? theme.success : g >= 5.5 ? theme.warning : theme.destructive
  const mode = t.mode === 'proeftoets' ? 'Proeftoets' : t.mode === 'herhaling' ? 'Herhaling' : 'Oefenen'
  return (
    <Card onPress={() => router.push(`/toets/${t.id}`)} onLongPress={onDelete} style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontWeight: 700 }}>{t.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {mode} · {formatDate(t.createdAt)} · {done ? `${t.questionCount} vragen` : `${t.answered} van ${t.questionCount} gedaan`}
        </ThemedText>
      </View>
      {done ? (
        <ThemedText style={[styles.grade, { color }]}>{gradeText(t.grade)}</ThemedText>
      ) : (
        <Icon name="play.circle.fill" size={28} tintColor={theme.primary} />
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  grade: { fontSize: 26, fontFamily: DisplayFont.extraBold },
})
