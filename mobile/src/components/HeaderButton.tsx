import { Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { Icon, type IconName } from './Icon'

interface Props {
  icon: IconName
  label: string
  onPress: () => void
  color?: string
  filled?: boolean
}

export function HeaderButton({ icon, label, onPress, color, filled }: Props) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, pressed && { backgroundColor: colors.surfaceHover }]}
    >
      <Icon name={icon} size={21} color={color ?? colors.textMuted} filled={filled} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
