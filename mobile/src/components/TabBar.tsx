import type { BottomTabBarProps } from 'expo-router/tabs'
import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { spacing } from '@/theme/metrics'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Chats', icon: 'chatLines' },
  contacts: { label: 'Contacts', icon: 'users' },
  'compose-tab': { label: 'Compose', icon: 'plus' },
  attachments: { label: 'Attachments', icon: 'fileText' },
  more: { label: 'More', icon: 'moreCircle' },
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme()
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

        if (route.name === 'compose-tab') {
          return (
            <Pressable
              key={route.key}
              style={styles.tab}
              onPress={() => router.push('/compose')}
              accessibilityRole="button"
              accessibilityLabel="Compose"
            >
              <View style={[styles.fab, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                <Icon name="plus" size={28} color={colors.onPrimary} strokeWidth={2.4} />
              </View>
              <Text style={[styles.label, styles.fabLabel, { color: colors.text }]}>Compose</Text>
            </Pressable>
          )
        }

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
            <Text style={[styles.label, { color }, focused && styles.labelActive]}>{tab.label}</Text>
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
  fab: {
    width: 58,
    height: 58,
    marginTop: -30,
    borderRadius: 29,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLabel: { fontWeight: '500' },
})
