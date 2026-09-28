import {
  conversations,
  formatBytes,
  formatDay,
  formatTime,
  previewText,
  stripQuoted,
  type Mail,
} from '@shared/mail'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AttachmentPicker } from '@/components/AttachmentPicker'
import { Avatar } from '@/components/Avatar'
import { BottomSheet } from '@/components/BottomSheet'
import { FileBadge } from '@/components/FileBadge'
import { Icon } from '@/components/Icon'
import { Text, TextInput } from '@/components/Text'
import { openAttachment, type PickedFile } from '@/data/attachments'
import { useMail } from '@/data/MailProvider'
import { isFavorite } from '@/data/favorites'
import { useT } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

function Bubble({ mail }: { mail: Mail }) {
  const { colors } = useTheme()
  const mine = mail.direction === 'out'
  const body = stripQuoted(mail.text) || previewText(mail, 280)
  const fg = mine ? colors.onBubbleOut : colors.text
  const meta = mine ? colors.onBubbleOut : colors.textMuted
  const onlyAttachment = !body && mail.attachments.length > 0

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/mail/[id]', params: { id: mail.id } })}
      style={[
        styles.bubble,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        { backgroundColor: mine ? colors.bubbleOut : colors.bubbleIn },
      ]}
      accessibilityRole="button"
      accessibilityHint="Opens the full email"
    >
      {!!mail.subject && !mine && mail.html && !stripQuoted(mail.text) && (
        <Text style={[styles.bubbleSubject, { color: fg }]}>{mail.subject}</Text>
      )}
      {!!body && <Text style={[styles.bubbleText, { color: fg }]}>{body}</Text>}

      {mail.attachments.map((a, i) => (
        <Pressable
          key={i}
          onPress={() => openAttachment(mail.id, i)}
          style={[
            styles.file,
            { backgroundColor: mine ? colors.surfaceSelected : colors.surface },
            !onlyAttachment && styles.fileSpaced,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Download ${a.filename ?? 'attachment'}`}
        >
          <FileBadge filename={a.filename} contentType={a.contentType} size={40} />
          <View style={styles.fileInfo}>
            <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
              {a.filename ?? 'Untitled'}
            </Text>
            <Text style={[styles.fileSize, { color: colors.textMuted }]}>{formatBytes(a.size)}</Text>
          </View>
          {!mine && <Icon name="download" size={22} color={colors.primary} />}
        </Pressable>
      ))}

      <View style={styles.meta}>
        <Text style={[styles.time, { color: meta }]}>{formatTime(mail.receivedAt)}</Text>
        {mine && <Icon name="checkCheck" size={15} color={meta} />}
      </View>
    </Pressable>
  )
}

export default function ConversationScreen() {
  const { address } = useLocalSearchParams<{ address: string }>()
  const { colors, scheme } = useTheme()
  const { mails, updateMany, send } = useMail()
  const scroll = useRef<ScrollView>(null)
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<PickedFile[]>([])
  const [picking, setPicking] = useState(false)
  const [menu, setMenu] = useState(false)
  const [sending, setSending] = useState(false)

  const conversation = useMemo(
    () => conversations(mails).find((c) => c.person.address === address),
    [mails, address],
  )

  const unreadIds = conversation?.messages.filter((m) => m.direction === 'in' && !m.read).map((m) => m.id)
  const unreadKey = unreadIds?.join(',')
  useEffect(() => {
    if (unreadIds?.length) void updateMany(unreadIds, { read: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadKey, updateMany])

  const t = useT()
  const favorite = !!conversation && isFavorite(conversation)
  const toggleFavorite = () => {
    if (!conversation) return
    if (favorite) {
      void updateMany(
        conversation.messages.filter((m) => m.starred).map((m) => m.id),
        { starred: false },
      )
    } else {
      void updateMany([conversation.latest.id], { starred: true })
    }
  }
  const person = conversation?.person ?? { name: address ?? '', address: address ?? '' }
  const phone = person.address.split('@')[0]
  const isPhone = /^\+?\d{7,15}$/.test(phone)

  const lastIncoming = [...(conversation?.messages ?? [])].reverse().find((m) => m.direction === 'in')
  const lastSubject = conversation?.latest.subject ?? ''

  const reply = async () => {
    if (!draft.trim() && !files.length) return
    setSending(true)
    try {
      await send({
        to: [person.address],
        subject: lastSubject ? (/^re:/i.test(lastSubject) ? lastSubject : `Re: ${lastSubject}`) : 'Hello',
        text: draft.trim() || ' ',
        inReplyTo: lastIncoming?.messageId ?? undefined,
        attachments: files.length
          ? files.map(({ filename, contentType, content }) => ({ filename, contentType, content }))
          : undefined,
      })
      setDraft('')
      setFiles([])
    } catch (err) {
      Alert.alert('Message not sent', (err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const items: ({ kind: 'day'; label: string } | { kind: 'mail'; mail: Mail })[] = []
  let lastDay = ''
  for (const m of conversation?.messages ?? []) {
    const day = formatDay(m.receivedAt)
    if (day !== lastDay) items.push({ kind: 'day', label: day })
    items.push({ kind: 'mail', mail: m })
    lastDay = day
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
          <Icon name="arrowLeft" size={24} color={colors.text} />
        </Pressable>
        <Avatar name={person.name} size={42} />
        <View style={styles.headerText}>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {person.name}
          </Text>
          <Text style={[styles.headerAddress, { color: colors.textMuted }]} numberOfLines={1}>
            {person.address}
          </Text>
        </View>
        <Pressable
          hitSlop={8}
          accessibilityLabel="Call"
          onPress={() =>
            isPhone
              ? void Linking.openURL(`tel:${phone}`)
              : Alert.alert('No phone number', `${person.address} isn’t a PhoneMail number.`)
          }
        >
          <Icon name="phoneCall" size={22} color={colors.text} />
        </Pressable>
        <Pressable hitSlop={8} accessibilityLabel="More" onPress={() => setMenu(true)}>
          <Icon name="moreVertical" size={24} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          style={{ backgroundColor: colors.chatBackground }}
          contentContainerStyle={styles.thread}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
          keyboardDismissMode="interactive"
        >
          {items.map((item, i) =>
            item.kind === 'day' ? (
              <View key={`d${i}`} style={[styles.day, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.dayText, { color: colors.textMuted }]}>{item.label}</Text>
              </View>
            ) : (
              <Bubble key={item.mail.id} mail={item.mail} />
            ),
          )}
          {!conversation && (
            <Text style={[styles.newChat, { color: colors.textMuted }]}>
              Start a conversation with {person.address}
            </Text>
          )}
        </ScrollView>

        {files.length > 0 && (
          <ScrollView
            horizontal
            style={[styles.pending, { backgroundColor: colors.surface, borderTopColor: colors.border }]}
            contentContainerStyle={styles.pendingRow}
          >
            {files.map((f, i) => (
              <View key={`${f.filename}${i}`} style={[styles.pendingFile, { borderColor: colors.border }]}>
                <FileBadge filename={f.filename} contentType={f.contentType ?? ''} size={28} />
                <Text style={[styles.pendingName, { color: colors.text }]} numberOfLines={1}>
                  {f.filename}
                </Text>
                <Pressable
                  onPress={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  hitSlop={8}
                  accessibilityLabel={`Remove ${f.filename}`}
                >
                  <Icon name="close" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={[styles.composer, { backgroundColor: colors.surface }]}>
          <Pressable onPress={() => setPicking(true)} hitSlop={8} accessibilityLabel="Attach">
            <Icon name="paperclip" size={24} color={colors.textMuted} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a reply..."
            placeholderTextColor={colors.textSubtle}
            selectionColor={colors.primary}
            keyboardAppearance={scheme}
            multiline
            style={[styles.input, { backgroundColor: colors.surfaceSunken, color: colors.text }]}
          />
          <Pressable
            onPress={() => void reply()}
            disabled={sending}
            style={[styles.send, { backgroundColor: colors.primary }]}
            accessibilityLabel="Send"
          >
            {sending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Icon name="send" size={20} color={colors.onPrimary} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AttachmentPicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPicked={(picked) => setFiles((prev) => [...prev, ...picked])}
      />
      <BottomSheet
        visible={menu}
        onClose={() => setMenu(false)}
        options={[
          {
            label: t('chat.newEmail'),
            icon: 'pencil',
            onPress: () => router.push({ pathname: '/compose', params: { to: person.address } }),
          },
          ...(conversation
            ? [
                {
                  label: favorite ? t('chat.removeFavorite') : t('chat.addFavorite'),
                  icon: 'star' as const,
                  onPress: toggleFavorite,
                },
              ]
            : []),
          {
            label: t('chat.markRead'),
            icon: 'mail',
            onPress: () =>
              void updateMany(
                (conversation?.messages ?? []).filter((m) => !m.read).map((m) => m.id),
                { read: true },
              ),
          },
          {
            label: t('chat.trash'),
            icon: 'trash',
            danger: true,
            onPress: () => {
              void updateMany(
                (conversation?.messages ?? []).map((m) => m.id),
                { folder: 'trash' },
              )
              router.back()
            },
          },
        ]}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerName: { fontSize: font.title, fontWeight: '600' },
  headerAddress: { fontSize: font.small },
  thread: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  day: { alignSelf: 'center', paddingHorizontal: spacing.md + 2, paddingVertical: 4, borderRadius: radius.full },
  dayText: { fontSize: font.small, fontWeight: '500' },
  bubble: { maxWidth: '82%', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderRadius: 18 },
  bubbleTheirs: { alignSelf: 'flex-start', borderTopLeftRadius: 6 },
  bubbleMine: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  bubbleSubject: { fontSize: font.body, fontWeight: '600', marginBottom: 4 },
  bubbleText: { fontSize: font.body + 1, lineHeight: 23 },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 230,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  fileSpaced: { marginTop: spacing.sm },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontSize: font.body, fontWeight: '600' },
  fileSize: { fontSize: font.small, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  time: { fontSize: font.caption },
  newChat: { textAlign: 'center', marginTop: 48, fontSize: font.small + 1 },
  pending: { flexGrow: 0, borderTopWidth: StyleSheet.hairlineWidth },
  pendingRow: { gap: spacing.sm, padding: spacing.sm },
  pendingFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 220,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  pendingName: { flexShrink: 1, fontSize: font.small },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 23,
    fontSize: font.body,
  },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
})
