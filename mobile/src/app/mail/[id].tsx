import {
  formatBytes,
  formatDetailDate,
  senderAddress,
  senderName,
} from '@shared/mail'
import { labelColors, type LabelColor } from '@shared/theme'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { BottomSheet, type SheetOption } from '@/components/BottomSheet'
import { EmailWebView } from '@/components/EmailWebView'
import { FileBadge } from '@/components/FileBadge'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { openAttachment } from '@/data/attachments'
import { useMail } from '@/data/MailProvider'
import { traditionalReplyParams, wasRepliedTo } from '@/data/reply'
import { useT } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

export default function EmailDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { mails, labels, account, update, removeMany } = useMail()
  const t = useT()
  const [menu, setMenu] = useState<'none' | 'more' | 'labels'>('none')
  const mail = mails.find((m) => m.id === id)

  useEffect(() => {
    if (mail && !mail.read) void update(mail.id, { read: true })
  }, [mail, update])

  if (!mail) {
    return (
      <SafeAreaView style={[styles.missing, { backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.textMuted }}>This email is no longer available.</Text>
        <Pressable onPress={() => router.back()} style={styles.missingBack}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const mine = mail.direction === 'out'
  const name = mine ? (account?.name ?? 'Me') : senderName(mail.from)
  const address = mine ? (account?.address ?? '') : senderAddress(mail.from)
  const inBin = mail.folder === 'trash' || mail.folder === 'spam'

  const leave = (changes: Parameters<typeof update>[1]) => {
    void update(mail.id, changes)
    router.back()
  }

  const replied = wasRepliedTo(mail, mails)
  const replyTo = () => router.push({ pathname: '/compose', params: traditionalReplyParams(mail) })

  const forward = () =>
    router.push({
      pathname: '/compose',
      params: {
        subject: /^fwd:/i.test(mail.subject) ? mail.subject : `Fwd: ${mail.subject}`,
        body: `\n\n---------- Forwarded message ---------\nFrom: ${mail.from}\nDate: ${formatDetailDate(mail.date)}\nSubject: ${mail.subject}\n\n${mail.text}`,
      },
    })

  const moreOptions: SheetOption[] = [
    ...(replied ? [] : [{ label: t('chat.reply'), icon: 'reply' as const, onPress: replyTo }]),
    { label: 'Forward', icon: 'forward', onPress: forward },
    {
      label: mail.starred ? 'Remove star' : 'Star',
      icon: 'star',
      onPress: () => void update(mail.id, { starred: !mail.starred }),
    },
    { label: 'Mark as unread', icon: 'mailDot', onPress: () => leave({ read: false }) },
    { label: 'Label as…', icon: 'label', onPress: () => setTimeout(() => setMenu('labels'), 350) },
    ...(mail.folder !== 'spam' && !mine
      ? [{ label: 'Report spam', icon: 'shield' as const, onPress: () => leave({ folder: 'spam' }) }]
      : []),
    ...(inBin
      ? [
          { label: 'Move to Inbox', icon: 'restore' as const, onPress: () => leave({ folder: 'inbox' }) },
          {
            label: 'Delete forever',
            icon: 'trash' as const,
            danger: true,
            onPress: () => {
              void removeMany([mail.id])
              router.back()
            },
          },
        ]
      : []),
  ]

  const labelOptions: SheetOption[] = labels.map((l) => ({
    label: l.name,
    checked: mail.labels.includes(l.name),
    leading: (
      <View
        style={[styles.swatch, { backgroundColor: labelColors[l.color as LabelColor] ?? l.color }]}
      />
    ),
    onPress: () =>
      void update(mail.id, {
        labels: mail.labels.includes(l.name)
          ? mail.labels.filter((x) => x !== l.name)
          : [...mail.labels, l.name],
      }),
  }))

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={styles.toolbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
          <Icon name="arrowLeft" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.flex} />
        <Pressable
          onPress={() => leave({ folder: mail.folder === 'archive' ? 'inbox' : 'archive' })}
          hitSlop={8}
          accessibilityLabel={mail.folder === 'archive' ? 'Move to Inbox' : 'Archive'}
        >
          <Icon name="archive" size={24} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => {
            if (mail.folder === 'trash') {
              void removeMany([mail.id])
              router.back()
            } else leave({ folder: 'trash' })
          }}
          hitSlop={8}
          accessibilityLabel={mail.folder === 'trash' ? 'Delete forever' : 'Delete'}
        >
          <Icon name="trash" size={24} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setMenu('more')} hitSlop={8} accessibilityLabel="More">
          <Icon name="moreVertical" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.subject, { color: colors.text }]} selectable>
          {mail.subject || '(no subject)'}
        </Text>

        {mail.labels.length > 0 && (
          <View style={styles.labels}>
            {mail.labels.map((l) => (
              <View key={l} style={[styles.labelChip, { backgroundColor: colors.surfaceSunken }]}>
                <Text style={[styles.labelText, { color: colors.textMuted }]}>{l}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.sender}>
          <Avatar name={name} size={48} tone="primary" />
          <View style={styles.senderText}>
            <View style={styles.senderLine}>
              <Text style={[styles.senderName, { color: colors.text }]} numberOfLines={1}>
                {name}
              </Text>
              {mail.starred && <Icon name="star" size={16} color={colors.star} filled />}
            </View>
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
              {mine ? `to ${mail.to.join(', ')}` : address}
            </Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>{formatDetailDate(mail.date)}</Text>
          </View>
        </View>

        {mail.html ? (
          <EmailWebView html={mail.html} />
        ) : (
          <Text style={[styles.body, { color: colors.text }]} selectable>
            {mail.text}
          </Text>
        )}

        {mail.attachments.length > 0 && (
          <View style={styles.attachments}>
            <Text style={[styles.attachmentsTitle, { color: colors.text }]}>
              {mail.attachments.length} attachment{mail.attachments.length > 1 ? 's' : ''}
            </Text>
            {mail.attachments.map((a, i) => (
              <Pressable
                key={i}
                onPress={() => openAttachment(mail.id, i)}
                style={[styles.attachment, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={`Download ${a.filename ?? 'attachment'}`}
              >
                <FileBadge filename={a.filename} contentType={a.contentType} size={40} />
                <View style={styles.flex}>
                  <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                    {a.filename ?? 'Untitled'}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]}>{formatBytes(a.size)}</Text>
                </View>
                <Icon name="download" size={22} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          {replied ? (
            <View style={[styles.action, styles.actionOutline, { borderColor: colors.border }]}>
              <Icon name="checkCheck" size={20} color={colors.textMuted} />
              <Text style={[styles.actionText, { color: colors.textMuted }]}>{t('chat.replied')}</Text>
            </View>
          ) : (
            <Pressable
              onPress={replyTo}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: pressed ? colors.primaryHover : colors.primary },
              ]}
            >
              <Icon name="reply" size={20} color={colors.onPrimary} />
              <Text style={[styles.actionText, { color: colors.onPrimary }]}>{t('chat.reply')}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={forward}
            style={({ pressed }) => [
              styles.action,
              styles.actionOutline,
              { borderColor: colors.borderStrong },
              pressed && { backgroundColor: colors.surfaceHover },
            ]}
          >
            <Icon name="forward" size={20} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Forward</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomSheet visible={menu === 'more'} onClose={() => setMenu('none')} options={moreOptions} />
      <BottomSheet
        visible={menu === 'labels'}
        title="Label as"
        onClose={() => setMenu('none')}
        options={labelOptions}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingBack: { marginTop: spacing.md, padding: spacing.sm },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg + 2,
    height: 56,
  },
  content: { paddingHorizontal: spacing.lg + 2, paddingBottom: spacing.xl * 2 },
  subject: { fontSize: 26, fontWeight: '700', lineHeight: 32, marginTop: spacing.sm },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  labelChip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  labelText: { fontSize: font.caption },
  sender: { flexDirection: 'row', gap: spacing.md + 2, marginTop: spacing.lg, marginBottom: spacing.xl },
  senderText: { flex: 1, minWidth: 0 },
  senderLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  senderName: { flexShrink: 1, fontSize: font.title, fontWeight: '600' },
  meta: { fontSize: font.small + 0.5, marginTop: 1 },
  body: { fontSize: font.body + 1, lineHeight: 24 },
  attachments: { marginTop: spacing.xl, gap: spacing.sm },
  attachmentsTitle: { fontSize: font.body, fontWeight: '600' },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
  attachmentName: { fontSize: font.body, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl + 4 },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.full,
  },
  actionOutline: { borderWidth: 1 },
  actionText: { fontSize: font.body + 1, fontWeight: '600' },
  swatch: { width: 18, height: 18, borderRadius: 5 },
})
