const TABS = [
  {
    id: 'nakup',
    label: 'Nákup',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
        <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
        <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    id: 'pridat',
    label: 'Přidat',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
  },
  {
    id: 'seznamy',
    label: 'Seznamy',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="13" y2="13"/>
      </svg>
    ),
  },
  {
    id: 'historie',
    label: 'Historie',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/>
      </svg>
    ),
  },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="nav-icon-wrap">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
