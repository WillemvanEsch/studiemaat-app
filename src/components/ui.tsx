/**
 * Bouwstenen voor de schermen van Studiemaat: scherm, kaart, knop, invoerveld, melding.
 * Kleuren altijd via useTheme(), zodat donkere modus overal klopt.
 */

import { Children, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { DisplayFont, MaxContentWidth, Radius, Spacing } from '@/constants/theme'
import { useLayout } from '@/hooks/use-layout'
import { useTheme } from '@/hooks/use-theme'

/** Scherm met veilige randen en (standaard) scrollen. */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  ...rest
}: { children: ReactNode; scroll?: boolean; edges?: ('top' | 'bottom')[] } & ScrollViewProps) {
  const theme = useTheme()
  const { isTablet } = useLayout()
  // Tablet: meer lucht rondom en tussen de blokken, zoals de website op een computer.
  const content = isTablet ? [styles.content, styles.contentTablet] : styles.content
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: theme.background }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          {...rest}>
          {children}
        </ScrollView>
      ) : (
        <View style={[content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  )
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <View style={{ gap: Spacing.one, marginBottom: Spacing.two }}>
      <ThemedText style={styles.title}>{children}</ThemedText>
      {sub ? <ThemedText themeColor="textSecondary">{sub}</ThemedText> : null}
    </View>
  )
}

/** Tussenkop in het lettertype van de website, bv. "Mijn lessen". */
export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <ThemedText style={[styles.heading, style]}>{children}</ThemedText>
}

export function Card({
  children,
  style,
  onPress,
  onLongPress,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  onLongPress?: () => void
}) {
  const theme = useTheme()
  const base = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, style]
  if (!onPress) return <View style={base}>{children}</View>
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [base, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  )
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  title,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
  ...rest
}: { title: string; kind?: ButtonKind; icon?: string; loading?: boolean; style?: StyleProp<ViewStyle> } & Omit<PressableProps, 'style' | 'children'>) {
  const theme = useTheme()
  const bg =
    kind === 'primary' ? theme.primary : kind === 'danger' ? theme.destructive : kind === 'secondary' ? theme.accent : 'transparent'
  const fg =
    kind === 'primary'
      ? theme.primaryForeground
      : kind === 'danger'
        ? theme.destructiveForeground
        : kind === 'secondary'
          ? theme.accentForeground
          : theme.link
  const off = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.8 : 1 }, style]}
      {...rest}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={18} tintColor={fg} /> : null}
      <ThemedText style={[styles.buttonText, { color: fg }]}>{title}</ThemedText>
    </Pressable>
  )
}

export function Field({ label, style, ...rest }: { label?: string } & TextInputProps) {
  const theme = useTheme()
  return (
    <View style={{ gap: Spacing.one }}>
      {label ? <ThemedText type="smallBold">{label}</ThemedText> : null}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderColor: theme.input, backgroundColor: theme.backgroundElement }, style]}
        {...rest}
      />
    </View>
  )
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'ok' | 'warn' | 'error'; children: ReactNode }) {
  const theme = useTheme()
  const bg = kind === 'ok' ? theme.successSoft : kind === 'warn' ? theme.warningSoft : kind === 'error' ? theme.destructiveSoft : theme.accent
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      {/* Alleen tekst (ook tekst met {waarden} erin, dan is children een lijst) altijd in ThemedText, anders is hij onzichtbaar. */}
      {typeof children === 'string' ||
      typeof children === 'number' ||
      (Array.isArray(children) && children.every((c) => typeof c === 'string' || typeof c === 'number')) ? (
        <ThemedText type="small">{children}</ThemedText>
      ) : (
        children
      )}
    </View>
  )
}

/**
 * Blokken onder elkaar op een telefoon, in twee kolommen op een tablet (lessen, begrippen, foto's).
 * Elk kind krijgt de helft van de breedte; kaarten in dezelfde rij worden even hoog.
 */
export function Grid({ children }: { children: ReactNode }) {
  const { columns } = useLayout()
  if (columns === 1) return <View style={{ gap: Spacing.three }}>{children}</View>
  return (
    <View style={styles.grid}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={styles.gridItem}>
          {child}
        </View>
      ))}
    </View>
  )
}

export function Loading() {
  const theme = useTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.primary} />
    </View>
  )
}

/** Keuzerondje-knoppen naast elkaar (bv. niveau, moeilijkheid). */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T | null
  onChange: (id: T) => void
}) {
  const theme = useTheme()
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.id === value
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.id)}
            style={[styles.chip, { borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.accent : theme.backgroundElement }]}>
            <ThemedText type="small" style={{ color: on ? theme.accentForeground : theme.text }}>
              {o.label}
            </ThemedText>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six + Spacing.five,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  contentTablet: { paddingHorizontal: Spacing.five, paddingTop: Spacing.four, gap: Spacing.four },
  // Koppen in het lettertype van de website. Geen fontWeight: de dikte zit in het lettertype zelf.
  title: { fontSize: 30, lineHeight: 36, fontFamily: DisplayFont.extraBold, letterSpacing: -0.5 },
  heading: { fontSize: 22, lineHeight: 28, fontFamily: DisplayFont.extraBold, letterSpacing: -0.3 },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.two },
  button: {
    minHeight: 50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  buttonText: { fontSize: 16, fontWeight: 700 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.three, fontSize: 17 },
  notice: { borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  // 48,5% + ruimte ertussen: twee kolommen zonder dat percentages en `gap` elkaar in de weg zitten.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.three },
  gridItem: { width: '48.5%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: 1.5, borderRadius: Radius.full, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
})
