export default function SyncBadge({ status }) {
  const map = {
    online:  { label: 'online',    cls: 'online' },
    syncing: { label: 'ukládám…',  cls: 'syncing' },
    offline: { label: 'offline',   cls: 'offline' },
  }
  const { label, cls } = map[status] ?? map.online
  return (
    <span className={`sync-badge ${cls}`}>
      <span className="sync-dot" />
      {label}
    </span>
  )
}
