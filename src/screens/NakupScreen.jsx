import { useState, useCallback, useRef } from 'react'
import { useCurrentList, useMasterItems } from '../hooks/useFirestore'
import { removeItemFromList, updateListItem, completeShoppingList, addItemToList } from '../firebase/firestore'
import { CATEGORIES } from '../data/seedData'
import SyncBadge from '../components/SyncBadge'

function CheckIcon() {
  return (
    <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
      <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const SWIPE_THRESHOLD = 72

function ListItem({ item, onCheck, onRemove, onQty }) {
  const [gone, setGone] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const didSwipe = useRef(false)

  function dismiss() {
    if (gone) return
    setGone(true)
    onRemove(item.id)
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    didSwipe.current = false
  }

  function handleTouchMove(e) {
    if (touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    // only swipe right, and only if mostly horizontal
    if (dx > 8 && dy < 30) {
      e.preventDefault()
      setSwiping(true)
      setSwipeX(Math.min(dx, SWIPE_THRESHOLD + 20))
      if (dx > SWIPE_THRESHOLD) didSwipe.current = true
    }
  }

  function handleTouchEnd() {
    if (didSwipe.current) {
      dismiss()
    } else {
      setSwipeX(0)
      setSwiping(false)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  function handleClick() {
    if (swiping || gone) return
    setGone(true)
    onCheck(item.id)
  }

  const progress = Math.min(swipeX / SWIPE_THRESHOLD, 1)

  return (
    <div
      className={`list-item-wrap${gone ? ' gone' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* swipe hint behind item */}
      <div className="swipe-hint" style={{ opacity: progress }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </div>
      <div
        className={`list-item${gone ? ' removing' : ''}`}
        style={{ transform: `translateX(${swipeX}px)`, transition: swiping ? 'none' : 'transform .25s ease' }}
        onClick={handleClick}
      >
        <div className={`checkbox${gone ? ' checked' : ''}`}>
          {gone && <CheckIcon />}
        </div>
        <span className="item-name">{item.name}</span>
        <div className="qty-control" onClick={e => e.stopPropagation()}>
          <button className="qty-btn minus" onClick={() => onQty(item.id, -1)}>−</button>
          <span className="qty-num">{item.qty ?? 1}</span>
          <button className="qty-btn" onClick={() => onQty(item.id, 1)}>+</button>
        </div>
      </div>
    </div>
  )
}

function SuggestionCard({ item, onAdd }) {
  const weeksAgo = item.lastPurchased
    ? Math.round((Date.now() - item.lastPurchased.toMillis()) / (7 * 24 * 3600 * 1000))
    : null
  const meta = item.purchaseCount > 3 ? 'pravidelné' : weeksAgo ? `před ${weeksAgo} týdny` : 'doporučeno'

  return (
    <div className="suggestion-card" onClick={() => onAdd(item)}>
      <div>
        <div className="suggestion-card-name">{item.name}</div>
        <div className="suggestion-card-meta">{meta}</div>
      </div>
      <div className="suggestion-add-btn">+</div>
    </div>
  )
}

export default function NakupScreen({ syncStatus, setSyncStatus }) {
  const { items, loading } = useCurrentList()
  const { items: masterItems } = useMasterItems()

  const twoWeeksAgo = Date.now() - 14 * 24 * 3600 * 1000
  const currentIds = new Set(items.map(i => i.name))

  const suggestions = masterItems
    .filter(m => !currentIds.has(m.name))
    .filter(m => {
      if (m.purchaseCount > 3) return true
      if (m.lastPurchased && m.lastPurchased.toMillis() < twoWeeksAgo) return true
      return false
    })
    .sort((a, b) => {
      const aMs = a.lastPurchased?.toMillis() ?? 0
      const bMs = b.lastPurchased?.toMillis() ?? 0
      return aMs - bMs
    })
    .slice(0, 8)

  async function handleCheck(id) {
    setSyncStatus('syncing')
    await removeItemFromList(id)
    setSyncStatus('online')
  }

  async function handleRemove(id) {
    setSyncStatus('syncing')
    await removeItemFromList(id)
    setSyncStatus('online')
  }

  async function handleQty(id, delta) {
    const item = items.find(i => i.id === id)
    const newQty = Math.max(1, (item?.qty ?? 1) + delta)
    setSyncStatus('syncing')
    await updateListItem(id, { qty: newQty })
    setSyncStatus('online')
  }

  async function handleAddSuggestion(masterItem) {
    setSyncStatus('syncing')
    await addItemToList({ id: masterItem.id, name: masterItem.name, category: masterItem.category, qty: 1 })
    setSyncStatus('online')
  }

  async function handleComplete() {
    if (items.length === 0) return
    if (!confirm(`Dokončit nákup a uložit ${items.length} položek do historie?`)) return
    setSyncStatus('syncing')
    await completeShoppingList()
    setSyncStatus('online')
  }

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: items.filter(i => i.category === cat.name),
  })).filter(g => g.items.length > 0)

  if (loading) return <div className="screen-loading">Načítám…</div>

  return (
    <div className="screen-wrap">
      <div className="app-header">
        <div className="header-row">
          <div className="app-title">
            Nákup 🛒
            <span className="counter-chip">
              <span className="remaining">{items.length}</span> položek
            </span>
          </div>
          <SyncBadge status={syncStatus} />
        </div>
      </div>

      <div className="scroll-area">
        {grouped.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🛒</span>
            <div className="empty-title">Seznam je prázdný</div>
            <div className="empty-sub">Přidejte položky klepnutím na Přidat</div>
          </div>
        )}

        {grouped.map(cat => (
          <div key={cat.name} className="category-section">
            <div className="category-header">
              <span className="cat-emoji">{cat.emoji}</span>
              <span className="cat-name">{cat.name}</span>
              <span className="cat-count">{cat.items.length}</span>
            </div>
            <div className="item-list">
              {cat.items.map(item => (
                <ListItem
                  key={item.id}
                  item={item}
                  onCheck={handleCheck}
                  onRemove={handleRemove}
                  onQty={handleQty}
                />
              ))}
            </div>
          </div>
        ))}

        {suggestions.length > 0 && (
          <>
            <div className="list-divider" />
            <div className="suggestions-section">
              <div className="suggestions-header">
                <span style={{ fontSize: 14 }}>✨</span>
                <span className="suggestions-title">Možná jste zapomněli</span>
                <span className="suggestions-hint">táhni →</span>
              </div>
              <div className="suggestions-scroll">
                {suggestions.map(s => (
                  <SuggestionCard key={s.id} item={s} onAdd={handleAddSuggestion} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="complete-btn-wrap">
        <button className="complete-btn" onClick={handleComplete} disabled={items.length === 0}>
          Dokončit nákup
          {items.length > 0 && <span className="btn-count">{items.length} položek</span>}
        </button>
      </div>
    </div>
  )
}
