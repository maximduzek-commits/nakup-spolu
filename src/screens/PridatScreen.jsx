import { useState, useMemo } from 'react'
import { useMasterItems, useCurrentList } from '../hooks/useFirestore'
import { addItemToList, removeItemFromList, addMasterItem, updateListItem } from '../firebase/firestore'
import { CATEGORIES } from '../data/seedData'
import SyncBadge from '../components/SyncBadge'

function MasterItem({ item, inList, qty, onToggle, onQty }) {
  return (
    <div className={`master-item${inList ? ' in-list' : ''}`} onClick={onToggle}>
      <span className="master-item-name">{item.name}</span>
      {!inList && <div className="master-item-icon add">+</div>}
      {inList && (
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

  const listMap = useMemo(() => {
    const m = {}
    listItems.forEach(i => { m[i.name] = i })
    return m
  }, [listItems])

  async function handleToggle(masterItem) {
    setSyncStatus('syncing')
    if (listMap[masterItem.name]) {
      await removeItemFromList(listMap[masterItem.name].id)
    } else {
      await addItemToList({ id: masterItem.id, name: masterItem.name, category: masterItem.category, qty: 1 })
    }
    setSyncStatus('online')
  }

  async function handleQty(masterItem, delta) {
    const listItem = listMap[masterItem.name]
    if (!listItem) return
    const newQty = Math.max(1, (listItem.qty ?? 1) + delta)
    setSyncStatus('syncing')
    await updateListItem(listItem.id, { qty: newQty })
    setSyncStatus('online')
  }

  async function handleAddCustom() {
    if (!search.trim()) return
    const name = search.trim()
    const category = 'Trvanlivé potraviny'
    setSyncStatus('syncing')
    await addMasterItem({ name, category })
    await addItemToList({ id: crypto.randomUUID(), name, category, qty: 1 })
    setSearch('')
    setSyncStatus('online')
  }

  const filtered = search.trim()
    ? masterItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : masterItems

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: filtered.filter(i => i.category === cat.name),
  })).filter(g => g.items.length > 0)

  return (
    <div className="screen-wrap">
      <div className="app-header">
        <div className="header-row">
          <div className="app-title">Přidat položky</div>
          <SyncBadge status={syncStatus} />
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: 17, height: 17, color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Hledat nebo přidat položku…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="scroll-area">
        {search.trim() && !filtered.length && (
          <div style={{ padding: '0 20px 12px' }}>
            <button className="custom-add-btn" onClick={handleAddCustom}>
              <div className="custom-add-icon">+</div>
              <span className="custom-add-text">Přidat „{search.trim()}"</span>
            </button>
          </div>
        )}

        {!search.trim() && (
          <div className="custom-add-wrap">
            <button className="custom-add-btn" onClick={handleAddCustom}>
              <div className="custom-add-icon">+</div>
              <span className="custom-add-text">Přidat vlastní položku</span>
            </button>
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
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
