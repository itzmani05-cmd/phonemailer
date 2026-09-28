import { formatPhone, viewCounts, type MailView } from '@shared/mail'
import { labelColors, type LabelColor } from '@shared/theme'
import { router, type Href } from 'expo-router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/data/auth'
import { useMail } from '@/data/MailProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'
import { Avatar } from './Avatar'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

interface DrawerContextValue {
  open: () => void
  close: () => void
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

export function useDrawer() {
  const ctx = useContext(DrawerContext)
  if (!ctx) throw new Error('useDrawer must be used inside <DrawerProvider>')
  return ctx
}

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  const open = useCallback(() => setVisible(true), [])
  const close = useCallback(() => setVisible(false), [])
  const value = useMemo(() => ({ open, close }), [open, close])
  return (
    <DrawerContext.Provider value={value}>
      {children}
      <DrawerPanel visible={visible} onClose={close} />
    </DrawerContext.Provider>
  )
}

interface ItemProps {
  icon: IconName
  label: string
  active?: boolean
  badge?: number
  badgeTone?: 'primary' | 'muted'
  trailing?: ReactNode
  leading?: ReactNode
  onPress: () => void
}

function DrawerItem({ icon, label, active, badge, badgeTone = 'muted', trailing, leading, onPress }: ItemProps) {
  const { colors } = useTheme()
  const fg = active ? colors.primary : colors.text
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        active && { backgroundColor: colors.surfaceSelected },
        pressed && !active && { backgroundColor: colors.surfaceHover },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={styles.itemIcon}>{leading ?? <Icon name={icon} size={22} color={fg} />}</View>
      <Text style={[styles.itemLabel, { color: fg }, active && styles.itemLabelActive]}>{label}</Text>
      {!!badge && (
        <View
          style={[
            styles.badge,
            { backgroundColor: badgeTone === 'primary' ? colors.primarySoft : colors.surfaceSunken },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: badgeTone === 'primary' ? colors.primary : colors.textMuted },
            ]}
          >
            {badge}
          </Text>
        </View>
      )}
      {trailing}
    </Pressable>
  )
}

const FOLDERS: { view: MailView; label: string; icon: IconName }[] = [
  { view: 'starred', label: 'Starred', icon: 'star' },
  { view: 'sent', label: 'Sent', icon: 'send' },
  { view: 'drafts', label: 'Drafts', icon: 'file' },
  { view: 'spam', label: 'Spam', icon: 'shield' },
  { view: 'trash', label: 'Trash', icon: 'trash' },
]

export function MenuList({ onNavigate, showInbox = true }: { onNavigate?: () => void; showInbox?: boolean }) {
  const { colors } = useTheme()
  const { mails, labels } = useMail()
  const { signOut } = useAuth()

  const confirmSignOut = () => {
    const title = 'Sign out?'
    const message = 'You can sign back in with a code sent to your number.'
    const leave = () => {
      onNavigate?.()
      void signOut()
    }
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) leave()
      return
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: leave },
    ])
  }
  const [labelsOpen, setLabelsOpen] = useState(false)
  const counts = useMemo(() => viewCounts(mails), [mails])

  const go = (href: Href) => {
    onNavigate?.()
    router.navigate(href)
  }

  return (
    <>
      {showInbox && (
        <DrawerItem
          icon="inbox"
          label="Inbox"
          active
          badge={counts.inbox}
          badgeTone="primary"
          onPress={() => go('/')}
        />
      )}
      {FOLDERS.map((f) => (
        <DrawerItem
          key={f.view}
          icon={f.icon}
          label={f.label}
          badge={f.view === 'drafts' ? counts.drafts : f.view === 'spam' ? counts.spam : 0}
          onPress={() => go({ pathname: '/folder/[view]', params: { view: f.view } })}
        />
      ))}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <DrawerItem icon="users" label="Contacts" onPress={() => go('/contacts')} />
      <DrawerItem
        icon="label"
        label="Labels"
        onPress={() => setLabelsOpen((o) => !o)}
        trailing={
          <Icon name={labelsOpen ? 'chevronDown' : 'chevronRight'} size={20} color={colors.textSubtle} />
        }
      />
      {labelsOpen &&
        labels.map((l) => (
          <DrawerItem
            key={l.name}
            icon="label"
            label={l.name}
            leading={
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: labelColors[l.color as LabelColor] ?? l.color },
                ]}
              />
            }
            onPress={() =>
              go({ pathname: '/folder/[view]', params: { view: `label:${l.name}` } })
            }
          />
        ))}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <DrawerItem icon="settings" label="Settings" onPress={() => go('/settings')} />
      <DrawerItem icon="help" label="Help & Support" onPress={() => go('/help')} />
      <DrawerItem icon="logout" label="Sign out" onPress={confirmSignOut} />
    </>
  )
}

function DrawerPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme()
  const { account } = useMail()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const panelWidth = Math.min(320, width * 0.82)
  const [progress] = useState(() => new Animated.Value(0))
  const [mounted, setMounted] = useState(visible)
  if (visible && !mounted) setMounted(true)

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false)
    })
  }, [visible, progress])

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
          accessibilityLabel="Close menu"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.panel,
          {
            width: panelWidth,
            backgroundColor: colors.surface,
            paddingTop: insets.top + spacing.xl,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-panelWidth, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
          <View style={styles.profile}>
            <Avatar name={account?.name ?? '?'} size={64} tone="primary" />
            <View style={styles.profileText}>
              <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
                {account?.name ?? ''}
              </Text>
              {!!account?.phone && (
                <Text style={[styles.profileMeta, { color: colors.textMuted }]}>
                  {formatPhone(account.phone, account.countryCode)}
                </Text>
              )}
              {!!account && (
                <Text style={[styles.profileMeta, { color: colors.textMuted }]} numberOfLines={1}>
                  {account.address}
                </Text>
              )}
            </View>
          </View>
          <MenuList onNavigate={onClose} />
        </ScrollView>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: spacing.md,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
  },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontSize: font.title + 1, fontWeight: '600', marginBottom: 2 },
  profileMeta: { fontSize: font.small },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    height: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  itemIcon: { width: 24, alignItems: 'center' },
  itemLabel: { flex: 1, fontSize: font.body + 1 },
  itemLabelActive: { fontWeight: '500' },
  badge: { minWidth: 30, height: 26, paddingHorizontal: 8, borderRadius: 13, justifyContent: 'center' },
  badgeText: { fontSize: font.small, fontWeight: '600', textAlign: 'center' },
  swatch: { width: 16, height: 16, borderRadius: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md, marginHorizontal: spacing.sm },
})
