import { todayStr } from '../utils'

export default function HomeTab({ D, onStamp, onNewCustomer }) {
  const today = todayStr()
  const todayCount   = D.activity.filter(a => a.date === today && a.type === 'stamp').length
  const totalCoupons = D.activity.filter(a => a.type === 'coupon').length
  const totalStamps  = D.activity.filter(a => a.type === 'stamp').length

  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  })

  const recent = [...D.activity].reverse().slice(0, 6)

  function handleStamp(e) {
    if (e.key === 'Enter') tryStamp()
  }

  function tryStamp() {
    const q = document.getElementById('quickInput').value.trim()
    onStamp(q)
  }

  return (
    <div className="screen active">
      <div className="header">
        <h1>☕ {D.settings.cafeName}</h1>
        <p>{dateStr}</p>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="value">{todayCount}</div>
          <div className="label">오늘 방문</div>
        </div>
        <div className="stat-card">
          <div className="value">{D.customers.length}</div>
          <div className="label">전체 손님</div>
        </div>
        <div className="stat-card">
          <div className="value">{totalCoupons}</div>
          <div className="label">쿠폰 교환</div>
        </div>
        <div className="stat-card">
          <div className="value">{totalStamps}</div>
          <div className="label">누적 도장</div>
        </div>
      </div>

      <div className="section-title">☕ 도장 찍기</div>
      <div className="card">
        <div className="input-group" style={{ marginBottom: 10 }}>
          <label>손님 이름 또는 전화번호 뒷 4자리</label>
          <input
            id="quickInput"
            type="text"
            placeholder="예: 홍길동 / 5678"
            onKeyDown={handleStamp}
          />
        </div>
        <button className="btn btn-primary" onClick={tryStamp}>☕ 도장 찍기</button>
        <button className="btn btn-secondary" onClick={onNewCustomer}>+ 새 손님 등록</button>
      </div>

      <div className="section-title">📋 최근 내역</div>
      <div style={{ background: 'white', borderRadius: 18, margin: '0 16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(107,66,38,0.07)' }}>
        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="es-icon">☕</div>
            <p>아직 도장 내역이 없어요<br />첫 손님을 등록해보세요!</p>
          </div>
        ) : recent.map(a => {
          const c = D.customers.find(x => x.id === a.cid) || {}
          const isCoupon = a.type === 'coupon'
          const time = new Date(a.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={a.id} className={`act-row ${isCoupon ? 'coupon' : ''}`}>
              <div className="act-icon">{isCoupon ? '🎁' : '☕'}</div>
              <div className="act-info">
                <h4>{c.name || '손님'}</h4>
                <p>{isCoupon ? '쿠폰 교환 완료' : `도장 적립 · 현재 ${a.stamps}개`}</p>
              </div>
              <div className="act-time">{time}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
