import { contacts, type Contact } from '@shared/mail'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, SectionList, Share, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { SearchBar } from '@/components/SearchBar'
import { Text } from '@/components/Text'
import { useMail } from '@/data/MailProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, spacing } from '@/theme/metrics'

const FREQUENT = 4

function toVCard(list: Contact[]) {
  return list
    .map((c) => `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\nEMAIL:${c.address}\nEND:VCARD`)
    .join('\n')
}

export default function ContactsScreen() {
  const { colors } = useTheme()
  const { mails } = useMail()
  const [query, setQuery] = useState('')

  const all = useMemo(() => contacts(mails), [mails])

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matching = all.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.address.includes(q),
    )
    const out: { title: string; kind: 'heading' | 'letter'; data: Contact[] }[] = []
    if (!q && matching.length > FREQUENT) {
      const frequent = [...matching].sort((a, b) => b.count - a.count).slice(0, FREQUENT)
      out.push({ title: 'Frequently contacted', kind: 'heading', data: frequent })
    }
    const sorted = [...matching].sort((a, b) => a.name.localeCompare(b.name))
    let first = true
    for (const c of sorted) {
      const letter = (c.name[0] ?? '#').toUpperCase()
      const last = out[out.length - 1]
      if (last?.kind === 'letter' && last.title.endsWith(letter)) last.data.push(c)
      else {
        out.push({ title: first && !q && out.length ? `All contacts\n${letter}` : letter, kind: 'letter', data: [c] })
        first = false
      }
    }
    return out
  }, [all, query])

  const open = (c: Contact) =>
    router.push({ pathname: '/conversation/[address]', params: { address: c.address } })

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Contacts</Text>
        <Pressable
          onPress={() => void Share.share({ title: 'PhoneMail contacts', message: toVCard(all) })}
          hitSlop={10}
          accessibilityLabel="Export contacts"
          disabled={all.length === 0}
        >
          <Icon name="download" size={24} color={colors.text} />
        </Pressable>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search contacts..." />

      <SectionList
        sections={sections}
        keyExtractor={(c, i) => `${c.address}-${i}`}
        stickySectionHeadersEnabled={false}
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => {
          const [heading, letter] = section.title.includes('\n')
            ? section.title.split('\n')
            : section.kind === 'heading'
              ? [section.title, '']
              : ['', section.title]
          return (
            <View style={styles.sectionHeader}>
              {!!heading && (
                <Text style={[styles.heading, { color: colors.textMuted }]}>{heading}</Text>
              )}
              {!!letter && <Text style={[styles.letter, { color: colors.text }]}>{letter}</Text>}
            </View>
          )
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => open(item)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceHover }]}
            accessibilityRole="button"
          >
            <Avatar name={item.name} size={48} />
            <View style={[styles.rowText, { borderBottomColor: colors.border }]}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.address, { color: colors.textMuted }]} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          query ? (
            <EmptyState icon="search" title="No matches" body={`No contacts match “${query}”.`} />
          ) : (
            <EmptyState
              icon="users"
              title="No contacts yet"
              body="People you email with appear here automatically."
            />
          )
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg + 2,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  list: { paddingBottom: spacing.xl },
  sectionHeader: { paddingHorizontal: spacing.lg + 2, paddingTop: spacing.lg, paddingBottom: spacing.xs },
  heading: { fontSize: font.body - 1, fontWeight: '500' },
  letter: { fontSize: font.body, fontWeight: '500', marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingLeft: spacing.lg + 2 },
  rowText: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: font.body + 1, fontWeight: '500' },
  address: { fontSize: font.small + 1, marginTop: 2 },
})
