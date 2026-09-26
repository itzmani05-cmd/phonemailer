import { Pressable, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'
import { Text } from './Text'

interface Props<T extends string> {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

/** "All · Unread · Personal · Work" filter pills from the inbox design. */
export function Chips<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors } = useTheme()
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((o) => {
        const active = o.id === value
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surfaceSunken }]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.onPrimary : colors.textMuted },
                active && styles.activeLabel,
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: { height: 32, paddingHorizontal: spacing.lg, borderRadius: radius.full, justifyContent: 'center' },
  label: { fontSize: font.small + 1 },
  activeLabel: { fontWeight: '600' },
})
