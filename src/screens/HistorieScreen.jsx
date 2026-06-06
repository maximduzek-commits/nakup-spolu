import { useHistory, useCurrentList } from '../hooks/useFirestore'
import { addItemToList } from '../firebase/firestore'
import SyncBadge from '../components/SyncBadge'

function formatDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

function relativeLabel(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return 'dnes'
  if (days === 1) return 'včera'
  if (days < 7) return `${days} dny`
  if (days < 14) return 'týden'
  return `${Math.floor(days / 7)} týdny`
}

export default function HistorieScreen({ syncStatus, setSyncStatus }) {
  const history = useHistory()
  const { items: currentItems } = useCurrentList()

  async function handleReAdd(entry) {
    if (!confirm(`Přidat ${entry.items.length} položek z tohoto nákupu do aktuálního seznamu?`)) return
    setSyncStatus('syncing')
    for (const item of entry.items) {
      await addItemToList({ id: crypto.randomUUID(), name: item.name, category: item.category, qty: item.qty ?? 1 })
    }
    setSyncStatus('online')
  }

  return (
    <div className="screen-wrap">
      <div className="app-header">
        <div className="header-row">
          <div className="app-title">Historie nákupů</div>
          <SyncBadge status={syncStatus} />
        </div>
      </div>

      <div className="scroll-area">
        <div className="history-cards">
          {history.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">🕐</span>
              <div className="empty-title">Žádná historie</div>
              <div className="empty-sub">Po dokončení nákupu se záznamy objeví zde</div>
            </div>
          )}

          {history.map(entry => (
            <div key={entry.id} className="history-card">
              <div className="history-card-header">
                <div className="history-date-badge">{relativeLabel(entry.completedAt)}</div>
                <div className="history-card-meta">
                  <div className="history-card-title">{formatDate(entry.completedAt)}</div>
                  <div className="history-card-count">{entry.items.length} položek</div>
                </div>
                <button className="history-re-add" onClick={() => handleReAdd(entry)}>
                  Znovu přidat
                </button>
              </div>
              <div className="history-items-preview">
                {entry.items.slice(0, 5).map(item => (
                  <span key={item.id ?? item.name} className="history-tag">{item.name}</span>
                ))}
                {entry.items.length > 5 && (
                  <span className="history-tag more">+{entry.items.length - 5} dalších</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
