import { Tabs } from 'expo-router'
import { TabBar } from '@/components/TabBar'
import { useTheme } from '@/theme/ThemeProvider'

export default function TabsLayout() {
  const { colors } = useTheme()
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.surface } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="contacts" />
      <Tabs.Screen name="compose-tab" />
      <Tabs.Screen name="attachments" />
      <Tabs.Screen name="more" />
    </Tabs>
  )
}
