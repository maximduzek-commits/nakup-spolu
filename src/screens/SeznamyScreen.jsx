import { useState } from 'react'
import { useSavedLists, useMasterItems } from '../hooks/useFirestore'
import { addItemToList, deleteSavedList, createSavedList } from '../firebase/firestore'
import { SEED_ITEMS, CATEGORIES } from '../data/seedData'
import SyncBadge from '../components/SyncBadge'

const EMOJIS = ['📝','🔥','☀️','🥗','🎉','🧺','👶','💊','🏠','🌿','🍕','🎯']

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  )
}

function CreatePanel({ masterItems, onSave, onCancel }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📝')
  const [selected, setSelected] = useState(new Map()) // name → qty
  const [search, setSearch] = useState('')

  function toggle(itemName) {
    setSelected(prev => {
      const next = new Map(prev)
      next.has(itemName) ? next.delete(itemName) : next.set(itemName, 1)
      return next
    })
  }

  function changeQty(itemName, delta) {
    setSelected(prev => {
      const next = new Map(prev)
      const qty = Math.max(1, (next.get(itemName) ?? 1) + delta)
      next.set(itemName, qty)
      return next
    })
  }

  const filtered = search.trim()
    ? masterItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : masterItems

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: filtered.filter(i => i.category === cat.name),
  })).filter(g => g.items.length > 0)

  const items = [...selected.entries()].map(([name, qty]) => ({ name, qty }))

  return (
    <div className="create-panel">
      <div className="create-panel-header">
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600 }}>Nový seznam</span>
        <button className="create-panel-close" onClick={onCancel}>Zrušit</button>
      </div>

      <div className="create-panel-name-row">
        <div className="emoji-picker">
          {EMOJIS.map(e => (
            <button
              key={e}
              className={`emoji-btn${emoji === e ? ' selected' : ''}`}
              onClick={() => setEmoji(e)}
            >{e}</button>
          ))}
        </div>
        <input
          className="create-name-input"
          placeholder="Název seznamu…"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="create-search-bar">
        <div className="search-input-wrap" style={{ background: 'var(--cream)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: 15, height: 15, color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Hledat položky…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="selected-count">{selected.size} položek vybráno</div>
      )}

      <div className="create-items-scroll">
        {grouped.map(cat => (
          <div key={cat.name}>
            <div className="create-cat-header">
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </div>
            {cat.items.map(item => {
              const isSelected = selected.has(item.name)
              const qty = selected.get(item.name) ?? 1
              return (
                <div
                  key={item.id}
                  className={`create-item${isSelected ? ' selected' : ''}`}
                  onClick={() => toggle(item.name)}
                >
                  <div className={`create-item-check${isSelected ? ' checked' : ''}`}>
                    {isSelected && (
                      <svg width="11" height="8" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="create-item-name">{item.name}</span>
                  {isSelected && (
                    <div className="create-item-qty" onClick={e => e.stopPropagation()}>
                      <button className="create-qty-btn" onClick={() => changeQty(item.name, -1)}>−</button>
                      <span className="create-qty-num">{qty}</span>
                      <button className="create-qty-btn" onClick={() => changeQty(item.name, 1)}>+</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="create-panel-footer">
        <button
          className="create-save-btn"
          disabled={!name.trim() || selected.size === 0}
          onClick={() => onSave(name.trim(), emoji, items)}
        >
          Uložit seznam · {selected.size} položek
        </button>
      </div>
    </div>
  )
}

export default function SeznamyScreen({ syncStatus, setSyncStatus }) {
  const lists = useSavedLists()
  const { items: masterItems } = useMasterItems()
  const [added, setAdded] = useState({})
  const [expanded, setExpanded] = useState({})
  const [creating, setCreating] = useState(false)

  async function handleAddAll(list) {
    try {
      setSyncStatus('syncing')
      for (const item of (list.itemNames ?? [])) {
        const name = typeof item === 'string' ? item : item.name
        const qty  = typeof item === 'string' ? 1   : (item.qty ?? 1)
        const master = SEED_ITEMS.find(i => i.name === name)
        const category = master?.category ?? 'Trvanlivé potraviny'
        await addItemToList({ name, category, qty })
      }
      setSyncStatus('online')
      setAdded(prev => ({ ...prev, [list.id]: true }))
      setTimeout(() => setAdded(prev => ({ ...prev, [list.id]: false })), 3000)
    } catch (e) {
      setSyncStatus('offline')
      alert('Chyba: ' + e.message)
    }
  }

  async function handleDelete(list) {
    if (!confirm(`Smazat seznam „${list.name}"?`)) return
    await deleteSavedList(list.id)
  }

  async function handleCreate(name, emoji, itemNames) {
    try {
      setSyncStatus('syncing')
      await createSavedList(name, emoji, itemNames)
      setSyncStatus('online')
      setCreating(false)
    } catch (e) {
      setSyncStatus('offline')
      alert('Chyba: ' + e.message)
    }
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="screen-wrap" style={{ position: 'relative' }}>
      <div className="app-header">
        <div className="header-row">
          <div className="app-title">Moje seznamy</div>
          <SyncBadge status={syncStatus} />
        </div>
      </div>

      <div className="scroll-area">
        <div className="zoznamy-cards">
          <button className="create-zoznam-btn" onClick={() => setCreating(true)}>
            <div className="create-zoznam-icon">+</div>
            <span className="create-zoznam-text">Vytvořit nový seznam</span>
          </button>

          {lists.map(list => (
            <div key={list.id} className="zoznam-card">
              <div className="zoznam-card-header">
                <div className="zoznam-icon">{list.emoji}</div>
                <div className="zoznam-meta">
                  <div className="zoznam-name">{list.name}</div>
                  <div className="zoznam-count">{list.itemNames?.length ?? 0} položek</div>
                </div>
                <div className="zoznam-actions">
                  <button className="zoznam-edit-btn" onClick={() => toggleExpand(list.id)}>
                    {expanded[list.id] ? 'Zavřít' : 'Upravit'}
                  </button>
                </div>
              </div>

              {expanded[list.id] && (
                <div className="zoznam-edit-panel">
                  <button className="zoznam-delete-btn" onClick={() => handleDelete(list)}>
                    <TrashIcon />
                    Smazat tento seznam
                  </button>
                </div>
              )}

              <div className="zoznam-tags">
                {(list.itemNames ?? []).slice(0, 6).map(name => (
                  <span key={name} className="zoznam-tag">{name}</span>
                ))}
                {(list.itemNames?.length ?? 0) > 6 && (
                  <span className="zoznam-tag more">+{list.itemNames.length - 6} dalších</span>
                )}
              </div>
              <button
                className={`zoznam-add-btn${added[list.id] ? ' added' : ''}`}
                onClick={() => handleAddAll(list)}
                disabled={added[list.id]}
              >
                {added[list.id] ? '✓ Přidáno do nákupu' : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 16, height: 16 }}>
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Přidat vše do nákupu
                  </>
                )}
              </button>
            </div>
          ))}

          {lists.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <div className="empty-title">Žádné seznamy</div>
              <div className="empty-sub">Vytvořte si první seznam pro rychlý nákup</div>
            </div>
          )}
        </div>
      </div>

      {creating && (
        <div className="create-overlay">
          <CreatePanel
            masterItems={masterItems}
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}
    </div>
  )
}
