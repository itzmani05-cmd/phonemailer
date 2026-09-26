import { avatarColor, initials } from '@shared/mail'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { Text } from './Text'

interface Props {
  name: string
  size?: number
  /** 'primary' = brand-colored (account, email details); default hashes the name. */
  tone?: 'auto' | 'primary'
}

export function Avatar({ name, size = 48, tone = 'auto' }: Props) {
  const { colors } = useTheme()
  const { background, color } =
    tone === 'primary'
      ? { background: colors.primary, color: colors.onPrimary }
      : avatarColor(name)
  return (
    <View style={[styles.avatar, { width: size, height: size, backgroundColor: background }]}>
      <Text style={[styles.text, { color, fontSize: size * 0.42 }]}>
        {initials(name).slice(0, 1)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '600' },
})
