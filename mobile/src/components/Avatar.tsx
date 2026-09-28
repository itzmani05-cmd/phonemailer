import { avatarColor, initials } from '@shared/mail'
import { Image, StyleSheet, View } from 'react-native'
import { api } from '@/data/api'
import { useMail } from '@/data/MailProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { Text } from './Text'

interface Props {
  name: string
  size?: number
  tone?: 'auto' | 'primary'
  uri?: string | null
}

export function Avatar({ name, size = 48, tone = 'auto', uri }: Props) {
  const { colors } = useTheme()
  const { background, color } =
    tone === 'primary'
      ? { background: colors.primary, color: colors.onPrimary }
      : avatarColor(name)
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatar, { width: size, height: size, backgroundColor: background }]}
        accessibilityIgnoresInvertColors
      />
    )
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, backgroundColor: background }]}>
      <Text style={[styles.text, { color, fontSize: size * 0.42 }]}>
        {initials(name).slice(0, 1)}
      </Text>
    </View>
  )
}

export function AccountAvatar({ size = 40 }: { size?: number }) {
  const { account } = useMail()
  const uri = account?.avatarVersion ? api.avatarUrl(account.avatarVersion) : null
  return <Avatar name={account?.name ?? '?'} size={size} tone="primary" uri={uri} />
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '600' },
})
