import { router, Stack } from 'expo-router'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HeaderButton } from '@/components/HeaderButton'
import { CardAction, IdentityCard } from '@/components/IdentityCard'
import { Text } from '@/components/Text'
import { shareIdentity } from '@/data/identity'
import { useMail } from '@/data/MailProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, spacing } from '@/theme/metrics'

export default function MyIdentityScreen() {
  const { colors } = useTheme()
  const { account } = useMail()
  const identity = account?.phone ? { phone: account.phone, name: account.name } : null

  return (
    <SafeAreaView edges={['bottom']} style={[styles.screen, { backgroundColor: colors.surfaceHover }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderButton icon="scan" label="Scan a PhoneMail code" onPress={() => router.push('/scan')} />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {identity ? (
          <>
            <IdentityCard phone={identity.phone} name={identity.name} countryCode={account?.countryCode || '91'}>
              <CardAction icon="share" label="Share" primary onPress={() => void shareIdentity(identity)} />
              <CardAction icon="scan" label="Scan" onPress={() => router.push('/scan')} />
            </IdentityCard>
            <Text style={[styles.note, { color: colors.textMuted }]}>
              Your phone number is your identity. Anyone who scans this code can email you straight away.
            </Text>
          </>
        ) : (
          <Text style={[styles.note, { color: colors.textMuted }]}>Loading your PhoneMail ID…</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  note: { fontSize: font.small, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.lg },
})
