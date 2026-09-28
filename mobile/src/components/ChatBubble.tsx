import { formatBytes, formatTime, previewText, stripQuoted, type Mail } from '@shared/mail'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native'
import { openAttachment } from '@/data/attachments'
import { isReply } from '@/data/reply'
import { useT } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'
import { FileBadge } from './FileBadge'
import { Icon } from './Icon'
import { Text } from './Text'

const MAX_CHARS = 600
const SWIPE_TRIGGER = 64
const SWIPE_MAX = 96

interface Props {
  mail: Mail
  original?: Mail
  originalAuthor?: string
  replied: boolean
  onReply: (mail: Mail) => void
}

export function ChatBubble({ mail, original, originalAuthor, replied, onReply }: Props) {
  const { colors } = useTheme()
  const t = useT()
  const mine = mail.direction === 'out'
  const full = stripQuoted(mail.text) || previewText(mail, 280)
  const long = full.length > MAX_CHARS
  const body = long ? `${full.slice(0, MAX_CHARS).trimEnd()}…` : full
  const fg = mine ? colors.onBubbleOut : colors.text
  const meta = mine ? colors.onBubbleOut : colors.textMuted
  const onlyAttachment = !body && mail.attachments.length > 0
  const showSubject = !isReply(mail) && !!mail.subject && mail.subject !== '(no subject)'

  const [x] = useState(() => new Animated.Value(0))
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => !replied && g.dx > 12 && Math.abs(g.dy) < Math.abs(g.dx) / 2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => x.setValue(Math.max(0, Math.min(g.dx, SWIPE_MAX))),
        onPanResponderRelease: (_, g) => {
          if (g.dx >= SWIPE_TRIGGER) onReply(mail)
          Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start()
        },
        onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [replied, mail, x, onReply],
  )

  const hintOpacity = x.interpolate({ inputRange: [0, SWIPE_TRIGGER], outputRange: [0, 1], extrapolate: 'clamp' })

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]} {...responder.panHandlers}>
      <Animated.View style={[styles.hint, { opacity: hintOpacity }]} pointerEvents="none">
        <View style={[styles.hintCircle, { backgroundColor: colors.surface }]}>
          <Icon name="reply" size={18} color={colors.primary} />
        </View>
      </Animated.View>
      <Animated.View style={[styles.bubbleWrap, { transform: [{ translateX: x }] }]}>
        <Pressable
          onPress={() => router.push({ pathname: '/mail/[id]', params: { id: mail.id } })}
          onLongPress={() => !replied && onReply(mail)}
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
            { backgroundColor: mine ? colors.bubbleOut : colors.bubbleIn },
          ]}
          accessibilityRole="button"
          accessibilityHint={t('chat.readMore')}
        >
          {!!original && (
            <View style={[styles.quote, { backgroundColor: mine ? colors.surfaceSelected : colors.surface, borderLeftColor: colors.primary }]}>
              <Text style={[styles.quoteAuthor, { color: colors.primary }]} numberOfLines={1}>
                {originalAuthor}
              </Text>
              <Text style={[styles.quoteText, { color: colors.textMuted }]} numberOfLines={2}>
                {original.subject && !isReply(original) ? `${original.subject} · ` : ''}
                {stripQuoted(original.text) || previewText(original, 120)}
              </Text>
            </View>
          )}
          {showSubject && <Text style={[styles.subject, { color: fg }]}>{mail.subject}</Text>}
          {!!body && <Text style={[styles.text, { color: fg }]}>{body}</Text>}
          {long && <Text style={[styles.readMore, { color: mine ? fg : colors.primary }]}>{t('chat.readMore')}</Text>}

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
              accessibilityLabel={a.filename ?? 'attachment'}
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
            {replied && (
              <>
                <Icon name="reply" size={13} color={meta} />
                <Text style={[styles.time, { color: meta }]}>{t('chat.replied')} · </Text>
              </>
            )}
            <Text style={[styles.time, { color: meta }]}>{formatTime(mail.receivedAt)}</Text>
            {mine && <Icon name="checkCheck" size={15} color={meta} />}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  hint: { position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center' },
  hintCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bubbleWrap: { maxWidth: '82%' },
  bubble: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderRadius: 18 },
  bubbleTheirs: { borderTopLeftRadius: 6 },
  bubbleMine: { borderBottomRightRadius: 6 },
  quote: { borderLeftWidth: 3, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, marginBottom: spacing.sm },
  quoteAuthor: { fontSize: font.small, fontWeight: '600' },
  quoteText: { fontSize: font.small, marginTop: 1 },
  subject: { fontSize: font.body, fontWeight: '700', marginBottom: 4 },
  text: { fontSize: font.body + 1, lineHeight: 23 },
  readMore: { fontSize: font.small, fontWeight: '600', marginTop: 4 },
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
})
