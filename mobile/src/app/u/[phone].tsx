import { router, useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CardAction, IdentityCard } from '@/components/IdentityCard'
import { Text } from '@/components/Text'
import { identityAddress, parseIdentity, shareIdentity } from '@/data/identity'
import { useMail } from '@/data/MailProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, spacing } from '@/theme/metrics'

export default function ProfileScreen() {
  const { colors } = useTheme()
  const { account } = useMail()
  const params = useLocalSearchParams<{ phone: string; name?: string }>()
  const found = parseIdentity(params.phone ?? '')
  const identity = found && { phone: found.phone, name: params.name?.trim() || undefined }

  if (!identity) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.screen, { backgroundColor: colors.surfaceHover }]}>
        <Text style={[styles.note, { color: colors.textMuted }]}>This is not a valid PhoneMail ID.</Text>
      </SafeAreaView>
    )
  }

  const address = identityAddress(identity.phone)
  const isMe = identity.phone === account?.phone

  return (
    <SafeAreaView edges={['bottom']} style={[styles.screen, { backgroundColor: colors.surfaceHover }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <IdentityCard phone={identity.phone} name={identity.name}>
          <CardAction
            icon="send"
            label="Send Email"
            primary
            onPress={() => router.push({ pathname: '/compose', params: { to: address } })}
          />
          <CardAction
            icon="chat"
            label="Chat"
            onPress={() => router.push({ pathname: '/conversation/[address]', params: { address } })}
          />
          <CardAction icon="share" label="Share" onPress={() => void shareIdentity(identity)} />
        </IdentityCard>
        {isMe && (
          <Text style={[styles.note, { color: colors.textMuted }]}>This is your own PhoneMail ID.</Text>
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
