import { FILE_BADGE, fileColor, fileKind } from '@shared/mail'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { Text } from './Text'

/** Colored document tile (red "PDF", green "XLS", …) from the designs. */
export function FileBadge({
  filename,
  contentType,
  size = 44,
}: {
  filename: string | null
  contentType: string
  size?: number
}) {
  const { colors } = useTheme()
  const kind = fileKind(filename, contentType)
  return (
    <View
      style={[
        styles.badge,
        { width: size * 0.84, height: size, backgroundColor: fileColor(kind) },
      ]}
    >
      <Text style={[styles.label, { color: colors.onPrimary, fontSize: size * 0.27 }]}>
        {FILE_BADGE[kind]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '700' },
})
