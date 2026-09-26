import { formatShortDate, previewText, type Conversation } from '@shared/mail'
import { memo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { font, spacing } from '@/theme/metrics'
import { Avatar } from './Avatar'
import { Text } from './Text'

interface Props {
  conversation: Conversation
  onPress: (c: Conversation) => void
}

export const ConversationRow = memo(function ConversationRow({ conversation, onPress }: Props) {
  const { colors } = useTheme()
  const { person, latest, unread } = conversation
  const preview = previewText(latest, 90)

  return (
    <Pressable
      onPress={() => onPress(conversation)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceHover }]}
      accessibilityRole="button"
      accessibilityLabel={`${person.name}. ${unread ? `${unread} unread. ` : ''}${latest.subject}`}
    >
      <Avatar name={person.name} size={52} />
      <View style={[styles.body, { borderBottomColor: colors.border }]}>
        <View style={styles.line}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {person.name}
          </Text>
          <Text style={[styles.time, { color: unread ? colors.text : colors.textMuted }]}>
            {formatShortDate(latest.receivedAt)}
          </Text>
        </View>
        <View style={styles.line}>
          <Text
            style={[styles.subject, { color: colors.text }, unread > 0 && styles.subjectUnread]}
            numberOfLines={1}
          >
            {latest.subject || '(no subject)'}
          </Text>
          {unread > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.onPrimary }]}>{unread}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={1}>
          {latest.direction === 'out' ? `You: ${preview}` : preview}
        </Text>
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    paddingLeft: spacing.lg,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.md + 2,
    paddingRight: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontSize: font.body + 1, fontWeight: '600' },
  time: { fontSize: font.caption + 1 },
  subject: { flex: 1, fontSize: font.body - 1, marginTop: 2 },
  subjectUnread: { fontWeight: '600' },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  preview: { fontSize: font.small + 0.5, marginTop: 2 },
})
