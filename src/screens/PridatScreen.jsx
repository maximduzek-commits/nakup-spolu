import { useState, useMemo, useRef } from 'react'
import { useMasterItems, useCurrentList } from '../hooks/useFirestore'
import { addItemToList, removeItemFromList, addMasterItem, updateListItem, deleteMasterItem } from '../firebase/firestore'
import { CATEGORIES } from '../data/seedData'
import SyncBadge from '../components/SyncBadge'

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  )
}

function MasterItem({ item, inList, qty, onToggle, onQty, editMode, onDelete }) {
  return (
    <div className={`master-item${inList ? ' in-list' : ''}${editMode ? ' edit-mode' : ''}`} onClick={!editMode ? onToggle : undefined}>
      {editMode && (
        <button className="master-delete-btn" onClick={e => { e.stopPropagation(); onDelete() }}>
          <TrashIcon />
        </button>
      )}
      <span className="master-item-name">{item.name}</span>
      {!editMode && !inList && <div className="master-item-icon add">+</div>}
      {!editMode && inList && (
        <div className="master-qty" onClick={e => e.stopPropagation()}>
          <button className="master-qty-btn" onClick={() => onQty(-1)}>−</button>
          <span className="master-qty-num">{qty}</span>
          <button className="master-qty-btn" onClick={() => onQty(1)}>+</button>
        </div>
      )}
    </div>
  )
}

export default function PridatScreen({ syncStatus, setSyncStatus }) {
  const { items: masterItems } = useMasterItems()
  const { items: listItems } = useCurrentList()
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const searchRef = useRef(null)

  const listMap = useMemo(() => {
    const m = {}
    listItems.forEach(i => { m[i.name] = i })
    return m
  }, [listItems])

  async function handleToggle(masterItem) {
    setError('')
    try {
      setSyncStatus('syncing')
      if (listMap[masterItem.name]) {
        await removeItemFromList(listMap[masterItem.name].id)
      } else {
        await addItemToList({ id: masterItem.id, name: masterItem.name, category: masterItem.category, qty: 1 })
      }
      setSyncStatus('online')
    } catch (e) {
      setSyncStatus('offline')
      setError('Chyba při ukládání: ' + e.message)
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Smazat „${item.name}" z katalogu?`)) return
    try {
      await deleteMasterItem(item.id)
      await removeItemFromList(listMap[item.name]?.id)
    } catch (e) {
      setError('Chyba při mazání: ' + e.message)
    }
  }

  async function handleQty(masterItem, delta) {
    const listItem = listMap[masterItem.name]
    if (!listItem) return
    const newQty = Math.max(1, (listItem.qty ?? 1) + delta)
    try {
      setSyncStatus('syncing')
      await updateListItem(listItem.id, { qty: newQty })
      setSyncStatus('online')
    } catch (e) {
      setSyncStatus('offline')
    }
  }

  async function handleAddCustom() {
    const name = search.trim()
    if (!name) {
      // focus search so user can type
      searchRef.current?.focus()
      return
    }
    setError('')
    try {
      setSyncStatus('syncing')
      const ref = await addMasterItem({ name, category: 'Trvanlivé potraviny' })
      await addItemToList({ id: ref.id, name, category: 'Trvanlivé potraviny', qty: 1 })
      setSearch('')
      setSyncStatus('online')
    } catch (e) {
      setSyncStatus('offline')
      setError('Chyba při ukládání: ' + e.message)
    }
  }

  const filtered = search.trim()
    ? masterItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : masterItems

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: filtered.filter(i => i.category === cat.name),
  })).filter(g => g.items.length > 0)

  const showAddCustom = search.trim() && !masterItems.find(i => i.name.toLowerCase() === search.toLowerCase())

  return (
    <div className="screen-wrap">
      <div className="app-header">
        <div className="header-row">
          <div className="app-title">Přidat položky</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setEditMode(e => !e)}
              style={{
                padding: '4px 12px', borderRadius: 20,
                border: '1.5px solid var(--border)',
                background: editMode ? '#FEF2F2' : 'var(--cream)',
                color: editMode ? '#DC2626' : 'var(--text-muted)',
                fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {editMode ? 'Hotovo' : 'Upravit'}
            </button>
            <SyncBadge status={syncStatus} />
          </div>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: 17, height: 17, color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Hledat nebo přidat položku…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && showAddCustom && handleAddCustom()}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: '0 2px' }}>×</button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ margin: '0 20px 8px', padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="scroll-area">
        {showAddCustom && (
          <div style={{ padding: '0 16px 12px' }}>
            <button className="custom-add-btn" onClick={handleAddCustom}>
              <div className="custom-add-icon">+</div>
              <span className="custom-add-text">Přidat „{search.trim()}" do seznamu</span>
            </button>
          </div>
        )}

        {!search.trim() && (
          <div className="custom-add-wrap">
            <button className="custom-add-btn" onClick={() => searchRef.current?.focus()}>
              <div className="custom-add-icon">+</div>
              <span className="custom-add-text">Napište název nové položky</span>
            </button>
          </div>
        )}

        {masterItems.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">⏳</span>
            <div className="empty-title">Načítám položky…</div>
            <div className="empty-sub">Při prvním spuštění může chvíli trvat</div>
          </div>
        )}

        {grouped.map(cat => (
          <div key={cat.name} className="category-section">
            <div className="category-header">
              <span className="cat-emoji">{cat.emoji}</span>
              <span className="cat-name">{cat.name}</span>
            </div>
            <div className="add-section-items">
              {cat.items.map(item => (
                <MasterItem
                  key={item.id}
                  item={item}
                  inList={!!listMap[item.name]}
                  qty={listMap[item.name]?.qty ?? 1}
                  onToggle={() => handleToggle(item)}
                  onQty={delta => handleQty(item, delta)}
                  editMode={editMode}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
