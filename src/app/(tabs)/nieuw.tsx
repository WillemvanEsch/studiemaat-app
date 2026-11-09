/**
 * Nieuwe les: foto's maken of kiezen, vak kiezen, en Studiemaat maakt er een uittreksel en vragen van.
 * De eerste keer vragen we toestemming om foto's door een AI te laten verwerken (verplicht van Apple).
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native'

import { createLesson, fetchOptions } from '@/api'
import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Button, Card, Chips, Field, Loading, Notice, Screen, Title } from '@/components/ui'
import { DisplayFont, Radius, Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/hooks/use-theme'
import { MAX_PAGES, pickPhotos, takePhoto, uploadAll, type Photo } from '@/lib/photos'
import { DEFAULT_SPLIT_TIP_FROM, etaText, lessonEtaSeconds } from '@/lib/eta'
import { buyLesson, loadLessonOffers, onPurchaseEvent, type LessonOffer } from '@/lib/purchases'
import { hasAiConsent, saveAiConsent } from '@/lib/storage'

const STORE_TEXT = Platform.OS === 'ios' ? 'je Apple ID' : 'je Google-account'

/** Zelfde vakken als op de website (studypro/src/lib/format.ts SUBJECTS). */
const SUBJECTS = [
  'Aardrijkskunde',
  'Biologie',
  'Duits',
  'Economie',
  'Engels',
  'Frans',
  'Geschiedenis',
  'Latijn',
  'Maatschappijleer',
  'Natuurkunde',
  'Nederlands',
  'Scheikunde',
  'Wiskunde',
  'Anders',
] as const

