/**
 * Renders the right UI for the current version-check status.
 *
 * - 'force-update' → full-screen ForceUpdateScreen, blocks all
 *   interaction. Z-index higher than the modal stack. Geen "later"-
 *   knop; users moeten updaten of de app stoppen.
 *
 * - 'soft-update' → SoftUpdateBanner aan de bovenkant, dismissible
 *   per session via state. Komt na een re-launch terug zolang de
 *   versie nog onder `recommended` zit.
 *
 * - 'ok' / 'unknown' → renders nothing.
 *
 * Mount in root layout NEXT to the Stack (sibling, not parent) zodat
 * routing nog werkt voor soft-update terwijl de banner zichtbaar is.
 * Voor force-update is dat irrelevant want ForceUpdateScreen vult
 * sowieso het hele scherm.
 */

import { Icon } from '@/components/icon'
import { useState } from 'react'
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Radius, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import { useVersionCheck } from '@/hooks/use-version-check'
import { APP_STORE_URL } from '@/lib/version'

export function VersionGate() {
  const { status, data, currentVersion } = useVersionCheck()
  const [softDismissed, setSoftDismissed] = useState(false)

  if (status === 'force-update') {
    return <ForceUpdateScreen message={data?.message ?? null} currentVersion={currentVersion} />
  }

  if (status === 'soft-update' && !softDismissed) {
    return (
      <SoftUpdateBanner
        message={data?.message ?? null}
        onDismiss={() => setSoftDismissed(true)}
      />
    )
  }

  return null
}

// ─── Force-update (full screen blocker) ─────────────────────────────

function ForceUpdateScreen({
  message,
  currentVersion,
}: {
  message: string | null
  currentVersion: string
}) {
  const theme = useTheme()

  return (
    <ThemedView style={styles.fsRoot}>
      <SafeAreaView style={styles.fsRoot}>
        <View style={styles.fsContent}>
          <View
            style={[
              styles.fsIconWrap,
              { backgroundColor: theme.primary + '20' },
            ]}>
            <Icon name="arrow.down.circle" size={56} tintColor={theme.primary} />
          </View>

          <ThemedText style={styles.fsTitle}>Update vereist</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.fsBody}>
            {message ??
              'Deze versie van Studiemaat werkt niet meer. Werk de app bij om verder te gaan.'}
          </ThemedText>

          <Pressable
            onPress={() => {
              Linking.openURL(APP_STORE_URL).catch(() => {})
            }}
            style={({ pressed }) => [
              styles.fsButton,
              { backgroundColor: theme.primary },
              pressed && { opacity: 0.85 },
            ]}>
            <ThemedText style={[styles.fsButtonText, { color: theme.primaryForeground }]}>
              {Platform.OS === 'android' ? 'Open Google Play' : 'Open de App Store'}
            </ThemedText>
          </Pressable>

          <ThemedText themeColor="textSecondary" type="small" style={styles.fsVersion}>
            Huidige versie: {currentVersion}
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  )
}

// ─── Soft-update banner (dismissible) ───────────────────────────────

function SoftUpdateBanner({
  message,
  onDismiss,
}: {
  message: string | null
  onDismiss: () => void
}) {
  const theme = useTheme()

  return (
    <SafeAreaView edges={['top']} style={styles.bannerWrap} pointerEvents="box-none">
      <View
        style={[
          styles.banner,
          { backgroundColor: theme.primary, borderColor: theme.primary },
        ]}>
        <Icon name="arrow.down.circle" size={18} tintColor={theme.primaryForeground} />
        <ThemedText
          type="small"
          style={[styles.bannerText, { color: theme.primaryForeground }]}>
          {message ?? 'Er is een nieuwe versie van Studiemaat'}
        </ThemedText>
        <Pressable
          onPress={() => {
            Linking.openURL(APP_STORE_URL).catch(() => {})
          }}
          hitSlop={8}
          style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
          <ThemedText
            type="smallBold"
            style={{ color: theme.primaryForeground, textDecorationLine: 'underline' }}>
            Update
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
          <Icon name="xmark" size={14} tintColor={theme.primaryForeground} />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // ─── Force-update ─────────────────────────────
  fsRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  fsContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  fsIconWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  fsTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  fsBody: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 23,
    paddingHorizontal: Spacing.three,
    maxWidth: 400,
  },
  fsButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
    minWidth: 220,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  fsButtonText: { fontSize: 16, fontWeight: '700' },
  fsVersion: {
    marginTop: Spacing.three,
  },

  // ─── Soft-update banner ───────────────────────
  bannerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginHorizontal: Spacing.two,
    marginTop: Spacing.one,
    borderRadius: Radius.sm,
  },
  bannerText: {
    flex: 1,
  },
})
