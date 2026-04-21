export default function TabBar({ tab, setTab }) {
  const tabs = [
    { id: 'home',      icon: '🏠', label: '홈' },
    { id: 'customers', icon: '👥', label: '손님' },
    { id: 'settings',  icon: '⚙️', label: '설정' },
  ]
  return (
    <nav className="tab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab-item ${tab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
        >
          <span className="tab-icon">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
