import { ScrollView, StyleSheet, View } from 'react-native'
import { Icon, type IconName } from '@/components/Icon'
import { Text } from '@/components/Text'
import { useMail } from '@/data/MailProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

export default function HelpScreen() {
  const { colors } = useTheme()
  const { account } = useMail()
  const address = account?.address ?? 'your PhoneMail address'

  const topics: { icon: IconName; title: string; body: string }[] = [
    {
      icon: 'phone',
      title: 'Your address',
      body: `People can email you at ${address} from any email provider.`,
    },
    {
      icon: 'chatLines',
      title: 'Chats',
      body: 'Every person you email with gets a conversation. Tap a message to see the full email, or reply from the box at the bottom.',
    },
    {
      icon: 'paperclip',
      title: 'Attachments',
      body: 'Attach photos, files or a scanned page (up to 18 MB in total). Received files are collected in the Attachments tab.',
    },
    {
      icon: 'trash',
      title: 'Deleting',
      body: 'Deleted emails go to Trash. Delete them from Trash to remove them for good.',
    },
  ]

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      {topics.map((t) => (
        <View key={t.title} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name={t.icon} size={22} color={colors.primary} />
          <View style={styles.text}>
            <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>{t.body}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
  title: { fontSize: font.body + 1, fontWeight: '600' },
  body: { fontSize: font.small + 1, lineHeight: 20, marginTop: 4 },
})
