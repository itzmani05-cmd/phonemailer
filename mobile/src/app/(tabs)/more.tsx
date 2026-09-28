import { formatPhone } from '@shared/mail'
import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AccountAvatar } from '@/components/Avatar'
import { MenuList } from '@/components/Drawer'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { useMail } from '@/data/MailProvider'
import { useT } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

export default function MoreScreen() {
  const { colors } = useTheme()
  const { account } = useMail()
  const t = useT()

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{t('tabs.more')}</Text>

        {account && (
          <Pressable
            onPress={() => router.push('/identity')}
            accessibilityRole="button"
            accessibilityLabel="Show my PhoneMail ID"
            style={({ pressed }) => [
              styles.profile,
              { backgroundColor: colors.surfaceSelected },
              pressed && { opacity: 0.85 },
            ]}
          >
            <AccountAvatar size={56} />
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
            <Icon name="qrCode" size={26} color={colors.primary} />
          </Pressable>
        )}

        <MenuList showHome={false} />
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
