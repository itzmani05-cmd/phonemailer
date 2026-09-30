import {
  inView,
  matchesQuery,
  viewCounts,
  viewTitle,
  type Mail,
  type MailCategory,
  type MailChanges,
  type MailView,
} from '@shared/mail'
import { useEffect, useMemo, useState } from 'react'
import { Compose } from './components/Compose'
import { Icon } from './components/Icon'
import { MailList, PAGE_SIZE } from './components/MailList'
import { MailReader } from './components/MailReader'
import { Settings } from './components/Settings'
import { Sidebar } from './components/Sidebar'
import { TopBar, type SearchFilters } from './components/TopBar'
import { useMailbox } from './hooks/useMailbox'
import { EMPTY_DRAFT, replyDraft, type ComposeDraft, type ReplyMode } from './lib/reply'
import { useThemePreference } from './theme/useThemePreference'

const NO_FILTERS: SearchFilters = { unread: false, starred: false, attachments: false }

const EMPTY_TEXT: Partial<Record<MailView, string>> = {
  inbox: 'Your inbox is empty. New mail sent to your PhoneMail address shows up here.',
  starred: 'No starred messages. Star messages to find them here quickly.',
  snoozed: 'Nothing snoozed. Snooze a message to hide it until later.',
  sent: 'No sent messages yet.',
  drafts: 'You don’t have any drafts.',
  spam: 'No spam here. Hooray!',
  trash: 'Trash is empty.',
}

type BulkAction = 'archive' | 'trash' | 'read' | 'unread' | 'restore' | 'delete'

const BULK_CHANGES: Record<Exclude<BulkAction, 'delete'>, MailChanges> = {
  archive: { folder: 'archive' },
  trash: { folder: 'trash' },
  restore: { folder: 'inbox' },
  read: { read: true },
  unread: { read: false },
}

const App = () => {
  const box = useMailbox()
  const [theme, setTheme] = useThemePreference()
  const [view, setView] = useState<MailView>('inbox')
  const [category, setCategory] = useState<MailCategory>('primary')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>(NO_FILTERS)
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [compose, setCompose] = useState<ComposeDraft | null>(null)
  const [composeKey, setComposeKey] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [screen, setScreen] = useState<'mail' | 'settings'>('mail')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const searching = query.trim().length > 0 || Object.values(filters).some(Boolean)
  const showTabs = view === 'inbox' && !searching

  const visible = useMemo(() => {
    return box.mails.filter((m) => {
      if (searching) {
        if (m.folder === 'trash' || m.folder === 'spam') return false
        if (!matchesQuery(m, query)) return false
      } else {
        if (!inView(m, view, now)) return false
        if (showTabs && m.category !== category) return false
      }
      if (filters.unread && m.read) return false
      if (filters.starred && !m.starred) return false
      if (filters.attachments && m.attachments.length === 0) return false
      return true
    })
  }, [box.mails, view, now, searching, query, filters, showTabs, category])

  const pageMails = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const counts = useMemo(() => viewCounts(box.mails, now), [box.mails, now])
  const selected = box.mails.find((m) => m.id === selectedId) ?? null
  const storageUsed = useMemo(() => box.mails.reduce((s, m) => s + m.size, 0), [box.mails])
  const notifications = useMemo(
    () => box.mails.filter((m) => !m.read && inView(m, 'inbox', now)),
    [box.mails, now],
  )

  const resetList = () => {
    setPage(0)
    setChecked(new Set())
    setSelectedId(null)
  }

  const changeView = (v: MailView) => {
    setView(v)
    setQuery('')
    setFilters(NO_FILTERS)
    resetList()
    setMenuOpen(false)
    setScreen('mail')
  }

  const open = (mail: Mail) => {
    setSelectedId(mail.id)
    if (!mail.read) void box.update(mail.id, { read: true })
  }

  const updateSelected = (changes: MailChanges) => {
    if (!selected) return
    void box.update(selected.id, changes)
    const leaves =
      changes.folder !== undefined || changes.snoozedUntil !== undefined || changes.read === false
    if (leaves) setSelectedId(null)
  }

  const openCompose = (draft: ComposeDraft) => {
    setCompose(draft)
    setComposeKey((k) => k + 1)
  }

  const bulk = (action: BulkAction) => {
    const ids = [...checked]
    if (action === 'delete') void box.removeMany(ids)
    else void box.updateMany(ids, BULK_CHANGES[action])
    setChecked(new Set())
    if (selectedId && ids.includes(selectedId) && action !== 'read') setSelectedId(null)
  }

  const emptyText = searching
    ? 'No messages match your search.'
    : (EMPTY_TEXT[view] ?? `No messages labeled “${viewTitle(view)}”.`)

  return (
    <div className="app" data-view={selected ? 'reader' : 'list'} data-menu={menuOpen || undefined}>
      <Sidebar
        view={view}
        onViewChange={changeView}
        counts={counts}
        storageUsed={storageUsed}
        storageQuota={box.account?.storageQuotaBytes ?? 0}
        onCompose={() => {
          openCompose(EMPTY_DRAFT)
          setMenuOpen(false)
        }}
      />
      <div className="scrim" onClick={() => setMenuOpen(false)} />

      <div className="main">
        <TopBar
          query={query}
          onQueryChange={(q) => {
            setQuery(q)
            resetList()
          }}
          account={box.account}
          notifications={notifications}
          onOpenMail={(m) => {
            changeView('inbox')
            setCategory(m.category)
            open(m)
          }}
          onOpenSettings={() => setScreen('settings')}
          onMenu={() => setMenuOpen(true)}
        />

        {screen === 'settings' ? (
          <div className="content content-settings">
            <Settings
              account={box.account}
              onAccountChange={box.setAccount}
              theme={theme}
              onThemeChange={setTheme}
              onClose={() => setScreen('mail')}
            />
          </div>
        ) : (
          <div className="content">
            <MailList
              view={view}
              showTabs={showTabs}
              category={category}
              onCategoryChange={(c) => {
                setCategory(c)
                resetList()
              }}
              mails={pageMails}
              total={visible.length}
              page={page}
              onPageChange={(p) => {
                setPage(p)
                setChecked(new Set())
              }}
              selectedId={selectedId}
              checked={checked}
              onCheckedChange={setChecked}
              loading={box.loading}
              error={box.error}
              emptyText={emptyText}
              onOpen={open}
              onRefresh={() => void box.refresh()}
              onBulk={bulk}
              onMarkAllRead={() =>
                void box.updateMany(
                  visible.filter((m) => !m.read).map((m) => m.id),
                  { read: true },
                )
              }
            />
            <MailReader
              key={selected?.id}
              mail={selected}
              account={box.account}
              labels={box.labels}
              onBack={() => setSelectedId(null)}
              onUpdate={updateSelected}
              onDeleteForever={() => {
                if (!selected) return
                void box.removeMany([selected.id])
                setSelectedId(null)
              }}
              onReply={(mode: ReplyMode) => {
                if (selected) openCompose(replyDraft(selected, mode, box.account?.address))
              }}
            />
          </div>
        )}
      </div>

      {!compose && screen === 'mail' && (
        <button className="compose-fab" onClick={() => openCompose(EMPTY_DRAFT)}>
          <Icon name="pencil" size={18} />
          <span>Compose</span>
        </button>
      )}

      {compose && (
        <Compose key={composeKey} draft={compose} onClose={() => setCompose(null)} onSend={box.send} />
      )}
    </div>
  )
}

export default App
