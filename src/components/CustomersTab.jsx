import { useState } from 'react';

export default function CustomersTab({ D, onSelectCustomer }) {
  const [query, setQuery] = useState('');
  const req = D.settings.stampsRequired;

  const filtered = D.customers
    .filter((c) => {
      if (!query) return true;
      const q = query.toLowerCase().replace(/-/g, '');
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.replace(/-/g, '').includes(q))
      );
    })
    .sort((a, b) => {
      if (!a.lastVisit && !b.lastVisit)
        return a.name.localeCompare(b.name, 'ko');
      if (!a.lastVisit) return 1;
      if (!b.lastVisit) return -1;
      return new Date(b.lastVisit) - new Date(a.lastVisit);
    });

  return (
    <div className="screen active">
      <div className="header">
        <h1>손님 목록</h1>
        <p>전체 {D.customers.length}명</p>
      </div>

      <div className="search-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="닉네임 또는 전화번호 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: 18,
          margin: '0 16px',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(107,66,38,0.07)',
        }}
      >
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="es-icon">👤</div>
            <p>{query ? '검색 결과가 없어요' : '등록된 손님이 없어요'}</p>
          </div>
        ) : (
          filtered.map((c) => {
            const cur = c.stamps % req;
            const full = c.stamps >= req;
            const lv = c.lastVisit
              ? new Date(c.lastVisit).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                })
              : '미방문';
            return (
              <div
                key={c.id}
                className="customer-row"
                onClick={() => onSelectCustomer(c.id)}
              >
                <div className="avatar">{c.name[0]}</div>
                <div className="cust-info">
                  <h3>{c.name}</h3>
                  <p>
                    {c.phone || '번호 없음'} · {lv}
                  </p>
                </div>
                <span className={`stamp-badge ${full ? 'full' : ''}`}>
                  {full ? '🎁 쿠폰' : `☕ ${cur}/${req}`}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
