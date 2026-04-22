import { useState, useEffect, useCallback } from 'react'
import { sb } from './lib/supabase'
import { uid, todayStr } from './utils'

import TabBar from './components/TabBar'
import Toast from './components/Toast'
import HomeTab from './components/HomeTab'
import CustomersTab from './components/CustomersTab'
import SettingsTab from './components/SettingsTab'
import CustomerModal from './components/CustomerModal'
import { NewCustomerModal, SettingEditModal, ConfirmModal, MultiMatchModal } from './components/Modals'

const DEFAULTS = {
  cafeName: '내 카페',
  stampsRequired: 12,
  reward: '아메리카노 1잔 무료',
  password: '1234',
  registerUrl: '',
}

export default function App() {
  const [tab, setTab]         = useState('home')
  const [loading, setLoading] = useState(true)
  const [D, setD]             = useState({ settings: { ...DEFAULTS }, customers: [], activity: [] })

  // 모달 상태
  const [selectedCid, setSelectedCid]   = useState(null)
  const [showNew, setShowNew]           = useState(false)
  const [editKey, setEditKey]           = useState(null)
  const [confirm, setConfirm]           = useState(null)   // { msg, onOk }
  const [multiMatch, setMultiMatch]     = useState(null)   // [customers]
  const [toast, setToast]               = useState(null)
  const [toastKey, setToastKey]         = useState(0)

  // ── 토스트 ──
  const showToast = useCallback((msg) => {
    setToast(msg)
    setToastKey(k => k + 1)
    setTimeout(() => setToast(null), 2500)
  }, [])

  // ── 데이터 로드 ──
  useEffect(() => {
    async function load() {
      const [{ data: sRows }, { data: cRows }, { data: aRows }] = await Promise.all([
        sb.from('settings').select('*'),
        sb.from('customers').select('*'),
        sb.from('activity').select('*').order('created_at', { ascending: true }),
      ])

      const settings = { ...DEFAULTS }
      ;(sRows || []).forEach(r => {
        settings[r.key] = r.key === 'stampsRequired' ? parseInt(r.value) : r.value
      })

      const customers = (cRows || []).map(c => ({
        id: c.id, name: c.name, phone: c.phone || '',
        stamps: c.stamps || 0, visits: c.visits || 0,
        couponsUsed: c.coupons_used || 0,
        createdAt: c.created_at, lastVisit: c.last_visit || null,
      }))

      const activity = (aRows || []).map(a => ({
        id: a.id, cid: a.customer_id, type: a.type,
        stamps: a.stamps || 0, date: a.date, ts: a.created_at,
      }))

      setD({ settings, customers, activity })
      setLoading(false)
    }
    load()
  }, [])

  // ── 헬퍼: D 업데이트 ──
  const updateD = (fn) => setD(prev => fn(structuredClone(prev)))

  // ── 도장 찍기 ──
  const handleStamp = (q) => {
    if (!q) { showToast('이름 또는 전화번호를 입력하세요'); return }
    const ql   = q.toLowerCase().replace(/-/g, '')
    const hits = D.customers.filter(c =>
      c.name.toLowerCase().includes(ql) ||
      (c.phone && c.phone.replace(/-/g, '').includes(ql))
    )
    if (!hits.length) { showToast('손님을 찾을 수 없어요 → 새 손님 등록'); setShowNew(true); return }
    if (hits.length === 1) { setSelectedCid(hits[0].id) }
    else { setMultiMatch(hits) }
  }

  const doAddStamp = async (cid) => {
    let stampsVal, disp
    updateD(d => {
      const i = d.customers.findIndex(x => x.id === cid)
      if (i < 0) return d
      d.customers[i].stamps    += 1
      d.customers[i].visits    += 1
      d.customers[i].lastVisit  = new Date().toISOString()
      const req = d.settings.stampsRequired
      const cur = d.customers[i].stamps % req
      stampsVal = cur === 0 ? req : cur
      disp      = cur === 0 ? req : cur
      const actId = uid()
      d.activity.push({ id: actId, cid, type: 'stamp', stamps: stampsVal, date: todayStr(), ts: new Date().toISOString() })
      return d
    })

    const snap = structuredClone(D)
    const i    = snap.customers.findIndex(x => x.id === cid)
    const actId = uid()
    const req   = snap.settings.stampsRequired
    const newStamps = (snap.customers[i].stamps || 0) + 1
    const cur       = newStamps % req
    stampsVal       = cur === 0 ? req : cur

    await Promise.all([
      sb.from('customers').upsert({
        id: cid, name: snap.customers[i].name, phone: snap.customers[i].phone,
        stamps: newStamps, visits: (snap.customers[i].visits || 0) + 1,
        coupons_used: snap.customers[i].couponsUsed,
        last_visit: new Date().toISOString(),
      }),
      sb.from('activity').insert({ id: actId, customer_id: cid, type: 'stamp', stamps: stampsVal, date: todayStr() }),
    ])

    setSelectedCid(null)
    document.getElementById('quickInput') && (document.getElementById('quickInput').value = '')
    showToast(`✅ 도장 찍었어요! (${stampsVal}/${req})`)
  }

  const doRemoveStamp = (cid) => {
    setConfirm({
      msg: '도장 1개를 취소할까요?',
      onOk: async () => {
        let lastActId = null
        setD(prev => {
          const d = structuredClone(prev)
          const i = d.customers.findIndex(x => x.id === cid)
          if (i < 0 || d.customers[i].stamps <= 0) return prev
          d.customers[i].stamps -= 1
          for (let j = d.activity.length - 1; j >= 0; j--) {
            if (d.activity[j].cid === cid && d.activity[j].type === 'stamp') {
              lastActId = d.activity[j].id
              d.activity.splice(j, 1)
              break
            }
          }
          return d
        })
        const cur = D.customers.find(x => x.id === cid)
        if (!cur || cur.stamps <= 0) { showToast('취소할 도장이 없어요'); return }
        await sb.from('customers').update({ stamps: cur.stamps - 1 }).eq('id', cid)
        if (lastActId) await sb.from('activity').delete().eq('id', lastActId)
        setSelectedCid(null)
        showToast('↩️ 도장 1개 취소됐어요')
      }
    })
  }

  const doRedeem = async (cid) => {
    const c   = D.customers.find(x => x.id === cid)
    const req = D.settings.stampsRequired
    if (!c || c.stamps < req) { showToast('도장이 부족해요'); return }
    const actId = uid()
    updateD(d => {
      const i = d.customers.findIndex(x => x.id === cid)
      d.customers[i].stamps     -= req
      d.customers[i].couponsUsed = (d.customers[i].couponsUsed || 0) + 1
      d.activity.push({ id: actId, cid, type: 'coupon', date: todayStr(), ts: new Date().toISOString() })
      return d
    })
    await Promise.all([
      sb.from('customers').update({ stamps: c.stamps - req, coupons_used: (c.couponsUsed || 0) + 1 }).eq('id', cid),
      sb.from('activity').insert({ id: actId, customer_id: cid, type: 'coupon', date: todayStr() }),
    ])
    setSelectedCid(null)
    showToast('🎁 쿠폰 교환 완료!')
  }

  const doDelete = (cid) => {
    setConfirm({
      msg: '이 손님 정보를 삭제할까요?',
      onOk: async () => {
        updateD(d => {
          d.customers = d.customers.filter(x => x.id !== cid)
          d.activity  = d.activity.filter(a => a.cid !== cid)
          return d
        })
        await sb.from('customers').delete().eq('id', cid)
        setSelectedCid(null)
        showToast('손님이 삭제되었어요')
      }
    })
  }

  // ── 새 손님 등록 ──
  const doAddCustomer = async (name, phone) => {
    if (!name) { showToast('이름을 입력해주세요'); return }
    if (D.customers.some(c => c.name === name)) { showToast('같은 이름의 손님이 이미 있어요'); return }
    const nc = { id: uid(), name, phone, stamps: 0, visits: 0, couponsUsed: 0, createdAt: new Date().toISOString(), lastVisit: null }
    updateD(d => { d.customers.push(nc); return d })
    await sb.from('customers').insert({ id: nc.id, name, phone, stamps: 0, visits: 0, coupons_used: 0, created_at: nc.createdAt })
    setShowNew(false)
    setSelectedCid(nc.id)
    showToast(`${name} 손님 등록 완료!`)
  }

  // ── 설정 저장 ──
  const doSaveSetting = async (key, v1, v2) => {
    if (key === 'password') {
      if (!/^\d{4}$/.test(v1)) { showToast('4자리 숫자를 입력하세요'); return }
      if (v1 !== v2)            { showToast('비밀번호가 일치하지 않아요'); return }
    } else if (key === 'stampsRequired') {
      const n = parseInt(v1)
      if (isNaN(n) || n < 1 || n > 20) { showToast('1~20 사이 숫자를 입력하세요'); return }
      updateD(d => { d.settings[key] = n; return d })
      await sb.from('settings').upsert({ key, value: String(n) })
      setEditKey(null); showToast('설정이 저장되었어요 ✅'); return
    } else {
      if (!v1) { showToast('값을 입력하세요'); return }
    }
    updateD(d => { d.settings[key] = v1; return d })
    await sb.from('settings').upsert({ key, value: v1 })
    setEditKey(null)
    showToast('설정이 저장되었어요 ✅')
  }

  // ── CSV 내보내기 ──
  const doExport = () => {
    const header = '이름,전화번호,누적도장,총방문,쿠폰사용,마지막방문'
    const rows   = D.customers.map(c =>
      `"${c.name}","${c.phone || ''}",${c.stamps||0},${c.visits||0},${c.couponsUsed||0},"${c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('ko-KR') : ''}"`)
    const csv  = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `카페손님_${todayStr()}.csv`
    a.click()
    showToast('CSV 파일로 내보냈어요 📤')
  }

  // ── 전체 초기화 ──
  const doReset = () => {
    setConfirm({
      msg: '모든 손님 정보를 삭제할까요?\n되돌릴 수 없어요.',
      onOk: async () => {
        updateD(d => { d.customers = []; d.activity = []; return d })
        await sb.from('activity').delete().neq('id', '')
        await sb.from('customers').delete().neq('id', '')
        showToast('데이터가 초기화되었어요')
      }
    })
  }

  const selectedCustomer = D.customers.find(c => c.id === selectedCid) || null

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>불러오는 중...</span>
      </div>
    )
  }

  return (
    <>
      {tab === 'home'      && <HomeTab D={D} onStamp={handleStamp} onNewCustomer={() => setShowNew(true)} />}
      {tab === 'customers' && <CustomersTab D={D} onSelectCustomer={setSelectedCid} />}
      {tab === 'settings'  && <SettingsTab D={D} onEdit={setEditKey} onExport={doExport} onReset={doReset} />}

      <TabBar tab={tab} setTab={setTab} />

      {selectedCustomer && (
        <CustomerModal
          customer={selectedCustomer}
          settings={D.settings}
          onClose={() => setSelectedCid(null)}
          onStamp={() => doAddStamp(selectedCid)}
          onRemoveStamp={() => doRemoveStamp(selectedCid)}
          onRedeem={() => doRedeem(selectedCid)}
          onDelete={() => doDelete(selectedCid)}
        />
      )}

      {showNew && <NewCustomerModal onClose={() => setShowNew(false)} onAdd={doAddCustomer} />}

      {editKey && (
        <SettingEditModal
          editKey={editKey}
          settings={D.settings}
          onClose={() => setEditKey(null)}
          onSave={doSaveSetting}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={confirm.msg}
          onOk={() => { confirm.onOk(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {multiMatch && (
        <MultiMatchModal
          candidates={multiMatch}
          onSelect={(cid) => { setMultiMatch(null); setSelectedCid(cid) }}
          onClose={() => setMultiMatch(null)}
        />
      )}

      {toast && <Toast key={toastKey} message={toast} />}
    </>
  )
}
