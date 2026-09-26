import {
  counterpart,
  formatShortDate,
  inView,
  previewText,
  viewTitle,
  type Mail,
  type MailView,
} from '@shared/mail'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { Icon, type IconName } from '@/components/Icon'
import { Text } from '@/components/Text'
import { useMail } from '@/data/MailProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, spacing } from '@/theme/metrics'

const EMPTY: Record<string, { icon: IconName; text: string }> = {
  starred: { icon: 'star', text: 'Star emails to find them here quickly.' },
  sent: { icon: 'send', text: 'Emails you send appear here.' },
  drafts: { icon: 'file', text: 'You don’t have any drafts.' },
  spam: { icon: 'shield', text: 'No spam here.' },
  trash: { icon: 'trash', text: 'Trash is empty.' },
  snoozed: { icon: 'clock', text: 'Nothing snoozed.' },
}

function MailRow({ mail, onPress }: { mail: Mail; onPress: () => void }) {
  const { colors } = useTheme()
  const person = counterpart(mail)
  const unread = !mail.read
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceHover }]}
      accessibilityRole="button"
    >
      <Avatar name={person.name} size={48} />
      <View style={[styles.rowBody, { borderBottomColor: colors.border }]}>
        <View style={styles.line}>
          <Text
            style={[styles.from, { color: colors.text }, unread && styles.bold]}
            numberOfLines={1}
          >
            {mail.direction === 'out' ? `To: ${person.name}` : person.name}
          </Text>
          {mail.attachments.length > 0 && <Icon name="paperclip" size={14} color={colors.textMuted} />}
          <Text style={[styles.date, { color: unread ? colors.primary : colors.textMuted }]}>
            {formatShortDate(mail.receivedAt)}
          </Text>
        </View>
        <View style={styles.line}>
          <Text style={[styles.subject, { color: colors.text }, unread && styles.semibold]} numberOfLines={1}>
            {mail.subject || '(no subject)'}
          </Text>
          {mail.starred && <Icon name="star" size={14} color={colors.star} filled />}
        </View>
        <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={1}>
          {previewText(mail, 100)}
        </Text>
      </View>
    </Pressable>
  )
}

export default function FolderScreen() {
  const { view } = useLocalSearchParams<{ view: MailView }>()
  const { colors } = useTheme()
  const { mails, refreshing, refresh, removeMany } = useMail()

  const list = useMemo(() => mails.filter((m) => inView(m, view)), [mails, view])
  const empty = EMPTY[view] ?? { icon: 'label' as IconName, text: 'No emails with this label.' }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
          <Icon name="arrowLeft" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {viewTitle(view)}
        </Text>
        {view === 'trash' && list.length > 0 && (
          <Pressable
            hitSlop={8}
            onPress={() =>
              Alert.alert('Empty Trash?', `${list.length} email(s) will be deleted forever.`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Empty Trash',
                  style: 'destructive',
                  onPress: () => void removeMany(list.map((m) => m.id)),
                },
              ])
            }
          >
            <Text style={[styles.action, { color: colors.danger }]}>Empty</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={list}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MailRow
            mail={item}
            onPress={() => router.push({ pathname: '/mail/[id]', params: { id: item.id } })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListEmptyComponent={<EmptyState icon={empty.icon} title={`No ${viewTitle(view).toLowerCase()} emails`} body={empty.text} />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg + 2,
    height: 56,
  },
  title: { flex: 1, fontSize: 22, fontWeight: '700' },
  action: { fontSize: font.body, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md + 2, paddingLeft: spacing.lg },
  rowBody: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  from: { flex: 1, fontSize: font.body + 1 },
  date: { fontSize: font.caption + 1 },
  subject: { flex: 1, fontSize: font.body - 1, marginTop: 2 },
  preview: { fontSize: font.small + 0.5, marginTop: 2 },
  bold: { fontWeight: '700' },
  semibold: { fontWeight: '600' },
})
