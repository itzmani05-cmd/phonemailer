import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'
import { Icon } from './Icon'
import { TextInput } from './Text'

interface Props {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
}

export function SearchBar({ value, onChangeText, placeholder }: Props) {
  const { colors, scheme } = useTheme()

  return (
    <View style={[styles.bar, { backgroundColor: colors.surfaceSunken }]}>
      <Icon name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        keyboardAppearance={scheme}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={[styles.input, { color: colors.text }]}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
          <Icon name="close" size={16} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 42,
    borderRadius: radius.md,
  },
  input: { flex: 1, fontSize: font.body, paddingVertical: 0 },
})
