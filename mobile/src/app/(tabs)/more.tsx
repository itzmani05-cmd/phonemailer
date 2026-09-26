import { formatPhone } from '@shared/mail'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { MenuList } from '@/components/Drawer'
import { Text } from '@/components/Text'
import { useMail } from '@/data/MailProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

export default function MoreScreen() {
  const { colors } = useTheme()
  const { account } = useMail()

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>More</Text>

        {account && (
          <View style={[styles.profile, { backgroundColor: colors.surfaceSelected }]}>
            <Avatar name={account.name} size={56} tone="primary" />
            <View style={styles.profileText}>
              <Text style={[styles.name, { color: colors.text }]}>{account.name}</Text>
              {!!account.phone && (
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {formatPhone(account.phone, account.countryCode)}
                </Text>
              )}
              <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                {account.address}
              </Text>
            </View>
          </View>
        )}

        <MenuList showInbox={false} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5, padding: spacing.sm, paddingTop: spacing.md },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md + 4,
    marginVertical: spacing.md,
  },
  profileText: { flex: 1, minWidth: 0 },
  name: { fontSize: font.title + 1, fontWeight: '600' },
  meta: { fontSize: font.small, marginTop: 1 },
})
