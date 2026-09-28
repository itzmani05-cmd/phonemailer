import { conversations, formatPhone, matchesQuery } from '@shared/mail'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AccountAvatar, Avatar } from '@/components/Avatar'
import { Chips } from '@/components/Chips'
import { ConversationRow } from '@/components/ConversationRow'
import { useDrawer } from '@/components/Drawer'
import { EmptyState, ErrorBanner } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { SearchBar } from '@/components/SearchBar'
import { Text } from '@/components/Text'
import { isFavorite } from '@/data/favorites'
import { identityAddress, parseIdentity } from '@/data/identity'
import { useMail } from '@/data/MailProvider'
import { useT } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, spacing } from '@/theme/metrics'

type Filter = 'all' | 'unread' | 'attachments' | 'favorites'

export default function ChatsScreen() {
  const { colors } = useTheme()
  const drawer = useDrawer()
  const t = useT()
  const { mails, account, loading, refreshing, error, refresh } = useMail()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filterOptions = useMemo(
    () => [
      { id: 'all' as Filter, label: t('home.all') },
      { id: 'unread' as Filter, label: t('home.unread') },
      { id: 'attachments' as Filter, label: t('home.attachments') },
      { id: 'favorites' as Filter, label: t('home.favorites') },
    ],
    [t],
  )

  const all = useMemo(() => conversations(mails), [mails])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((c) => {
      if (filter === 'unread' && c.unread === 0) return false
      if (filter === 'attachments' && !c.messages.some((m) => m.attachments.length > 0)) return false
      if (filter === 'favorites' && !isFavorite(c)) return false
      if (!q) return true
      return (
        c.person.name.toLowerCase().includes(q) ||
        c.person.address.includes(q) ||
        c.messages.some((m) => matchesQuery(m, q))
      )
    })
  }, [all, query, filter])

  const newChat = useMemo(() => {
    const identity = parseIdentity(query)
    if (!identity) return null
    const address = identityAddress(identity.phone)
    if (address === account?.address || all.some((c) => c.person.address === address)) return null
    return { address, phone: identity.phone }
  }, [query, all, account])

  const open = useCallback((address: string) => {
    router.push({ pathname: '/conversation/[address]', params: { address } })
  }, [])

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Pressable
          onPress={drawer.open}
          accessibilityRole="button"
          accessibilityLabel={t('home.openMenu')}
          hitSlop={8}
          style={styles.headerButton}
        >
          <Icon name="menu" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>PhoneMail</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('home.profile')}
          hitSlop={8}
        >
          <AccountAvatar size={36} />
        </Pressable>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder={t('home.search')} />
      <View style={styles.chips}>
        <Chips options={filterOptions} value={filter} onChange={setFilter} />
      </View>

      {error && <ErrorBanner message={error} />}

      <FlatList
        data={visible}
        keyExtractor={(c) => c.person.address}
        renderItem={({ item }) => <ConversationRow conversation={item} onPress={(c) => open(c.person.address)} />}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          newChat ? (
            <Pressable
              onPress={() => open(newChat.address)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.newChat, pressed && { backgroundColor: colors.surfaceHover }]}
            >
              <Avatar name={newChat.phone} size={48} />
              <View style={styles.newChatText}>
                <Text style={[styles.newChatTitle, { color: colors.text }]}>
                  {t('home.startChat', { who: formatPhone(newChat.phone, '91') })}
                </Text>
                <Text style={[styles.newChatAddress, { color: colors.textMuted }]}>{newChat.address}</Text>
              </View>
              <Icon name="chat" size={22} color={colors.primary} />
            </Pressable>
          ) : null
        }
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
          newChat ? null : loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : query || filter !== 'all' ? (
            <EmptyState icon="search" title={t('home.noMatches')} body={t('home.noMatchesBody')} />
          ) : (
            <EmptyState
              icon="chatLines"
              title={t('home.emptyTitle')}
              body={t('home.emptyBody', { address: account?.address ?? 'PhoneMail' })}
            />
          )
        }
      />

      <Pressable
        onPress={() => router.push('/compose')}
        accessibilityRole="button"
        accessibilityLabel={t('home.newEmail')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: pressed ? colors.primaryHover : colors.primary, shadowColor: colors.text },
        ]}
      >
        <Icon name="pencil" size={24} color={colors.onPrimary} />
      </Pressable>
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
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  chips: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { paddingBottom: 96 },
  loading: { marginTop: 48 },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  newChatText: { flex: 1, minWidth: 0 },
  newChatTitle: { fontSize: font.body + 1, fontWeight: '600' },
  newChatAddress: { fontSize: font.small, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
})
