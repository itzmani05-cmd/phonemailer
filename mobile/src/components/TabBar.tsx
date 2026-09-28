import type { BottomTabBarProps } from 'expo-router/tabs'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useT } from '@/i18n/LanguageProvider'
import type { StringKey } from '@/i18n/strings'
import { useTheme } from '@/theme/ThemeProvider'
import { spacing } from '@/theme/metrics'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

const TABS: Record<string, { label: StringKey; icon: IconName }> = {
  index: { label: 'tabs.chats', icon: 'chatLines' },
  contacts: { label: 'tabs.contacts', icon: 'users' },
  attachments: { label: 'tabs.attachments', icon: 'fileText' },
  more: { label: 'tabs.more', icon: 'moreCircle' },
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme()
  const t = useT()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const tab = TABS[route.name]
        if (!tab) return null
        const focused = state.index === index

        const color = focused ? colors.primary : colors.textMuted
        return (
          <Pressable
            key={route.key}
            style={styles.tab}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
          >
            <Icon
              name={tab.icon}
              size={24}
              color={color}
              filled={focused && (route.name === 'index' || route.name === 'contacts')}
            />
            <Text style={[styles.label, { color }, focused && styles.labelActive]}>{t(tab.label)}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 11 },
  labelActive: { fontWeight: '600' },
})
