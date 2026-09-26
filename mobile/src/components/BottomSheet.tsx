import type { ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export interface SheetOption {
  label: string
  icon?: IconName
  /** Custom leading element (e.g. a colored brand glyph). */
  leading?: ReactNode
  danger?: boolean
  checked?: boolean
  onPress: () => void
}

interface Props {
  visible: boolean
  title?: string
  options: SheetOption[]
  onClose: () => void
}

/** "Add attachment"-style action sheet from the design (screen 8). */
export function BottomSheet({ visible, title, options, onClose }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.scrim, { backgroundColor: colors.scrim }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
      >
        {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
        {options.map((o, i) => (
          <Pressable
            key={o.label}
            onPress={() => {
              onClose()
              o.onPress()
            }}
            style={({ pressed }) => [
              styles.row,
              i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
              pressed && { backgroundColor: colors.surfaceHover },
            ]}
            accessibilityRole="button"
          >
            <View style={styles.leading}>
              {o.leading ??
                (o.icon && (
                  <Icon name={o.icon} size={24} color={o.danger ? colors.danger : colors.primary} />
                ))}
            </View>
            <Text
              style={[styles.label, { color: o.danger ? colors.danger : colors.text }]}
              numberOfLines={1}
            >
              {o.label}
            </Text>
            {o.checked && <Icon name="check" size={20} color={colors.primary} />}
          </Pressable>
        ))}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.cancel,
            { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceHover : colors.surface },
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  title: { fontSize: font.title, fontWeight: '600', textAlign: 'center', marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
  },
  leading: { width: 32, alignItems: 'center' },
  label: { flex: 1, fontSize: font.body + 1 },
  cancel: {
    marginTop: spacing.lg,
    height: 50,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: font.body + 1, fontWeight: '600' },
})
