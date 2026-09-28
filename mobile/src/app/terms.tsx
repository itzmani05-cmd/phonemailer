import { ScrollView, StyleSheet } from 'react-native'
import { Text } from '@/components/Text'
import { useTheme } from '@/theme/ThemeProvider'
import { font, spacing } from '@/theme/metrics'

const SECTIONS = [
  {
    title: 'Your account',
    body: 'PhoneMail creates one email address per verified phone number (<number>@phonemail.com). You sign in by confirming a one-time code sent to that number by SMS.',
  },
  {
    title: 'Acceptable use',
    body: 'Don’t use PhoneMail to send spam, phishing, malware or anything unlawful. We may suspend accounts that do.',
  },
  {
    title: 'Your data',
    body: 'We store your phone number, your address and the messages you send and receive so the service works. Verification codes are never stored in readable form.',
  },
  {
    title: 'Changes',
    body: 'These terms may change as PhoneMail develops. Continuing to use the app means you accept the current version.',
  },
]

export default function TermsScreen() {
  const { colors } = useTheme()
  return (
    <ScrollView style={{ backgroundColor: colors.surface }} contentContainerStyle={styles.content}>
      {SECTIONS.map((s) => (
        <Text key={s.title} style={[styles.body, { color: colors.textMuted }]}>
          <Text style={[styles.heading, { color: colors.text }]}>{s.title}
            {'\n'}
          </Text>
          {s.body}
        </Text>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.xl },
  heading: { fontSize: font.title, fontWeight: '600' },
  body: { fontSize: font.body, lineHeight: 22 },
})
