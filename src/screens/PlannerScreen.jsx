import { useState, useEffect, useRef } from 'react'
import { useMealPlan, useMasterItems } from '../hooks/useFirestore'
import { saveMealSlot, addItemToList } from '../firebase/firestore'
import { CATEGORIES } from '../data/seedData'
import SyncBadge from '../components/SyncBadge'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = [
  { key: 'monday',    label: 'Pondělí',  short: 'Po' },
  { key: 'tuesday',   label: 'Úterý',    short: 'Út' },
  { key: 'wednesday', label: 'Středa',   short: 'St' },
  { key: 'thursday',  label: 'Čtvrtek',  short: 'Čt' },
  { key: 'friday',    label: 'Pátek',    short: 'Pá' },
  { key: 'saturday',  label: 'Sobota',   short: 'So' },
  { key: 'sunday',    label: 'Neděle',   short: 'Ne' },
]

const SLOTS = [
  { key: 'breakfast', label: 'Snídaně', emoji: '🌅' },
  { key: 'lunch',     label: 'Oběd',    emoji: '☀️' },
  { key: 'dinner',    label: 'Večeře',  emoji: '🌙' },
]

// Sunday=0 in JS → map to our day keys
const JS_DAY_TO_KEY = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

// ── ISO week helpers ───────────────────────────────────────────────────────────

function getISOWeekInfo(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return {
    year: d.getUTCFullYear(),
    week,
    key: `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`,
  }
}

function addWeeks(date, delta) {
  const d = new Date(date)
  d.setDate(d.getDate() + delta * 7)
  return d
}

function isCurrentWeek(baseDate) {
  return getISOWeekInfo(baseDate).key === getISOWeekInfo(new Date()).key
}

// ── MealSlotEditor (bottom sheet) ─────────────────────────────────────────────

