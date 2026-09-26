import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { font, spacing } from '@/theme/metrics'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={44} color={colors.textSubtle} strokeWidth={1.5} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {!!body && <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>}
    </View>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.banner, { backgroundColor: colors.dangerSoft }]}>
      <Icon name="wifiOff" size={16} color={colors.danger} />
      <Text style={[styles.bannerText, { color: colors.danger }]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingHorizontal: spacing.xl * 2, paddingVertical: 64, gap: spacing.sm },
  title: { fontSize: font.title, fontWeight: '600', marginTop: spacing.sm, textAlign: 'center' },
  body: { fontSize: font.small + 1, textAlign: 'center', lineHeight: 20 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
  },
  bannerText: { flex: 1, fontSize: font.small },
})
