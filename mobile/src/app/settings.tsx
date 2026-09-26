import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/Text'
import { Icon, type IconName } from '@/components/Icon'
import { API_URL } from '@/data/config'
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

const THEME_OPTIONS: { id: ThemePreference; label: string; icon: IconName }[] = [
  { id: 'system', label: 'Use device setting', icon: 'monitor' },
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
]

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme()

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPEARANCE</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {THEME_OPTIONS.map((option, i) => {
          const selected = preference === option.id
          return (
            <Pressable
              key={option.id}
              onPress={() => setPreference(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={({ pressed }) => [
                styles.option,
                i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                pressed && { backgroundColor: colors.surfaceHover },
              ]}
            >
              <Icon name={option.icon} size={19} color={colors.textMuted} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
              {selected && <Icon name="check" size={19} color={colors.primary} />}
            </Pressable>
          )
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SERVER</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.option}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>Backend</Text>
          <Text style={[styles.value, { color: colors.textMuted }]} selectable>
            {API_URL}
          </Text>
        </View>
      </View>
      <Text style={[styles.hint, { color: colors.textSubtle }]}>
        Set EXPO_PUBLIC_API_URL to point the app at a different server.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  sectionTitle: {
    fontSize: font.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
  },
  optionLabel: { flex: 1, fontSize: font.body },
  value: { fontSize: font.small },
  hint: { fontSize: font.caption, marginLeft: spacing.xs },
})
