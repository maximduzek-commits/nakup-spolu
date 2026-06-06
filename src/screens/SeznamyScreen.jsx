import { useState } from 'react'
import { useSavedLists } from '../hooks/useFirestore'
import { addItemToList, deleteSavedList } from '../firebase/firestore'
import { SEED_ITEMS } from '../data/seedData'
import SyncBadge from '../components/SyncBadge'

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  )
}

export default function SeznamyScreen({ syncStatus, setSyncStatus }) {
  const lists = useSavedLists()
  const [added, setAdded] = useState({})
  const [expanded, setExpanded] = useState({})

  async function handleAddAll(list) {
    setSyncStatus('syncing')
    for (const name of list.itemNames) {
      const master = SEED_ITEMS.find(i => i.name === name)
      const category = master?.category ?? 'Trvanlivé potraviny'
      await addItemToList({ name, category, qty: 1 })
    }
    setSyncStatus('online')
    setAdded(prev => ({ ...prev, [list.id]: true }))
    setTimeout(() => setAdded(prev => ({ ...prev, [list.id]: false })), 3000)
  }

  async function handleDelete(list) {
    if (!confirm(`Smazat seznam „${list.name}"?`)) return
    await deleteSavedList(list.id)
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="screen-wrap">
      <div className="app-header">
        <div className="header-row">
          <div className="app-title">Moje seznamy</div>
          <SyncBadge status={syncStatus} />
        </div>
      </div>

      <div className="scroll-area">
        <div className="zoznamy-cards">
          <button className="create-zoznam-btn">
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
                  <button
                    className="zoznam-edit-btn"
                    onClick={() => toggleExpand(list.id)}
                  >
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
    </div>
  )
}
