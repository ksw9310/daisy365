export default function CustomerModal({ customer, settings, onClose, onStamp, onRemoveStamp, onRedeem, onDelete }) {
  if (\!customer) return null

  const req            = settings.stampsRequired
  const currentInCycle = customer.stamps % req
  const canRedeem      = customer.stamps >= req
  const cols           = req <= 5 ? req : req <= 8 ? 4 : 5

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-header">
          <div className="modal-title">{customer.name}</div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* 프로필 */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6B4226,#9B6542)',
            color: 'white', fontSize: 28, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px'
          }}>{customer.name[0]}</div>
          <div style={{ color: '#666', fontSize: 14 }}>{customer.phone || '전화번호 없음'}</div>
          <div style={{ marginTop: 8 }}>
            <span className="pill">총 방문 {customer.visits || 0}회</span>{' '}
            <span className="pill">쿠폰 사용 {customer.couponsUsed || 0}회</span>
          </div>
        </div>

        {/* 쿠폰 교환 알림 */}
        {canRedeem && (
          <div className="coupon-alert">
            <div className="ca-title">🎁 쿠폰 교환 가능\!</div>
            <div className="ca-sub">{settings.reward}</div>
          </div>
        )}

        {/* 도장 현황 */}
        <div style={{ background: '#F5F0EB', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6B4226' }}>현재 도장</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#6B4226' }}>{currentInCycle} / {req}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(currentInCycle / req) * 100}%` }} />
          </div>
          <div className="stamp-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, marginTop: 12 }}>
            {Array.from({ length: req }, (_, i) => (
              <div key={i} className={`stamp-dot ${i < currentInCycle ? 'filled' : ''}`}>
                {i < currentInCycle ? '☕' : ''}
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <button className="btn btn-primary" onClick={onStamp}>☕ 도장 찍기</button>
        {canRedeem && <button className="btn btn-success" onClick={onRedeem}>🎁 쿠폰 교환하기</button>}
        {customer.stamps > 0 && <button className="btn btn-secondary" onClick={onRemoveStamp}>↩️ 도장 1개 취소</button>}
        <button className="btn btn-danger" onClick={onDelete}>손님 삭제</button>
      </div>
    </div>
  )
}
