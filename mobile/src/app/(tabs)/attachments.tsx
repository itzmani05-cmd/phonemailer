import {
  counterpart,
  fileKind,
  formatBytes,
  formatShortDate,
  type Mail,
  type MailAttachment,
} from '@shared/mail'
import type { FileKind } from '@shared/theme'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Chips } from '@/components/Chips'
import { EmptyState } from '@/components/EmptyState'
import { FileBadge } from '@/components/FileBadge'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { openAttachment } from '@/data/attachments'
import { useMail } from '@/data/MailProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

type Filter = 'all' | 'pdf' | 'image' | 'doc'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'image', label: 'Images' },
  { id: 'doc', label: 'Documents' },
]

const DOC_KINDS: FileKind[] = ['doc', 'sheet', 'slides', 'archive', 'other']

interface Item {
  mail: Mail
  index: number
  attachment: MailAttachment
}

export default function AttachmentsScreen() {
  const { colors } = useTheme()
  const { mails } = useMail()
  const [filter, setFilter] = useState<Filter>('all')

  const items = useMemo(() => {
    const out: Item[] = []
    for (const mail of mails) {
      if (mail.folder === 'trash' || mail.folder === 'spam') continue
      mail.attachments.forEach((attachment, index) => out.push({ mail, index, attachment }))
    }
    return out.filter(({ attachment: a }) => {
      const kind = fileKind(a.filename, a.contentType)
      if (filter === 'all') return true
      if (filter === 'doc') return DOC_KINDS.includes(kind)
      return kind === filter
    })
  }, [mails, filter])

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>Attachments</Text>
      <View style={styles.chips}>
        <Chips options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => `${i.mail.id}:${i.index}`}
        contentContainerStyle={styles.list}
        renderItem={({ item: { mail, index, attachment } }) => {
          const person = counterpart(mail)
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/mail/[id]', params: { id: mail.id } })}
              style={({ pressed }) => [
                styles.card,
                { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceHover : colors.surface },
              ]}
              accessibilityRole="button"
            >
              <FileBadge filename={attachment.filename} contentType={attachment.contentType} size={44} />
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {attachment.filename ?? 'Untitled'}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                  {formatBytes(attachment.size)} · {mail.direction === 'out' ? 'To' : 'From'} {person.name} ·{' '}
                  {formatShortDate(mail.receivedAt)}
                </Text>
              </View>
              <Pressable
                onPress={() => openAttachment(mail.id, index)}
                hitSlop={10}
                accessibilityLabel={`Download ${attachment.filename ?? 'attachment'}`}
              >
                <Icon name="download" size={22} color={colors.primary} />
              </Pressable>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            icon="paperclip"
            title="No attachments"
            body="Files you send or receive will be collected here."
          />
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    paddingHorizontal: spacing.lg + 2,
    paddingTop: spacing.md,
  },
  chips: { paddingVertical: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: font.body, fontWeight: '600' },
  meta: { fontSize: font.small, marginTop: 2 },
})
