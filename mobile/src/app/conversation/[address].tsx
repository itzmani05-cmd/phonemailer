import { conversations, formatDay, previewText, stripQuoted, type Mail } from '@shared/mail'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  type TextInput as RNTextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AttachmentPicker } from '@/components/AttachmentPicker'
import { Avatar } from '@/components/Avatar'
import { ChatBubble } from '@/components/ChatBubble'
import { BottomSheet } from '@/components/BottomSheet'
import { FileBadge } from '@/components/FileBadge'
import { Icon } from '@/components/Icon'
import { Text, TextInput } from '@/components/Text'
import type { PickedFile } from '@/data/attachments'
import { useMail } from '@/data/MailProvider'
import { isFavorite } from '@/data/favorites'
import { isReply, replySubject, traditionalReplyParams } from '@/data/reply'
import { useT } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

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
  const [subject, setSubject] = useState('')
  const [replyTarget, setReplyTarget] = useState<Mail | null>(null)
  const input = useRef<RNTextInput>(null)

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

  const repliedIds = useMemo(
    () => new Set(mails.filter((m) => m.direction === 'out' && m.inReplyTo).map((m) => m.inReplyTo!)),
    [mails],
  )
  const byMessageId = useMemo(
    () => new Map((conversation?.messages ?? []).filter((m) => m.messageId).map((m) => [m.messageId!, m])),
    [conversation],
  )
  const isReplied = (m: Mail) => !!m.messageId && repliedIds.has(m.messageId)
  const alreadyReplied = t('chat.alreadyReplied')
  const authorOf = (m: Mail) => (m.direction === 'out' ? t('chat.you') : person.name)

  const startReply = useCallback(
    (m: Mail) => {
      if (m.messageId && repliedIds.has(m.messageId)) return Alert.alert(alreadyReplied)
      setReplyTarget(m)
      input.current?.focus()
    },
    [repliedIds, alreadyReplied],
  )

  const composeTraditional = () =>
    router.push({ pathname: '/compose', params: { to: person.address, locked: '1' } })

  const replyTraditional = (m: Mail) => {
    setReplyTarget(null)
    router.push({ pathname: '/compose', params: traditionalReplyParams(m) })
  }

  const submit = async () => {
    if (!draft.trim() && !files.length) return
    if (replyTarget && isReplied(replyTarget)) {
      setReplyTarget(null)
      return Alert.alert(t('chat.alreadyReplied'))
    }
    setSending(true)
    try {
      await send({
        to: [person.address],
        subject: replyTarget ? replySubject(replyTarget.subject) : subject.trim() || '(no subject)',
        text: draft.trim() || ' ',
        inReplyTo: replyTarget?.messageId ?? undefined,
        attachments: files.length
          ? files.map(({ filename, contentType, content }) => ({ filename, contentType, content }))
          : undefined,
      })
      setDraft('')
      setFiles([])
      setSubject('')
      setReplyTarget(null)
    } catch (err) {
      Alert.alert(t('chat.notSent'), (err as Error).message)
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
        <Pressable hitSlop={8} accessibilityLabel={t('chat.composeTraditional')} onPress={composeTraditional}>
          <Icon name="mail" size={22} color={colors.text} />
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
              <ChatBubble
                key={item.mail.id}
                mail={item.mail}
                original={item.mail.inReplyTo ? byMessageId.get(item.mail.inReplyTo) : undefined}
                originalAuthor={
                  item.mail.inReplyTo && byMessageId.get(item.mail.inReplyTo)
                    ? authorOf(byMessageId.get(item.mail.inReplyTo)!)
                    : undefined
                }
                replied={isReplied(item.mail)}
                onReply={startReply}
              />
            ),
          )}
          {!conversation && (
            <Text style={[styles.newChat, { color: colors.textMuted }]}>
              {t('chat.start', { address: person.address })}
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

        {replyTarget ? (
          <View style={[styles.replyBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={[styles.replyQuote, { borderLeftColor: colors.primary, backgroundColor: colors.surfaceSunken }]}>
              <Text style={[styles.replyAuthor, { color: colors.primary }]} numberOfLines={1}>
                {t('chat.replyingTo')} {authorOf(replyTarget)}
              </Text>
              <Text style={[styles.replyText, { color: colors.textMuted }]} numberOfLines={1}>
                {!isReply(replyTarget) && replyTarget.subject ? `${replyTarget.subject} · ` : ''}
                {stripQuoted(replyTarget.text) || previewText(replyTarget, 80)}
              </Text>
            </View>
            <Pressable
              onPress={() => replyTraditional(replyTarget)}
              hitSlop={8}
              accessibilityLabel={t('chat.traditional')}
            >
              <Icon name="mail" size={22} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => setReplyTarget(null)} hitSlop={8} accessibilityLabel={t('chat.cancelReply')}>
              <Icon name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.subjectRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Text style={[styles.subjectLabel, { color: colors.textMuted }]}>{t('chat.subject')}</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholderTextColor={colors.textSubtle}
              selectionColor={colors.primary}
              keyboardAppearance={scheme}
              returnKeyType="next"
              onSubmitEditing={() => input.current?.focus()}
              style={[styles.subjectInput, { color: colors.text }]}
            />
          </View>
        )}

        <View style={[styles.composer, { backgroundColor: colors.surface }]}>
          <Pressable onPress={() => setPicking(true)} hitSlop={8} accessibilityLabel="Attach">
            <Icon name="paperclip" size={24} color={colors.textMuted} />
          </Pressable>
          <TextInput
            ref={input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('chat.typeMessage')}
            placeholderTextColor={colors.textSubtle}
            selectionColor={colors.primary}
            keyboardAppearance={scheme}
            multiline
            style={[styles.input, { backgroundColor: colors.surfaceSunken, color: colors.text }]}
          />
          <Pressable
            onPress={() => void submit()}
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
            onPress: composeTraditional,
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
  newChat: { textAlign: 'center', marginTop: 48, fontSize: font.small + 1 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyQuote: { flex: 1, borderLeftWidth: 3, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  replyAuthor: { fontSize: font.small, fontWeight: '600' },
  replyText: { fontSize: font.small, marginTop: 1 },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subjectLabel: { fontSize: font.small, fontWeight: '600' },
  subjectInput: { flex: 1, fontSize: font.body, paddingVertical: spacing.sm },
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