export default function NewLessonScreen() {
  const theme = useTheme()
  const { me, refreshMe } = useAuth()
  const queryClient = useQueryClient()
  const [consent, setConsent] = useState<boolean | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [subject, setSubject] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Zelfde keuzelijsten als Instellingen; hier voor de verwachte duur en de tip bij veel foto's.
  const options = useQuery({
    queryKey: ['options'],
    queryFn: async () => {
      const r = await fetchOptions()
      if (!r.ok) throw new Error(r.error.message)
      return r.data
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    hasAiConsent().then(setConsent)
  }, [])

  // Geen abonnement, geen gratis periode en geen tegoed: dan meteen hier een losse les kunnen kopen (sinds 8 nov 2026,
  // Wim: anders maak je foto's en zie je pas onderaan een grijze knop). Prijzen komen van de winkel zelf.
  const noAccess = !!me && !me.access.hasAccess && (me.access.lessonCredits ?? 0) <= 0
  const lessonOffers = useQuery({
    queryKey: ['lesson-offers'],
    queryFn: async () => {
      const r = await loadLessonOffers()
      if ('error' in r) throw new Error(r.error)
      return r
    },
    enabled: noAccess && me?.access.kind === 'verlopen',
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
  const [buying, setBuying] = useState(false)
  const [buyMessage, setBuyMessage] = useState<{ kind: 'ok' | 'info' | 'error'; text: string } | null>(null)
  useEffect(
    () =>
      onPurchaseEvent((e) => {
        if (e.kind === 'busy') return setBuying(true)
        setBuying(false)
        if (e.kind === 'done' && e.lessons) {
          setBuyMessage({ kind: 'ok', text: `Gelukt! Je hebt ${e.lessons === 1 ? 'een les' : `${e.lessons} lessen`} erbij. Maak hieronder je les.` })
          refreshMe().catch(() => {})
        }
        if (e.kind === 'pending') setBuyMessage({ kind: 'info', text: e.message })
        if (e.kind === 'error') setBuyMessage({ kind: 'error', text: e.message })
      }),
    [refreshMe],
  )
  async function startLesson(offer: LessonOffer) {
    if (!lessonOffers.data) return
    setBuyMessage(null)
    setBuying(true)
    try {
      await buyLesson(offer, lessonOffers.data.info.accountId)
    } catch {
      setBuying(false)
      setBuyMessage({ kind: 'error', text: 'Kopen lukte niet. Probeer het nog eens.' })
    }
  }

  if (consent === false) {
    return (
      <Screen>
        <Title>Voordat je begint</Title>
        <Card>
          <ThemedText type="smallBold">Zo maakt Studiemaat je les</ThemedText>
          <ThemedText>
            Je foto&apos;s worden gedeeld met een AI-dienst die ze analyseert en er lesstof van maakt: een uittreksel, begrippen en
            oefenvragen. Ook je antwoorden op open vragen worden zo nagekeken.
          </ThemedText>
          <ThemedText>Fotografeer alleen lesstof, geen gezichten of persoonlijke gegevens.</ThemedText>
          <Button title="Meer over privacy" kind="ghost" onPress={() => router.push('/privacy')} />
          <Button
            title="Ik snap het, ga verder"
            onPress={async () => {
              await saveAiConsent()
              setConsent(true)
            }}
          />
        </Card>
      </Screen>
    )
  }

  // Zonder abonnement of gratis periode kan het nog met tegoed voor losse lessen (één les per nieuwe les).
  const credits = me?.access.lessonCredits ?? 0
  const expired = me && !me.access.hasAccess && credits <= 0
  const onCredit = me && !me.access.hasAccess && credits > 0
  const busy = progress !== null
  const room = MAX_PAGES - photos.length

  async function addFromCamera() {
    const p = await takePhoto()
    if (p === 'geen-toestemming') {
      Alert.alert('Geen toegang tot de camera', 'Geef Studiemaat toegang tot je camera in de instellingen van je telefoon.', [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Instellingen', onPress: () => Linking.openSettings() },
      ])
      return
    }
    if (p) setPhotos((ps) => [...ps, p].slice(0, MAX_PAGES))
  }

  async function addFromLibrary() {
    const picked = await pickPhotos(room)
    if (picked.length) setPhotos((ps) => [...ps, ...picked].slice(0, MAX_PAGES))
  }

  async function submit() {
    if (!subject) return setError('Kies eerst een vak.')
    setError(null)
    const up = await uploadAll(photos, (done, total) => setProgress(`Foto's uploaden: ${done} van ${total}`))
    if ('error' in up) {
      setProgress(null)
      return setError(up.error)
    }
    setProgress('Les aanmaken…')
    const r = await createLesson({ subject, title: title.trim(), instructions: instructions.trim(), pages: up.pages })
    setProgress(null)
    if (!r.ok) return setError(r.error.message)
    setPhotos([])
    setTitle('')
    setInstructions('')
    setSubject(null)
    queryClient.invalidateQueries({ queryKey: ['lessons'] })
    if (onCredit) refreshMe().catch(() => {})
    router.push(`/les/${r.data.id}`)
  }

  return (
    <Screen>
      <Title sub="Fotografeer de bladzijdes die je moet leren. Studiemaat maakt er binnen een paar minuten een les van.">Nieuwe les</Title>

      {expired ? (
        <Card style={{ borderColor: theme.primary, borderWidth: 2 }}>
          <ThemedText style={styles.h2}>Koop eerst een les</ThemedText>
          <ThemedText themeColor="textSecondary">
            Je proefperiode of abonnement is afgelopen. Je lessen kun je gewoon blijven bekijken. Voor een nieuwe les koop je een
            losse les, of je kiest een abonnement.
          </ThemedText>
          {lessonOffers.isLoading ? <Loading /> : null}
          {lessonOffers.data?.offers.map((o) => {
            const bundle = o.lessons > 1
            return (
              <Pressable
                key={o.product.id}
                accessibilityRole="button"
                disabled={buying}
                onPress={() => startLesson(o)}
                style={({ pressed }) => [
                  styles.offer,
                  { borderColor: bundle ? theme.primary : theme.border, backgroundColor: bundle ? theme.accent : theme.backgroundElement },
                  pressed && { opacity: 0.7 },
                ]}>
                <Icon name={bundle ? 'sparkles' : 'book.fill'} size={20} tintColor={theme.primary} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: 700 }}>{bundle ? `${o.lessons} losse lessen` : '1 losse les'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {bundle ? 'Voor je toetsweek' : 'Voor één toets'}
                  </ThemedText>
                </View>
                <ThemedText style={{ fontWeight: 800, fontSize: 17 }}>{o.product.displayPrice}</ThemedText>
              </Pressable>
            )
          })}
          {buyMessage ? <Notice kind={buyMessage.kind}>{buyMessage.text}</Notice> : null}
          <Button title="Of kies een abonnement" kind="secondary" disabled={buying} onPress={() => router.push('/(tabs)/ik/abonnement')} />
          {lessonOffers.data ? (
            <ThemedText type="small" themeColor="textSecondary">
              Een losse les is een eenmalige aankoop via {STORE_TEXT}, er wordt niets verlengd.
            </ThemedText>
          ) : null}
        </Card>
      ) : null}
      {buyMessage?.kind === 'ok' && !expired ? <Notice kind="ok">{buyMessage.text}</Notice> : null}
      {onCredit ? (
        <Notice kind="ok">
          Je hebt nog {credits === 1 ? '1 les' : `${credits} lessen`} tegoed. Deze les gaat van je tegoed af (maximaal 20 foto{"'"}s).
        </Notice>
      ) : null}

      <View style={styles.actions}>
        <Button title="Foto maken" icon="camera.fill" style={{ flex: 1 }} disabled={!room || busy} onPress={addFromCamera} />
        <Button title="Uit fotorol" icon="photo.on.rectangle" kind="secondary" style={{ flex: 1 }} disabled={!room || busy} onPress={addFromLibrary} />
      </View>

      {photos.length ? (
        <View style={styles.grid}>
          {photos.map((p, i) => (
            <View key={`${p.uri}-${i}`} style={[styles.thumb, { borderColor: theme.border }]}>
              <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <ThemedText style={[styles.badge, { backgroundColor: theme.primary, color: theme.primaryForeground }]}>{i + 1}</ThemedText>
              {!busy ? (
                <Pressable
                  accessibilityLabel={`Foto ${i + 1} weghalen`}
                  onPress={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                  style={[styles.remove, { backgroundColor: theme.backgroundElement }]}>
                  <Icon name="xmark" size={14} tintColor={theme.text} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Tip: leg het boek plat neer, zorg voor genoeg licht en zet de hele bladzijde in beeld. Maximaal {MAX_PAGES} foto&apos;s per les.
        </ThemedText>
      )}

      {photos.length ? (
        <ThemedText type="small" themeColor="textSecondary">
          Met {photos.length === 1 ? '1 foto' : `${photos.length} foto's`} duurt het maken {etaText(lessonEtaSeconds(options.data, photos.length))}.
        </ThemedText>
      ) : null}
      {/* Geen harde grens (die blijft 20), wel een duwtje: kleinere lessen zijn sneller klaar en overzichtelijker. */}
      {photos.length >= (options.data?.splitTipFrom ?? DEFAULT_SPLIT_TIP_FROM) ? (
        <Notice kind="warn">
          Veel bladzijden? Maak liever een les per hoofdstuk of paragraaf. Dan is je eerste les sneller klaar en kun je per deel oefenen.
        </Notice>
      ) : null}

      {photos.length ? (
        <>
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="smallBold">Vak</ThemedText>
            <Chips options={SUBJECTS.map((s) => ({ id: s, label: s }))} value={subject} onChange={setSubject} />
          </View>
          <Field label="Titel (mag leeg, dan bedenkt Studiemaat er een)" value={title} onChangeText={setTitle} placeholder="Bijv. H3 Klimaat" maxLength={120} />
          <Field
            label="Wat moet je kennen? (optioneel)"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Bijv. alleen paragraaf 3.2 en 3.3, toets is volgende week"
            multiline
            style={{ minHeight: 90, paddingTop: Spacing.two, textAlignVertical: 'top' }}
            maxLength={1000}
          />
          {error ? <Notice kind="error">{error}</Notice> : null}
          {progress ? <Notice>{progress}</Notice> : null}
          {expired ? (
            // Zonder abonnement of tegoed geen grijze knop zonder uitleg: zeg wat er nodig is.
            <>
              <Notice kind="warn">Je hebt nog geen les om te maken. Koop bovenaan een losse les of kies een abonnement; je foto&apos;s blijven staan.</Notice>
              <Button title="Les of abonnement kopen" icon="bag.fill" onPress={() => router.push('/(tabs)/ik/abonnement')} />
            </>
          ) : (
            <Button title="Maak mijn les" icon="sparkles" loading={busy} disabled={!subject} onPress={submit} />
          )}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  h2: { fontSize: 20, lineHeight: 26, fontFamily: DisplayFont.extraBold },
  offer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.three },
  actions: { flexDirection: 'row', gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumb: { width: 100, height: 134, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1 },
  badge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    minWidth: 22,
    textAlign: 'center',
    borderRadius: 11,
    overflow: 'hidden',
    fontSize: 12,
    lineHeight: 22,
    fontWeight: 700,
  },
  remove: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
})
