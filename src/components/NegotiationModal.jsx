import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER } from '../tokens.js'
import { s, btnStyle } from '../tokens.js'
import { NEG_STAGES, normalizeNegotiation } from '../utils/negotiation.js'

// Trattativa del preventivo: stato e condizioni concordate con il club.
// Funziona uguale su desktop e telefono (overlay a tutta pagina sul piccolo).
export default function NegotiationModal({ quote, onSave, onClose }) {
  const [neg, setNeg] = useState(() => normalizeNegotiation(quote.negotiation))
  const [saving, setSaving] = useState(false)
  const set = (patch) => setNeg(n => ({ ...n, ...patch }))
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n }

  const setGift = (i, patch) => set({ gifts: neg.gifts.map((g, k) => k === i ? { ...g, ...patch } : g) })
  const setRata = (i, patch) => set({ installments: neg.installments.map((r, k) => k === i ? { ...r, ...patch } : r) })
  const dep = Number(neg.depositPct) || 0
  const rateSum = neg.installments.reduce((a, r) => a + (Number(r.pct) || 0), 0)
  const atDelivery = 100 - dep - rateSum

  const save = async () => {
    setSaving(true)
    const clean = {
      ...neg,
      gifts: neg.gifts.filter(g => (g.label || '').trim()).map(g => ({ label: g.label.trim(), qty: Math.max(0, parseInt(g.qty) || 0), note: (g.note || '').trim() })),
      installments: neg.installments.map(r => ({ pct: Number(r.pct) || 0, days: Math.max(0, parseInt(r.days) || 0) })).filter(r => r.pct > 0),
      depositPct: neg.depositPct === null || neg.depositPct === '' ? null : Number(neg.depositPct),
      note: (neg.note || '').trim(),
      editedAt: new Date().toISOString(),
    }
    const ok = await onSave(clean)
    setSaving(false)
    if (ok !== false) onClose()
  }

  const lbl = { fontSize: 10, letterSpacing: 2, color: GOLD, textTransform: 'uppercase', margin: '18px 0 8px' }
  const small = { ...s.input, padding: '8px 10px' }
  const del = { padding: '6px 10px', fontSize: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, borderRadius: 3, cursor: 'pointer' }
  const add = { padding: '6px 12px', fontSize: 10, letterSpacing: 1, border: `1px dashed ${BORDER}`, background: 'transparent', color: MUTED, borderRadius: 3, cursor: 'pointer', marginTop: 6 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,40,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1e2d50', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, width: 560, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: CREAM, marginBottom: 4 }}>Trattativa</div>
        <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1 }}>{quote.client} · {quote.id}</div>
        {neg.source && (
          <div style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>
            Importato da Kit Builder{neg.source.analysis ? ` (${neg.source.analysis})` : ''}{neg.source.at ? ` il ${new Date(neg.source.at).toLocaleDateString('it-IT')}` : ''}
            {neg.editedAt && neg.source.at && neg.editedAt > neg.source.at ? ' · modificato a mano' : ''}
          </div>
        )}

        <div style={lbl}>Stato</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {NEG_STAGES.map(st => (
            <button key={st.key} onClick={() => set({ stage: st.key })} style={{
              padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, letterSpacing: 0.5,
              border: `1px solid ${neg.stage === st.key ? st.color : BORDER}`,
              background: neg.stage === st.key ? `${st.color}22` : 'transparent',
              color: neg.stage === st.key ? st.color : MUTED, fontFamily: "'Josefin Sans',sans-serif",
            }}>{st.label}</button>
          ))}
        </div>

        <div style={lbl}>Omaggi concordati</div>
        {neg.gifts.map((g, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) 64px minmax(0,1.4fr) auto', gap: 6, marginBottom: 6 }}>
            <input style={small} value={g.label} placeholder="Capo (es. Tuta)" onChange={e => setGift(i, { label: e.target.value })}/>
            <input style={{ ...small, textAlign: 'right' }} inputMode="numeric" value={g.qty ?? ''} placeholder="n." onChange={e => setGift(i, { qty: e.target.value })}/>
            <input style={small} value={g.note || ''} placeholder="Nota (es. staff, nominative)" onChange={e => setGift(i, { note: e.target.value })}/>
            <button style={del} onClick={() => set({ gifts: neg.gifts.filter((_, k) => k !== i) })} aria-label="Togli omaggio">✕</button>
          </div>
        ))}
        <button style={add} onClick={() => set({ gifts: [...neg.gifts, { label: '', qty: '', note: '' }] })}>+ Omaggio</button>

        <div style={lbl}>Pagamento</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, color: CREAM }}>
          Acconto <input style={{ ...small, width: 70, textAlign: 'right' }} inputMode="decimal" value={neg.depositPct ?? ''} placeholder="%" onChange={e => set({ depositPct: e.target.value === '' ? null : num(e.target.value) })}/> % alla conferma
        </div>
        {neg.installments.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12, color: CREAM, flexWrap: 'wrap' }}>
            Rata {i + 1}
            <input style={{ ...small, width: 64, textAlign: 'right' }} inputMode="decimal" value={r.pct ?? ''} placeholder="%" onChange={e => setRata(i, { pct: num(e.target.value) ?? '' })}/> % a
            <input style={{ ...small, width: 64, textAlign: 'right' }} inputMode="numeric" value={r.days ?? ''} placeholder="gg" onChange={e => setRata(i, { days: e.target.value })}/> giorni dalla consegna
            <button style={{ ...del, marginLeft: 'auto' }} onClick={() => set({ installments: neg.installments.filter((_, k) => k !== i) })} aria-label="Togli rata">✕</button>
          </div>
        ))}
        <button style={add} onClick={() => { const last = neg.installments.at(-1); set({ installments: [...neg.installments, { pct: '', days: last ? (parseInt(last.days) || 0) + 30 : 30 }] }) }}>+ Rata del saldo</button>
        <div style={{ fontSize: 11, marginTop: 8, color: atDelivery < -0.001 ? CLAY : MUTED }}>
          {atDelivery < -0.001 ? `Acconto e rate superano il 100% di ${(-atDelivery).toFixed(1).replace('.', ',')}%` : `Alla consegna: ${atDelivery.toFixed(0)}%`}
        </div>

        <div style={lbl}>Note della trattativa</div>
        <textarea rows={3} style={{ ...s.input, resize: 'vertical' }} value={neg.note} onChange={e => set({ note: e.target.value })}
          placeholder="Es. Kit Uomo da 99 a 90 €; riassortimenti a listino, minimo 10 pezzi"/>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button style={btnStyle(false)} onClick={onClose}>Annulla</button>
          <button style={{ ...btnStyle(true), opacity: saving || atDelivery < -0.001 ? 0.5 : 1 }} disabled={saving || atDelivery < -0.001} onClick={save}>{saving ? 'Salvataggio…' : 'Salva'}</button>
        </div>
      </div>
    </div>
  )
}
