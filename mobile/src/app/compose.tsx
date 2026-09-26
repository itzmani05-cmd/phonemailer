import { formatBytes } from '@shared/mail'
import { router, useLocalSearchParams } from 'expo-router'
import { useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AttachmentPicker } from '@/components/AttachmentPicker'
import { FileBadge } from '@/components/FileBadge'
import { Icon, type IconName } from '@/components/Icon'
import { Text, TextInput } from '@/components/Text'
import {
  MAX_ATTACHMENT_BYTES,
  pickDocuments,
  pickMedia,
  type PickedFile,
} from '@/data/attachments'
import { useMail } from '@/data/MailProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function RecipientField({
  label,
  values,
  onChange,
  trailing,
  autoFocus,
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  trailing?: ReactNode
  autoFocus?: boolean
}) {
  const { colors, scheme } = useTheme()
  const [text, setText] = useState('')

  const commit = (raw = text) => {
    const parts = raw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length) onChange([...values, ...parts.filter((p) => !values.includes(p))])
    setText('')
  }

  return (
    <View style={[styles.field, { borderBottomColor: colors.border }]}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.recipients}>
        {values.map((v) => (
          <Pressable
            key={v}
            onPress={() => onChange(values.filter((x) => x !== v))}
            style={[
              styles.chip,
              { backgroundColor: EMAIL_RE.test(v) ? colors.surfaceSunken : colors.dangerSoft },
            ]}
            accessibilityLabel={`Remove ${v}`}
          >
            <Text style={[styles.chipText, { color: EMAIL_RE.test(v) ? colors.text : colors.danger }]}>
              {v}
            </Text>
            <Icon name="close" size={12} color={colors.textMuted} />
          </Pressable>
        ))}
        <TextInput
          value={text}
          autoFocus={autoFocus}
          onChangeText={(t) => (/[,;\s]$/.test(t) ? commit(t) : setText(t))}
          onSubmitEditing={() => commit()}
          onBlur={() => commit()}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1))
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardAppearance={scheme}
          selectionColor={colors.primary}
          blurOnSubmit={false}
          style={[styles.recipientInput, { color: colors.text }]}
          accessibilityLabel={label}
        />
      </View>
      {trailing}
    </View>
  )
}

