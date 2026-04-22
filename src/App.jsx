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

  const [selectedCid, setSelectedCid] = useState(null)
  const [showNew, setShowNew]         = useState(false)
  const [editKey, setEditKey]         = useState(null)
  const [confirm, setConfirm]         = useState(null)
  const [multiMatch, setMultiMatch]   = useState(null)
  const [toast, setToast]             = useState(null)
  const [toastKey, setToastKey]       = useState(0)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setToastKey(k => k + 1)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const updateD = (fn) => setD(prev => fn(JSON.parse(JSON.stringify(prev))))

  // 데이터 로드
  useEffect(() => {
    async function load() {
      try {
        const [{ data: sRows, error: e1 }, { data: cRows, error: e2 }, { data: aRows, error: e3 }] = await Promise.all([
          sb.from('settings').select('*'),
          sb.from('customers').select('*'),
          sb.from('activity').select('*').order('created_at', { ascending: true }),
        ])
        if (e1 || e2 || e3) throw e1 || e2 || e3

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
      } catch (e) {
        console.error('로드 실패:', e)
        showToast('DB 연결 실패: ' + (e.message || String(e)))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // 손님 검색
  const handleStamp = (q) => {
    if (!q) { showToast('닉네임 또는 전화번호를 입력하세요'); return }
    const ql   = q.toLowerCase().replace(/-/g, '')
    const hits = D.customers.filter(c =>
      c.name.toLowerCase().includes(ql) ||
      (c.phone && c.phone.replace(/-/g, '').includes(ql))
    )
    if (!hits.length) { showToast('손님을 찾을 수 없어요'); setShowNew(true); return }
    if (hits.length === 1) setSelectedCid(hits[0].id)
    else setMultiMatch(hits)
  }

  // 도장 찍기
  const doAddStamp = async (cid) => {
    const customer = D.customers.find(x => x.id === cid)
    if (!customer) return
    const req       = D.settings.stampsRequired
    const newStamps = (customer.stamps || 0) + 1
    const cur       = newStamps % req
    const stampsVal = cur === 0 ? req : cur
    const actId     = uid()
    const now       = new Date().toISOString()
    try {
      const { error: e1 } = await sb.from('customers').update({
        stamps: newStamps, visits: (customer.visits || 0) + 1, last_visit: now,
      }).eq('id', cid)
      if (e1) throw e1
      const { error: e2 } = await sb.from('activity').insert({
        id: actId, customer_id: cid, type: 'stamp', stamps: stampsVal, date: todayStr()
      })
      if (e2) throw e2
      updateD(d => {
        const i = d.customers.findIndex(x => x.id === cid)
        if (i < 0) return d
        d.customers[i].stamps    = newStamps
        d.customers[i].visits    = (d.customers[i].visits || 0) + 1
        d.customers[i].lastVisit = now
        d.activity.push({ id: actId, cid, type: 'stamp', stamps: stampsVal, date: todayStr(), ts: now })
        return d
      })
      setSelectedCid(null)
      const inp = document.getElementById('quickInput')
      if (inp) inp.value = ''
      showToast('도장 찍었어요! (' + stampsVal + '/' + req + ')')
    } catch (e) {
      console.error(e)
      showToast('오류: ' + (e.message || '도장 찍기 실패'))
    }
  }

  // 도장 취소
  const doRemoveStamp = (cid) => {
    setConfirm({
      msg: '도장 1개를 취소할까요?',
      onOk: async () => {
        const customer = D.customers.find(x => x.id === cid)
        if (!customer || customer.stamps <= 0) { showToast('취소할 도장이 없어요'); return }
        let lastActId = null
        for (let j = D.activity.length - 1; j >= 0; j--) {
          if (D.activity[j].cid === cid && D.activity[j].type === 'stamp') {
            lastActId = D.activity[j].id; break
          }
        }
        try {
          const { error: e1 } = await sb.from('customers').update({ stamps: customer.stamps - 1 }).eq('id', cid)
          if (e1) throw e1
          if (lastActId) {
            const { error: e2 } = await sb.from('activity').delete().eq('id', lastActId)
            if (e2) throw e2
          }
          updateD(d => {
            const i = d.customers.findIndex(x => x.id === cid)
            if (i >= 0) d.customers[i].stamps -= 1
            if (lastActId) {
              const ai = d.activity.findIndex(a => a.id === lastActId)
              if (ai >= 0) d.activity.splice(ai, 1)
            }
            return d
          })
          setSelectedCid(null)
          showToast('도장 1개 취소됐어요')
        } catch (e) {
          console.error(e)
          showToast('오류: ' + (e.message || '취소 실패'))
        }
      }
    })
  }

  // 쿠폰 교환
  const doRedeem = async (cid) => {
    const customer = D.customers.find(x => x.id === cid)
    const req      = D.settings.stampsRequired
    if (!customer || customer.stamps < req) { showToast('도장이 부족해요'); return }
    const actId = uid()
    try {
      const { error: e1 } = await sb.from('customers').update({
        stamps: customer.stamps - req,
        coupons_used: (customer.couponsUsed || 0) + 1,
      }).eq('id', cid)
      if (e1) throw e1
      const { error: e2 } = await sb.from('activity').insert({
        id: actId, customer_id: cid, type: 'coupon', date: todayStr()
      })
      if (e2) throw e2
      updateD(d => {
        const i = d.customers.findIndex(x => x.id === cid)
        d.customers[i].stamps      -= req
        d.customers[i].couponsUsed  = (d.customers[i].couponsUsed || 0) + 1
        d.activity.push({ id: actId, cid, type: 'coupon', date: todayStr(), ts: new Date().toISOString() })
        return d
      })
      setSelectedCid(null)
      showToast('쿠폰 교환 완료!')
    } catch (e) {
      console.error(e)
      showToast('오류: ' + (e.message || '쿠폰 교환 실패'))
    }
  }

  // 손님 삭제
  const doDelete = (cid) => {
    setConfirm({
      msg: '이 손님 정보를 삭제할까요?',
      onOk: async () => {
        try {
          const { error } = await sb.from('customers').delete().eq('id', cid)
          if (error) throw error
          updateD(d => {
            d.customers = d.customers.filter(x => x.id !== cid)
            d.activity  = d.activity.filter(a => a.cid !== cid)
            return d
          })
          setSelectedCid(null)
          showToast('손님이 삭제되었어요')
        } catch (e) {
          console.error(e)
          showToast('오류: ' + (e.message || '삭제 실패'))
        }
      }
    })
  }

  // 새 손님 등록
  const doAddCustomer = async (name, phone) => {
    if (!name) { showToast('닉네임을 입력해주세요'); return }
    const sameName  = D.customers.find(c => c.name === name)닉네임
    if (sameName) {
      const samePhone = phone && sameName.phone && sameName.phone.replace(/-/g,'').endsWith(phone.replace(/-/g,''))
      if (samePhone) { showToast('이미 등록된 손님이에요 (이름+번호 동일)'); return }
      showToast('같은 이름의 손님이 이미 있어요'); return
    }
    const nc = {
      id: uid(), name, phone,
      stamps: 0, visits: 0, couponsUsed: 0,
      createdAt: new Date().toISOString(), lastVisit: null
    }
    try {
      const { error } = await sb.from('customers').insert({
        id: nc.id, name: nc.name, phone: nc.phone,
        stamps: 0, visits: 0, coupons_used: 0, created_at: nc.createdAt
      })
      if (error) throw error
      updateD(d => { d.customers.push(nc); return d })
      setShowNew(false)
      setSelectedCid(nc.id)
      showToast(name + ' 손님 등록 완료!')
    } catch (e) {
      console.error(e)
      showToast('오류: ' + (e.message || '등록 실패'))
    }
  }

  // 설정 저장
  const doSaveSetting = async (key, v1, v2) => {
    let value = v1
    if (key === 'password') {
      if (!/^\d{4}$/.test(v1)) { showToast('4자리 숫자를 입력하세요'); return }
      if (v1 !== v2) { showToast('비밀번호가 일치하지 않아요'); return }
    } else if (key === 'stampsRequired') {
      const n = parseInt(v1)
      if (isNaN(n) || n < 1 || n > 20) { showToast('1~20 사이 숫자를 입력하세요'); return }
      value = String(n)
    } else {
      if (!v1) { showToast('값을 입력하세요'); return }
    }
    try {
      const { error } = await sb.from('settings').upsert({ key, value })
      if (error) throw error
      updateD(d => {
        d.settings[key] = key === 'stampsRequired' ? parseInt(value) : value
        return d
      })
      setEditKey(null)
      showToast('설정이 저장됐어요')
    } catch (e) {
      console.error(e)
      showToast('오류: ' + (e.message || '저장 실패'))
    }닉네임
  }

  // CSV 내보내기
  const doExport = () => {
    const header = '이름,전화번호,누적도장,총방문,쿠폰사용,마지막방문'
    const rows   = D.customers.map(c =>
      '"' + c.name + '","' + (c.phone || '') + '",' +
      (c.stamps||0) + ',' + (c.visits||0) + ',' + (c.couponsUsed||0) + ',' +
      '"' + (c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('ko-KR') : '') + '"'
    )
    const csv  = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = '카페손님_' + todayStr() + '.csv'
    a.click()
    showToast('CSV 내보냈어요')
  }

  // 전체 초기화
  const doReset = () => {
    setConfirm({
      msg: '모든 손님 정보를 삭제할까요?\n되돌릴 수 없어요.',
      onOk: async () => {
        try {
          await sb.from('activity').delete().neq('id', '')
          await sb.from('customers').delete().neq('id', '')
          updateD(d => { d.customers = []; d.activity = []; return d })
          showToast('데이터 초기화 완료')
        } catch (e) {
          showToast('오류: ' + (e.message || '초기화 실패'))
        }
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
      {showNew    && <NewCustomerModal onClose={() => setShowNew(false)} onAdd={doAddCustomer} />}
      {editKey    && <SettingEditModal editKey={editKey} settings={D.settings} onClose={() => setEditKey(null)} onSave={doSaveSetting} />}
      {confirm    && <ConfirmModal message={confirm.msg} onOk={() => { confirm.onOk(); setConfirm(null) }} onCancel={() => setConfirm(null)} />}
      {multiMatch && <MultiMatchModal candidates={multiMatch} onSelect={cid => { setMultiMatch(null); setSelectedCid(cid) }} onClose={() => setMultiMatch(null)} />}
      {toast      && <Toast key={toastKey} message={toast} />}
    </>
  )
}
