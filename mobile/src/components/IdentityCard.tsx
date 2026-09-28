import { formatPhone } from '@shared/mail'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { identityAddress, identityLink } from '@/data/identity'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'
import { Avatar } from './Avatar'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

interface Props {
  phone: string
  name?: string
  countryCode?: string
  children?: ReactNode
}

export function IdentityCard({ phone, name, countryCode = '91', children }: Props) {
  const { colors } = useTheme()
  const display = name && name !== phone ? name : formatPhone(phone, countryCode)

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.band, { backgroundColor: colors.primary }]}>
        <Text style={[styles.brand, { color: colors.onPrimary }]}>PhoneMail ID</Text>
      </View>
      <View style={[styles.avatarRing, { backgroundColor: colors.surface }]}>
        <Avatar name={display} size={76} tone="primary" />
      </View>

      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {display}
      </Text>
      <Text style={[styles.phone, { color: colors.textMuted }]}>{formatPhone(phone, countryCode)}</Text>
      <View style={[styles.addressPill, { backgroundColor: colors.surfaceSelected }]}>
        <Icon name="mail" size={15} color={colors.primary} />
        <Text style={[styles.address, { color: colors.primary }]} numberOfLines={1}>
          {identityAddress(phone)}
        </Text>
      </View>

      <View style={styles.qr} accessibilityLabel={`QR code for ${identityAddress(phone)}`}>
        <QRCode value={identityLink({ phone, name })} size={188} color="#111111" backgroundColor="#ffffff" />
      </View>
      <Text style={[styles.hint, { color: colors.textMuted }]}>Scan to email me on PhoneMail</Text>

      {!!children && <View style={styles.actions}>{children}</View>}
    </View>
  )
}

export function CardAction({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: IconName
  label: string
  onPress: () => void
  primary?: boolean
}) {
  const { colors } = useTheme()
  const fg = primary ? colors.onPrimary : colors.primary
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        primary
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.surfaceSelected },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Icon name={icon} size={18} color={fg} />
      <Text style={[styles.actionLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md + 8,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  band: { alignSelf: 'stretch', height: 84, alignItems: 'center', paddingTop: spacing.md },
  brand: { fontSize: font.small, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.9 },
  avatarRing: { marginTop: -44, padding: 4, borderRadius: radius.full },
  name: { fontSize: font.headline, fontWeight: '700', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
  phone: { fontSize: font.body, marginTop: 2, letterSpacing: 0.5 },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    maxWidth: '90%',
  },
  address: { fontSize: font.small, fontWeight: '600', flexShrink: 1 },
  qr: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: '#ffffff', borderRadius: radius.md },
  hint: { fontSize: font.caption, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  actionLabel: { fontSize: font.body, fontWeight: '600' },
})
