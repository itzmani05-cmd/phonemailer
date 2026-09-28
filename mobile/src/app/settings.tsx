import { ApiError, formatPhone, type Account } from '@shared/mail'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { AccountAvatar } from '@/components/Avatar'
import { Icon, type IconName } from '@/components/Icon'
import { Text, TextInput } from '@/components/Text'
import { api } from '@/data/api'
import { API_URL } from '@/data/config'
import { useMail } from '@/data/MailProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { LANGUAGES, type StringKey } from '@/i18n/strings'
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

const THEME_OPTIONS: { id: ThemePreference; label: StringKey; icon: IconName }[] = [
  { id: 'system', label: 'settings.system', icon: 'monitor' },
  { id: 'light', label: 'settings.light', icon: 'sun' },
  { id: 'dark', label: 'settings.dark', icon: 'moon' },
]

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const { account, setAccount } = useMail()
  const [name, setName] = useState<string | null>(null)
  const [alias, setAlias] = useState('')
  const [busy, setBusy] = useState<'photo' | 'name' | 'alias' | null>(null)
  const [aliasError, setAliasError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const shownName = name ?? (account?.name === account?.phone ? '' : (account?.name ?? ''))

  const run = async (kind: 'photo' | 'name' | 'alias', action: () => Promise<Account>) => {
    setBusy(kind)
    try {
      setAccount(await action())
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('common.offline')
      if (kind === 'alias') setAliasError(message)
      else Alert.alert(t('common.error'), message)
      return false
    } finally {
      setBusy(null)
    }
  }

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    })
    if (result.canceled || !result.assets[0]?.base64) return
    const asset = result.assets[0]
    const contentType = PHOTO_TYPES.includes(asset.mimeType ?? '') ? asset.mimeType! : 'image/jpeg'
    await run('photo', () => api.setAvatar({ contentType, content: asset.base64! }))
  }

  const saveName = async () => {
    if (name === null) return
    if (await run('name', () => api.updateAccount({ name }))) {
      setName(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  const addAlias = async () => {
    const value = alias.trim()
    if (!value) return
    setAliasError(null)
    if (await run('alias', () => api.addAlias(value))) setAlias('')
  }

  const removeAlias = (address: string) =>
    Alert.alert(t('aliases.remove', { address }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => void run('alias', () => api.removeAlias(address)),
      },
    ])

  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]
  const divider = { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings.profile')}</Text>
      <View style={card}>
        <View style={styles.photoRow}>
          <View>
            <AccountAvatar size={84} />
            {busy === 'photo' && (
              <View style={[styles.photoBusy, { backgroundColor: colors.scrim }]}>
                <ActivityIndicator color="#ffffff" />
              </View>
            )}
          </View>
          <View style={styles.photoActions}>
            <Pressable onPress={() => void pickPhoto()} disabled={!!busy} accessibilityRole="button">
              <Text style={[styles.link, { color: colors.primary }]}>{t('profile.changePhoto')}</Text>
            </Pressable>
            {!!account?.avatarVersion && (
              <Pressable
                onPress={() => void run('photo', () => api.removeAvatar())}
                disabled={!!busy}
                accessibilityRole="button"
              >
                <Text style={[styles.link, { color: colors.danger }]}>{t('profile.removePhoto')}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.field, divider]}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('profile.name')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={shownName}
              onChangeText={setName}
              onSubmitEditing={() => void saveName()}
              placeholder={t('profile.namePlaceholder')}
              placeholderTextColor={colors.textSubtle}
              maxLength={50}
              returnKeyType="done"
              style={[styles.input, { color: colors.text }]}
            />
            {busy === 'name' ? (
              <ActivityIndicator color={colors.primary} />
            ) : name !== null ? (
              <Pressable onPress={() => void saveName()} accessibilityRole="button" hitSlop={8}>
                <Text style={[styles.link, { color: colors.primary }]}>{t('profile.save')}</Text>
              </Pressable>
            ) : saved ? (
              <Text style={[styles.saved, { color: colors.textMuted }]}>{t('profile.saved')}</Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.field, divider]}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('profile.phone')}</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {account?.phone ? formatPhone(account.phone, account.countryCode) : '—'}
          </Text>
        </View>
        <View style={[styles.field, divider]}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('profile.address')}</Text>
          <Text style={[styles.value, { color: colors.text }]} selectable>
            {account?.address ?? '—'}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings.aliases')}</Text>
      <View style={card}>
        {account?.aliases.length ? (
          account.aliases.map((address, i) => (
            <View key={address} style={[styles.option, i > 0 && divider]}>
              <Icon name="mail" size={19} color={colors.textMuted} />
              <Text style={[styles.optionLabel, { color: colors.text }]} selectable numberOfLines={1}>
                {address}
              </Text>
              <Pressable
                onPress={() => removeAlias(address)}
                disabled={!!busy}
                accessibilityRole="button"
                accessibilityLabel={t('aliases.remove', { address })}
                hitSlop={8}
              >
                <Icon name="close" size={19} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.option}>
            <Text style={[styles.optionLabel, { color: colors.textMuted }]}>{t('aliases.empty')}</Text>
          </View>
        )}
        <View style={[styles.option, divider]}>
          <TextInput
            value={alias}
            onChangeText={(v) => {
              setAlias(v.replace(/\s/g, '').toLowerCase())
              setAliasError(null)
            }}
            onSubmitEditing={() => void addAlias()}
            placeholder={t('aliases.placeholder')}
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
            style={[styles.aliasInput, { color: colors.text }]}
          />
          <Text style={[styles.domain, { color: colors.textMuted }]}>
            @{account?.address.split('@')[1] ?? ''}
          </Text>
          {busy === 'alias' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Pressable onPress={() => void addAlias()} disabled={!alias.trim()} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.link, { color: alias.trim() ? colors.primary : colors.textSubtle }]}>
                {t('aliases.add')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      <Text style={[styles.hint, { color: aliasError ? colors.danger : colors.textSubtle }]}>
        {aliasError ?? t('aliases.hint')}
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings.language')}</Text>
      <View style={card}>
        {LANGUAGES.map((l, i) => {
          const selected = language === l.code
          return (
            <Pressable
              key={l.code}
              onPress={() => setLanguage(l.code)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={l.english}
              style={({ pressed }) => [
                styles.option,
                i > 0 && divider,
                pressed && { backgroundColor: colors.surfaceHover },
              ]}
            >
              <Icon name="type" size={19} color={colors.textMuted} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>{l.name}</Text>
              {selected && <Icon name="check" size={19} color={colors.primary} />}
            </Pressable>
          )
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings.appearance')}</Text>
      <View style={card}>
        {THEME_OPTIONS.map((option, i) => {
          const selected = preference === option.id
          return (
            <Pressable
              key={option.id}
              onPress={() => setPreference(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={({ pressed }) => [
                styles.option,
                i > 0 && divider,
                pressed && { backgroundColor: colors.surfaceHover },
              ]}
            >
              <Icon name={option.icon} size={19} color={colors.textMuted} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>{t(option.label)}</Text>
              {selected && <Icon name="check" size={19} color={colors.primary} />}
            </Pressable>
          )
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings.server')}</Text>
      <View style={card}>
        <View style={styles.option}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>{t('settings.backend')}</Text>
          <Text style={[styles.value, { color: colors.textMuted }]} selectable>
            {API_URL}
          </Text>
        </View>
      </View>
      <Text style={[styles.hint, { color: colors.textSubtle }]}>{t('settings.serverHint')}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  sectionTitle: {
    fontSize: font.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  photoBusy: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: { gap: spacing.md },
  field: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  fieldLabel: { fontSize: font.caption, fontWeight: '600', marginBottom: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: { flex: 1, fontSize: font.body + 1, paddingVertical: spacing.xs },
  saved: { fontSize: font.small },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
  },
  optionLabel: { flex: 1, fontSize: font.body },
  aliasInput: { flex: 1, fontSize: font.body, paddingVertical: spacing.sm, minWidth: 0 },
  domain: { fontSize: font.body },
  link: { fontSize: font.body, fontWeight: '600' },
  value: { fontSize: font.body },
  hint: { fontSize: font.caption, marginLeft: spacing.xs },
})
