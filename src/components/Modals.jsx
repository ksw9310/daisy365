import { useState, useRef, useEffect } from 'react'

/* ── 새 손님 등록 ── */
export function NewCustomerModal({ onClose, onAdd }) {
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-header">
          <div className="modal-title">새 손님 등록</div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="input-group">
          <label>이름 *</label>
          <input type="text" placeholder="손님 이름" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="input-group">
          <label>전화번호 (선택)</label>
          <input type="tel" placeholder="010-0000-0000" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => onAdd(name.trim(), phone.trim())}>
          등록 후 도장 찍기
        </button>
      </div>
    </div>
  )
}

/* ── 설정 편집 ── */
export function SettingEditModal({ editKey, settings, onClose, onSave }) {
  const titleMap = { cafeName: '카페 이름', stampsRequired: '쿠폰 도장 수', reward: '쿠폰 보상', password: '비밀번호 변경', registerUrl: '등록 페이지 URL' }
  const labelMap = { cafeName: '카페 이름', stampsRequired: '도장 수 (1~20)', reward: '쿠폰 보상 내용', password: '새 비밀번호 (4자리)', registerUrl: 'Vercel/Netlify 배포 후 받은 URL' }

  const [v1, setV1] = useState(editKey === 'password' ? '' : String(settings[editKey] || ''))
  const [v2, setV2] = useState('')

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-header">
          <div className="modal-title">{titleMap[editKey]}</div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="input-group">
          <label>{labelMap[editKey]}</label>
          <input
            type={editKey === 'password' ? 'password' : editKey === 'stampsRequired' ? 'number' : 'text'}
            inputMode={editKey === 'password' || editKey === 'stampsRequired' ? 'numeric' : 'text'}
            maxLength={editKey === 'password' ? 4 : undefined}
            value={v1}
            onChange={e => setV1(e.target.value)}
          />
        </div>
        {editKey === 'password' && (
          <div className="input-group">
            <label>비밀번호 확인</label>
            <input type="password" inputMode="numeric" maxLength={4} value={v2} onChange={e => setV2(e.target.value)} />
          </div>
        )}
        <button className="btn btn-primary" onClick={() => onSave(editKey, v1, v2)}>저장</button>
      </div>
    </div>
  )
}

/* ── 확인 모달 ── */
export function ConfirmModal({ message, onOk, onCancel }) {
  return (
    <div className="overlay">
      <div className="modal" style={{ paddingBottom: 24 }}>
        <div className="modal-handle" />
        <p style={{ fontSize: 16, fontWeight: 600, textAlign: 'center', padding: '8px 0 20px', lineHeight: 1.5 }}>
          {message}
        </p>
        <button className="btn btn-danger" onClick={onOk}>확인</button>
        <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={onCancel}>취소</button>
      </div>
    </div>
  )
}

/* ── 멀티매치 선택 ── */
export function MultiMatchModal({ candidates, onSelect, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-header">
          <div className="modal-title">손님 선택</div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        {candidates.map(c => (
          <div
            key={c.id}
            className="customer-row"
            style={{ borderRadius: 12, marginBottom: 8, border: '2px solid #F0E8E0' }}
            onClick={() => onSelect(c.id)}
          >
            <div className="avatar">{c.name[0]}</div>
            <div className="cust-info">
              <h3>{c.name}</h3>
              <p>{c.phone || '번호 없음'} · 도장 {c.stamps || 0}개</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
