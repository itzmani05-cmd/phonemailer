import { conversations, matchesQuery, type Conversation } from '@shared/mail'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { Chips } from '@/components/Chips'
import { ConversationRow } from '@/components/ConversationRow'
import { useDrawer } from '@/components/Drawer'
import { EmptyState, ErrorBanner } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { SearchBar } from '@/components/SearchBar'
import { Text } from '@/components/Text'
import { useMail } from '@/data/MailProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { spacing } from '@/theme/metrics'

type Filter = 'all' | 'unread' | `label:${string}`

const LABEL_ORDER = ['Personal', 'Work']

export default function ChatsScreen() {
  const { colors } = useTheme()
  const drawer = useDrawer()
  const { mails, labels, account, loading, refreshing, error, refresh } = useMail()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filterOptions = useMemo(() => {
    const sorted = [...labels].sort(
      (a, b) =>
        (LABEL_ORDER.indexOf(a.name) + 1 || 99) - (LABEL_ORDER.indexOf(b.name) + 1 || 99),
    )
    return [
      { id: 'all' as Filter, label: 'All' },
      { id: 'unread' as Filter, label: 'Unread' },
      ...sorted.map((l) => ({ id: `label:${l.name}` as Filter, label: l.name })),
    ]
  }, [labels])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return conversations(mails).filter((c) => {
      if (filter === 'unread' && c.unread === 0) return false
      if (filter.startsWith('label:') && !c.messages.some((m) => m.labels.includes(filter.slice(6))))
        return false
      if (!q) return true
      return (
        c.person.name.toLowerCase().includes(q) ||
        c.person.address.includes(q) ||
        c.messages.some((m) => matchesQuery(m, q))
      )
    })
  }, [mails, query, filter])

  const open = useCallback((c: Conversation) => {
    router.push({ pathname: '/conversation/[address]', params: { address: c.person.address } })
  }, [])

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Pressable onPress={drawer.open} accessibilityLabel="Open menu" hitSlop={8}>
          <Avatar name={account?.name ?? '?'} size={40} tone="primary" />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>PhoneMail</Text>
        <Pressable
          onPress={() => router.push('/compose')}
          style={[styles.composeButton, { backgroundColor: colors.primary }]}
          accessibilityLabel="Compose"
        >
          <Icon name="pencil" size={20} color={colors.onPrimary} />
        </Pressable>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search conversations..." />
      <View style={styles.chips}>
        <Chips options={filterOptions} value={filter} onChange={setFilter} />
      </View>

      {error && <ErrorBanner message={error} />}

      <FlatList
        data={visible}
        keyExtractor={(c) => c.person.address}
        renderItem={({ item }) => <ConversationRow conversation={item} onPress={open} />}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : query || filter !== 'all' ? (
            <EmptyState icon="search" title="No matches" body="Try a different search or filter." />
          ) : (
            <EmptyState
              icon="chatLines"
              title="No conversations yet"
              body={`Emails sent to ${account?.address ?? 'your PhoneMail address'} show up here as chats.`}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  composeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chips: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  loading: { marginTop: 48 },
})