export default function ComposeScreen() {
  const params = useLocalSearchParams<{ to?: string; subject?: string; body?: string; inReplyTo?: string }>()
  const { colors, scheme } = useTheme()
  const { send } = useMail()
  const [to, setTo] = useState<string[]>(params.to ? params.to.split(',') : [])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState(params.subject ?? '')
  const [body, setBody] = useState(params.body ?? '')
  const [selection, setSelection] = useState({ start: 0, end: 0 })
  const [files, setFiles] = useState<PickedFile[]>([])
  const [picking, setPicking] = useState(false)
  const [sending, setSending] = useState(false)

  const dirty = to.length > 0 || subject.trim() || body.trim() || files.length > 0

  const close = () => {
    if (!dirty) return router.back()
    Alert.alert('Discard this email?', undefined, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ])
  }

  const insert = (snippet: string) => {
    const next = body.slice(0, selection.start) + snippet + body.slice(selection.end)
    setBody(next)
    const cursor = selection.start + snippet.length
    setSelection({ start: cursor, end: cursor })
  }

  const attach = (pick: () => Promise<PickedFile[]>) => () =>
    pick()
      .then((picked) => setFiles((prev) => [...prev, ...picked]))
      .catch((err: Error) => Alert.alert('Couldn’t attach', err.message))

  const submit = async () => {
    const invalid = [...to, ...cc, ...bcc].find((a) => !EMAIL_RE.test(a))
    if (!to.length) return Alert.alert('Add a recipient', 'Who should this email go to?')
    if (invalid) return Alert.alert('Invalid address', `“${invalid}” isn’t a valid email address.`)
    if (files.reduce((s, f) => s + f.size, 0) > MAX_ATTACHMENT_BYTES)
      return Alert.alert('Attachments too large', 'Attachments can be up to 18 MB in total.')
    setSending(true)
    try {
      await send({
        to,
        cc: cc.length ? cc : undefined,
        bcc: bcc.length ? bcc : undefined,
        subject: subject.trim() || '(no subject)',
        text: body.trim() ? body : ' ',
        inReplyTo: params.inReplyTo,
        attachments: files.length
          ? files.map(({ filename, contentType, content }) => ({ filename, contentType, content }))
          : undefined,
      })
      router.back()
    } catch (err) {
      Alert.alert('Email not sent', (err as Error).message)
      setSending(false)
    }
  }

  const tools: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: 'type', label: 'Bulleted list', onPress: () => insert(`${body && !body.endsWith('\n') ? '\n' : ''}• `) },
    { icon: 'image', label: 'Attach photo', onPress: attach(pickMedia) },
    { icon: 'link', label: 'Insert link', onPress: () => insert('https://') },
    { icon: 'drive', label: 'Attach from Drive', onPress: attach(pickDocuments) },
    { icon: 'moreHorizontal', label: 'More attachment options', onPress: () => setPicking(true) },
  ]

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close">
          <Icon name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Compose</Text>
        <Pressable onPress={() => void submit()} hitSlop={10} disabled={sending} accessibilityLabel="Send">
          {sending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Icon name="send" size={24} color={colors.primary} />
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <RecipientField
            label="To"
            values={to}
            onChange={setTo}
            autoFocus={!params.to}
            trailing={
              <Pressable onPress={() => setShowCc((s) => !s)} hitSlop={8} accessibilityLabel="Show Cc and Bcc">
                <Icon name={showCc ? 'chevronUp' : 'chevronDown'} size={20} color={colors.textMuted} />
              </Pressable>
            }
          />
          {showCc ? (
            <>
              <RecipientField label="Cc" values={cc} onChange={setCc} />
              <RecipientField label="Bcc" values={bcc} onChange={setBcc} />
            </>
          ) : (
            <Pressable
              onPress={() => setShowCc(true)}
              style={[styles.field, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.fieldLabel, styles.flex, { color: colors.textMuted }]}>Cc/Bcc</Text>
              <Icon name="chevronDown" size={20} color={colors.textMuted} />
            </Pressable>
          )}

          <View style={[styles.field, { borderBottomColor: colors.border }]}>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Subject"
              placeholderTextColor={colors.textSubtle}
              selectionColor={colors.primary}
              keyboardAppearance={scheme}
              style={[styles.subject, { color: colors.text }]}
            />
          </View>

          <TextInput
            value={body}
            onChangeText={setBody}
            selection={selection}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            placeholder="Compose email"
            placeholderTextColor={colors.textSubtle}
            selectionColor={colors.primary}
            keyboardAppearance={scheme}
            multiline
            textAlignVertical="top"
            style={[styles.body, { color: colors.text }]}
          />

          {files.map((f, i) => (
            <View
              key={`${f.filename}${i}`}
              style={[styles.attachment, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <FileBadge filename={f.filename} contentType={f.contentType ?? ''} size={40} />
              <View style={styles.attachmentInfo}>
                <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                  {f.filename}
                </Text>
                <Text style={[styles.attachmentSize, { color: colors.textMuted }]}>
                  {formatBytes(f.size)}
                </Text>
              </View>
              <Pressable
                onPress={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                hitSlop={10}
                accessibilityLabel={`Remove ${f.filename}`}
              >
                <Icon name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.toolbar, { borderTopColor: colors.border }]}>
          {tools.map((t) => (
            <Pressable key={t.icon} onPress={t.onPress} hitSlop={8} accessibilityLabel={t.label}>
              <Icon name={t.icon} size={24} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </KeyboardAvoidingView>

      <AttachmentPicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPicked={(picked) => setFiles((prev) => [...prev, ...picked])}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg + 2,
    height: 56,
  },
  title: { fontSize: font.title + 2, fontWeight: '600' },
  content: { paddingBottom: spacing.xl },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 58,
    marginHorizontal: spacing.lg + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: { fontSize: font.body, minWidth: 30 },
  recipients: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingVertical: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm + 2,
    borderRadius: radius.full,
  },
  chipText: { fontSize: font.small + 1 },
  recipientInput: { flexGrow: 1, minWidth: 100, fontSize: font.body, paddingVertical: 4 },
  subject: { flex: 1, fontSize: font.body + 1, paddingVertical: spacing.md },
  body: {
    minHeight: 220,
    marginHorizontal: spacing.lg + 2,
    paddingTop: spacing.lg,
    fontSize: font.body + 1,
    lineHeight: 24,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md + 2,
    borderRadius: radius.md + 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  attachmentInfo: { flex: 1, minWidth: 0 },
  attachmentName: { fontSize: font.body, fontWeight: '600' },
  attachmentSize: { fontSize: font.small, marginTop: 2 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