function MealSlotEditor({ dayKey, slot, mealData, weekKey, masterItems, onClose, setSyncStatus }) {
  const [mealName, setMealName]   = useState(mealData.name ?? '')
  const [selected, setSelected]   = useState(() => {
    const m = new Map()
    ;(mealData.ingredients ?? []).forEach(i => m.set(i.name, { qty: i.qty ?? 1, category: i.category ?? '' }))
    return m
  })
  const [search, setSearch]       = useState('')
  const [addedToCart, setAddedToCart] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 50) }, [])

  const dayLabel  = DAYS.find(d => d.key === dayKey)?.label ?? dayKey
  const slotLabel = slot.label

  const filtered = search.trim()
    ? masterItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : masterItems

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: filtered.filter(i => i.category === cat.name),
  })).filter(g => g.items.length > 0)

  function toggle(item) {
    setSelected(prev => {
      const next = new Map(prev)
      next.has(item.name)
        ? next.delete(item.name)
        : next.set(item.name, { qty: 1, category: item.category })
      return next
    })
  }

  function changeQty(itemName, delta) {
    setSelected(prev => {
      const next = new Map(prev)
      const cur = next.get(itemName)
      if (!cur) return next
      const qty = cur.qty + delta
      if (qty <= 0) { next.delete(itemName); return next }
      next.set(itemName, { ...cur, qty })
      return next
    })
  }

  async function handleSave() {
    try {
      setSyncStatus('syncing')
      const ingredients = [...selected.entries()].map(([name, { qty, category }]) => ({ name, qty, category }))
      await saveMealSlot(weekKey, dayKey, slot.key, { name: mealName.trim(), ingredients })
      setSyncStatus('online')
      onClose()
    } catch (e) {
      setSyncStatus('offline')
      console.error(e)
    }
  }

  async function handleAddToCart() {
    try {
      setSyncStatus('syncing')
      for (const [name, { qty, category }] of selected.entries()) {
        await addItemToList({ name, category, qty })
      }
      setSyncStatus('online')
      setAddedToCart(true)
      setTimeout(() => { setAddedToCart(false); onClose() }, 1200)
    } catch (e) {
      setSyncStatus('offline')
      console.error(e)
    }
  }

  const canSave = mealName.trim().length > 0 || selected.size > 0

  return (
    <div className="rename-backdrop" onClick={onClose}>
      <div className="meal-editor-sheet" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="meal-editor-header">
          <div className="meal-editor-title">
            {slot.emoji} {slotLabel} · {dayLabel}
          </div>
          <button className="meal-editor-close" onClick={onClose}>×</button>
        </div>

        {/* Meal name input */}
        <div className="meal-editor-name-wrap">
          <input
            ref={nameRef}
            className="meal-editor-name-input"
            placeholder="Název jídla…"
            value={mealName}
            onChange={e => setMealName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canSave && handleSave()}
          />
        </div>

        {/* Ingredient search */}
        <div className="meal-editor-search">
          <div className="search-input-wrap" style={{ background: 'var(--cream)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
              style={{ width: 15, height: 15, color: 'var(--text-muted)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Hledat ingredience…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: '0 2px' }}>
                ×
              </button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="meal-editor-selected-count">{selected.size} ingrediencí vybráno</div>
        )}

        {/* Ingredient list */}
        <div className="meal-editor-items">
          {grouped.map(cat => (
            <div key={cat.name}>
              <div className="create-cat-header">
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </div>
              {cat.items.map(item => {
                const isSelected = selected.has(item.name)
                const data = selected.get(item.name)
                return (
                  <div
                    key={item.id}
                    className={`create-item${isSelected ? ' selected' : ''}`}
                    onClick={() => toggle(item)}
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
                        <span className="create-qty-num">{data.qty}</span>
                        <button className="create-qty-btn" onClick={() => changeQty(item.name, 1)}>+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="meal-editor-footer">
          <button
            className="meal-editor-save-btn"
            disabled={!canSave}
            onClick={handleSave}
          >
            Uložit jídlo
          </button>
          <button
            className={`meal-editor-cart-btn${addedToCart ? ' added' : ''}`}
            disabled={selected.size === 0 || addedToCart}
            onClick={handleAddToCart}
          >
            {addedToCart ? '✓ Přidáno' : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ width: 15, height: 15 }}>
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Do nákupu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MealSlotRow ────────────────────────────────────────────────────────────────

function MealSlotRow({ slot, meal, onEdit }) {
  const hasName        = !!meal?.name
  const ingredients    = meal?.ingredients ?? []
  const hasIngredients = ingredients.length > 0
  const hasData        = hasName || hasIngredients

  const preview = ingredients.slice(0, 3).map(i => i.name).join(', ')
  const extra   = ingredients.length > 3 ? ` +${ingredients.length - 3}` : ''

  return (
    <button className={`planner-slot-row${hasData ? ' has-data' : ''}`} onClick={onEdit}>
      <span className="planner-slot-emoji">{slot.emoji}</span>
      <div className="planner-slot-content">
        <div className="planner-slot-label">{slot.label}</div>
        {hasName && <div className="planner-slot-meal-name">{meal.name}</div>}
        {hasIngredients && (
          <div className="planner-slot-ingredients">{preview}{extra}</div>
        )}
        {!hasData && <div className="planner-slot-empty">Přidat jídlo…</div>}
      </div>
      {hasIngredients && (
        <div className="planner-slot-chip">{ingredients.length}</div>
      )}
      <svg className="planner-slot-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  )
}

// ── DayCard ────────────────────────────────────────────────────────────────────

function DayCard({ day, meals, expanded, isToday, onToggle, onEditSlot }) {
  const plannedCount = SLOTS.filter(s => meals?.[s.key]?.name).length

  return (
    <div className={`planner-day-card${expanded ? ' expanded' : ''}${isToday ? ' today' : ''}`}>
      <button className="planner-day-header" onClick={onToggle}>
        <div className="planner-day-name">
          {isToday && <span className="planner-today-dot" />}
          {day.label}
        </div>
        <div className="planner-day-meta">
          {plannedCount > 0 && (
            <span className="planner-meal-count">{plannedCount} / 3</span>
          )}
          <svg
            className={`planner-chevron${expanded ? ' open' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="planner-slots">
          {SLOTS.map(slot => (
            <MealSlotRow
              key={slot.key}
              slot={slot}
              meal={meals?.[slot.key] ?? null}
              onEdit={() => onEditSlot(slot)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── PlannerScreen ─────────────────────────────────────────────────────────────

export default function PlannerScreen({ syncStatus, setSyncStatus }) {
  const [baseDate, setBaseDate]     = useState(() => new Date())
  const [expandedDay, setExpandedDay] = useState(null)
  const [editingSlot, setEditingSlot] = useState(null) // { dayKey, slot }

  const weekInfo = getISOWeekInfo(baseDate)
  const { plan } = useMealPlan(weekInfo.key)
  const { items: masterItems } = useMasterItems()

  const todayKey    = JS_DAY_TO_KEY[new Date().getDay()]
  const onThisWeek  = isCurrentWeek(baseDate)

  function handleToggleDay(dayKey) {
    setExpandedDay(prev => prev === dayKey ? null : dayKey)
  }

  function handleEditSlot(dayKey, slot) {
    setEditingSlot({ dayKey, slot })
  }

  function handleCloseEditor() {
    setEditingSlot(null)
  }

  const editingMealData = editingSlot
    ? (plan?.days?.[editingSlot.dayKey]?.[editingSlot.slot.key] ?? { name: '', ingredients: [] })
    : null

  return (
    <div className="screen-wrap">
      {/* Header */}
      <div className="app-header">
        <div className="header-row">
          <div className="planner-week-nav">
            <button className="planner-nav-btn" onClick={() => setBaseDate(d => addWeeks(d, -1))}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div className="planner-week-label">
              <span className="planner-week-title">Týden {weekInfo.week}</span>
              <span className="planner-week-year">· {weekInfo.year}</span>
              {onThisWeek && <span className="planner-this-week">tento týden</span>}
            </div>
            <button className="planner-nav-btn" onClick={() => setBaseDate(d => addWeeks(d, 1))}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
          <SyncBadge status={syncStatus} />
        </div>
      </div>

      {/* Day list */}
      <div className="scroll-area">
        <div className="planner-days">
          {DAYS.map(day => (
            <DayCard
              key={day.key}
              day={day}
              meals={plan?.days?.[day.key]}
              expanded={expandedDay === day.key}
              isToday={onThisWeek && todayKey === day.key}
              onToggle={() => handleToggleDay(day.key)}
              onEditSlot={(slot) => handleEditSlot(day.key, slot)}
            />
          ))}
        </div>
      </div>

      {/* Meal slot editor overlay */}
      {editingSlot && (
        <MealSlotEditor
          dayKey={editingSlot.dayKey}
          slot={editingSlot.slot}
          mealData={editingMealData}
          weekKey={weekInfo.key}
          masterItems={masterItems}
          onClose={handleCloseEditor}
          setSyncStatus={setSyncStatus}
        />
      )}
    </div>
  )
}
