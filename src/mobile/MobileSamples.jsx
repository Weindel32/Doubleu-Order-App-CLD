import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, GREEN, BORDER, CATEGORIES } from '../tokens.js'
import {
  PURPOSES, PURPOSE_LABELS, alwaysReturned, OUTCOMES, OUTCOME_LABELS, OUTCOME_CFG,
  fmtDate, euro, todayISO, addDaysISO, samplePieces, sampleCostValue,
  sampleStats, recipientLabel, needsFollowUp, returnOverdue, returnPending,
  daysSince, itemCostValue, itemOutcome,
} from '../utils/samples.js'
import { generateSamplePDF } from '../utils/pdfSample.js'
import DatePicker from '../components/DatePicker.jsx'

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: '12px 14px', color: CREAM, fontSize: 15,
  outline: 'none', fontFamily: "'Josefin Sans', sans-serif", colorScheme: 'dark',
}
const labelStyle = { fontSize: 10, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 6, display: 'block' }
const cardStyle  = { background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }

const EMPTY_ITEM = () => ({
  sp: '', description: '', category: '', color: '', size: '', quantity: 1,
  unit_cost: '', unit_price: '', returned: false,
  outcome: 'in_attesa', outcome_date: '', outcome_note: '', outcome_order_id: '',
})

const emptyForm = () => ({
  client_id: null, prospect_id: null, recipient_name: '', contact_name: '',
  shipped_date: todayISO(), purpose: 'valutazione',
  return_required: false, return_due_date: '', returned_date: '',
  carrier: '', tracking: '', shipping_cost: '',
  follow_up_date: '', notes: '', items: [EMPTY_ITEM()],
})

const toEditForm = (sh) => ({
  ...sh,
  shipping_cost: sh.shipping_cost ? String(sh.shipping_cost) : '',
  return_due_date: sh.return_due_date || '', returned_date: sh.returned_date || '',
  follow_up_date: sh.follow_up_date || '',
  contact_name: sh.contact_name || '', carrier: sh.carrier || '', tracking: sh.tracking || '', notes: sh.notes || '',
  items: (sh.items || []).length > 0
    ? sh.items.map(it => ({
        ...it,
        unit_cost:  it.unit_cost  ? String(it.unit_cost)  : '',
        unit_price: it.unit_price ? String(it.unit_price) : '',
        outcome: it.outcome || 'in_attesa', outcome_date: it.outcome_date || '',
        outcome_note: it.outcome_note || '', outcome_order_id: it.outcome_order_id || '',
      }))
    : [EMPTY_ITEM()],
})

const FILTERS = [
  { k: 'all',      label: 'Tutti' },
  { k: 'open',     label: 'In attesa' },
  { k: 'followup', label: 'Da sollecitare' },
  { k: 'toreturn', label: 'Da rientrare' },
]

export default function MobileSamples({ shipments, clients, prospects, onUpsert, onDelete, onItemOutcome, onMarkReturned }) {
  const [form,     setForm]     = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [openId,   setOpenId]   = useState(null)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')

  const list  = shipments || []
  const stats = sampleStats(list)

  const q = search.trim().toLowerCase()
  const filtered = list.filter(sh => {
    if (filter === 'open'     && !(sh.items || []).some(it => itemOutcome(it) === 'in_attesa')) return false
    if (filter === 'followup' && !needsFollowUp(sh)) return false
    if (filter === 'toreturn' && !returnPending(sh)) return false
    if (q) {
      const hay = [
        recipientLabel(sh, clients, prospects), sh.contact_name, sh.carrier, sh.notes,
        ...(sh.items || []).flatMap(it => [it.sp, it.description, it.color, it.size]),
      ].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }).sort((a, b) => (b.shipped_date || '').localeCompare(a.shipped_date || ''))

  const set     = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setItem = (i, k, v) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it) }))
  const setItemOutcome = (i, outcome) => setForm(f => ({
    ...f, items: f.items.map((it, idx) => idx === i
      ? { ...it, outcome, outcome_date: it.outcome_date || (outcome !== 'in_attesa' ? todayISO() : it.outcome_date) }
      : it),
  }))

  const choosePurpose = (purpose) => setForm(f => ({
    ...f,
    purpose,
    return_required: alwaysReturned(purpose) ? true : f.return_required,
    return_due_date: alwaysReturned(purpose) && !f.return_due_date ? addDaysISO(f.shipped_date, 30) : f.return_due_date,
  }))

  const pickRecipient = (value) => {
    if (!value) return setForm(f => ({ ...f, client_id: null, prospect_id: null, recipient_name: '' }))
    const [kind, id] = value.split(':')
    if (kind === 'c') {
      const c = clients.find(x => String(x.id) === id)
      setForm(f => ({ ...f, client_id: c ? c.id : null, prospect_id: null, recipient_name: c ? c.name : '' }))
    } else {
      const p = prospects.find(x => String(x.id) === id)
      setForm(f => ({
        ...f, prospect_id: p ? p.id : null, client_id: null,
        recipient_name: p ? p.name : '', contact_name: f.contact_name || p?.contact_name || '',
      }))
    }
  }

  const recipientValue = form?.client_id ? `c:${form.client_id}` : form?.prospect_id ? `p:${form.prospect_id}` : ''

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    await onUpsert(form)
    setSaving(false)
    setForm(null)
  }

  const handleDelete = async (sh) => {
    if (!confirm(`Eliminare la campionatura del ${fmtDate(sh.shipped_date)}?`)) return
    await onDelete(sh.id)
    setOpenId(null)
  }

  const mustReturn  = form ? (alwaysReturned(form.purpose) || form.return_required) : false
  const forcedRet   = form ? alwaysReturned(form.purpose) : false
  const canSave     = form && form.recipient_name.trim() && form.shipped_date &&
    form.items.some(it => (it.sp || '').trim() || (it.description || '').trim())

  // ── Form a schermo intero ──────────────────────────────────────
  if (form) {
    return (
      <div style={{ padding: '20px 16px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: CREAM, letterSpacing: 1 }}>
            {form.id ? 'Modifica invio' : 'Nuovo invio'}
          </div>
          <button onClick={() => setForm(null)}
            style={{ background: 'none', border: 'none', color: MUTED, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Destinatario *</label>
            <select style={inputStyle} value={recipientValue} onChange={e => pickRecipient(e.target.value)}>
              <option value="">— seleziona —</option>
              <optgroup label="Clienti">
                {[...clients].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'it'))
                  .map(c => <option key={`c${c.id}`} value={`c:${c.id}`}>{c.name}</option>)}
              </optgroup>
              <optgroup label="Prospect">
                {[...prospects].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'it'))
                  .map(p => <option key={`p${p.id}`} value={`p:${p.id}`}>{p.name}</option>)}
              </optgroup>
            </select>
            {!recipientValue && (
              <input style={{ ...inputStyle, marginTop: 8 }} placeholder="…oppure scrivi un nome"
                value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)}/>
            )}
          </div>

          <div>
            <label style={labelStyle}>Data invio *</label>
            <DatePicker triggerStyle={inputStyle} value={form.shipped_date} onChange={v => set('shipped_date', v)}/>
          </div>

          <div>
            <label style={labelStyle}>Motivo</label>
            <select style={inputStyle} value={form.purpose} onChange={e => choosePurpose(e.target.value)}>
              {PURPOSES.map(p => <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>)}
            </select>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div onClick={() => { if (!forcedRet) set('return_required', !form.return_required) }}
                style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0,
                  cursor: forcedRet ? 'not-allowed' : 'pointer', opacity: forcedRet ? 0.6 : 1,
                  background: mustReturn ? GREEN : 'rgba(255,255,255,0.12)' }}>
                <div style={{ position: 'absolute', top: 3, left: mustReturn ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }}/>
              </div>
              <span style={{ fontSize: 13, color: mustReturn ? GREEN : MUTED }}>
                {mustReturn ? 'Da restituire' : 'A fondo perduto'}
              </span>
            </div>
            {mustReturn && (
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Rientro previsto</label>
                <DatePicker triggerStyle={inputStyle} value={form.return_due_date} onChange={v => set('return_due_date', v)}/>
              </div>
            )}
          </div>

          {/* Articoli, ciascuno con il proprio esito */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={labelStyle}>Campioni inviati</span>
              <button onClick={() => setForm(f => ({ ...f, items: [...f.items, EMPTY_ITEM()] }))}
                style={{ background: 'transparent', border: `1px solid ${GOLD}`, borderRadius: 6, color: GOLD, fontSize: 11, letterSpacing: 1, padding: '5px 12px', cursor: 'pointer' }}>
                + Riga
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.items.map((it, i) => {
                const outCfg = OUTCOME_CFG[it.outcome || 'in_attesa']
                return (
                <div key={i} style={{ ...cardStyle, borderLeft: `3px solid ${outCfg.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, letterSpacing: 2, color: GOLD }}>ARTICOLO {i + 1}</span>
                    {form.items.length > 1 && (
                      <button onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}
                        style={{ background: 'none', border: 'none', color: CLAY, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input style={inputStyle} placeholder="Codice DUSP" value={it.sp} onChange={e => setItem(i, 'sp', e.target.value)}/>
                    <input style={inputStyle} placeholder="Descrizione" value={it.description} onChange={e => setItem(i, 'description', e.target.value)}/>
                    <select style={inputStyle} value={it.category} onChange={e => setItem(i, 'category', e.target.value)}>
                      <option value="">— categoria —</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <input style={inputStyle} placeholder="Colore" value={it.color} onChange={e => setItem(i, 'color', e.target.value)}/>
                      <input style={inputStyle} placeholder="Taglia" value={it.size} onChange={e => setItem(i, 'size', e.target.value)}/>
                      <input style={inputStyle} type="number" min="1" placeholder="Q.tà" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)}/>
                      <input style={inputStyle} type="number" step="0.01" placeholder="Costo un. €" value={it.unit_cost} onChange={e => setItem(i, 'unit_cost', e.target.value)}/>
                    </div>
                    <input style={inputStyle} type="number" step="0.01" placeholder="Prezzo al club €" value={it.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)}/>
                    {mustReturn && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: it.returned ? GREEN : MUTED }}>
                        <input type="checkbox" checked={!!it.returned} onChange={e => setItem(i, 'returned', e.target.checked)} style={{ accentColor: GREEN }}/>
                        Rientrato
                      </label>
                    )}

                    <div style={{ paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                      <label style={labelStyle}>Esito articolo</label>
                      <select style={inputStyle} value={it.outcome || 'in_attesa'} onChange={e => setItemOutcome(i, e.target.value)}>
                        {OUTCOMES.map(o => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
                      </select>
                      {(it.outcome || 'in_attesa') !== 'in_attesa' && (
                        <input style={{ ...inputStyle, marginTop: 8 }} placeholder="Nota sul feedback…"
                          value={it.outcome_note || ''} onChange={e => setItem(i, 'outcome_note', e.target.value)}/>
                      )}
                    </div>
                  </div>
                </div>
              )})}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: MUTED }}>
              <span>Costo: <span style={{ color: GOLD }}>{euro(form.items.reduce((v, it) => v + itemCostValue(it), 0), 2)}</span></span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Corriere</label>
              <input style={inputStyle} value={form.carrier} onChange={e => set('carrier', e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Spedizione €</label>
              <input style={inputStyle} type="number" step="0.01" value={form.shipping_cost} onChange={e => set('shipping_cost', e.target.value)}/>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tracking</label>
            <input style={inputStyle} value={form.tracking} onChange={e => set('tracking', e.target.value)}/>
          </div>

          <div>
            <label style={labelStyle}>Note invio</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)}/>
          </div>

          <button onClick={handleSave} disabled={saving || !canSave}
            style={{ width: '100%', padding: '15px', borderRadius: 8, border: 'none', marginTop: 4,
              background: canSave ? `linear-gradient(135deg, ${CLAY}, #a0502e)` : 'rgba(255,255,255,0.06)',
              color: canSave ? CREAM : MUTED, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase',
              fontWeight: 600, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: "'Josefin Sans', sans-serif" }}>
            {saving ? 'Salvataggio…' : 'Salva invio'}
          </button>
        </div>
      </div>
    )
  }

  // ── Elenco ─────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 16px 30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: CREAM, letterSpacing: 1 }}>Campionature</div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: GOLD, textTransform: 'uppercase', marginTop: 3 }}>
            {stats.count} invii · {euro(stats.invested)}
          </div>
        </div>
        <button onClick={() => setForm(emptyForm())}
          style={{ background: 'transparent', border: `1px solid ${GOLD}`, borderRadius: 8, color: GOLD,
            fontSize: 11, letterSpacing: 1.5, padding: '9px 14px', cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif" }}>
          + Invio
        </button>
      </div>

      <input style={{ ...inputStyle, marginBottom: 12 }} placeholder="Cerca cliente o articolo…"
        value={search} onChange={e => setSearch(e.target.value)}/>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {FILTERS.map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            style={{ padding: '7px 14px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
              fontSize: 11, letterSpacing: 1, fontFamily: "'Josefin Sans', sans-serif",
              border: `1px solid ${filter === f.k ? GOLD : BORDER}`,
              background: filter === f.k ? 'rgba(184,150,90,0.15)' : 'transparent',
              color: filter === f.k ? GOLD : MUTED }}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: MUTED }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20 }}>
            {list.length === 0 ? 'Nessuna campionatura' : 'Nessun risultato'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(sh => {
            const open     = openId === sh.id
            const overdue  = returnOverdue(sh)
            const followUp = needsFollowUp(sh)
            return (
              <div key={sh.id} style={{ ...cardStyle, borderLeft: `3px solid ${GOLD}`, padding: 0, overflow: 'hidden' }}>
                <div onClick={() => setOpenId(open ? null : sh.id)} style={{ padding: 16, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, color: CREAM }}>
                        {recipientLabel(sh, clients, prospects)}
                      </div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
                        {fmtDate(sh.shipped_date)} · {PURPOSE_LABELS[sh.purpose] || sh.purpose} · {samplePieces(sh)} pz
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: GOLD }}>
                        {euro(sampleCostValue(sh), 2)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                    {(sh.items || []).map(it => {
                      const c = OUTCOME_CFG[itemOutcome(it)]
                      const label = [it.sp, it.description, it.color, it.size, it.quantity > 1 ? `×${it.quantity}` : null]
                        .filter(Boolean).join(' ')
                      return (
                        <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: MUTED }}>{label || '—'}</span>
                          <span style={{ fontSize: 8, letterSpacing: 1, padding: '1px 7px', borderRadius: 2,
                            background: c.bg, color: c.color, border: `1px solid ${c.border}`, flexShrink: 0 }}>
                            {(OUTCOME_LABELS[itemOutcome(it)] || '').toUpperCase()}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {(overdue || followUp) && (
                    <div style={{ fontSize: 10, color: CLAY, marginTop: 6 }}>
                      {overdue ? `⚠ Reso scaduto il ${fmtDate(sh.return_due_date)}` : `⚠ Nessun esito da ${daysSince(sh.shipped_date)} giorni`}
                    </div>
                  )}
                </div>

                {open && (
                  <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                    {(sh.carrier || sh.tracking) && (
                      <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>
                        Spedito con {sh.carrier || '—'}{sh.tracking ? ` · ${sh.tracking}` : ''}
                      </div>
                    )}
                    {sh.notes && <div style={{ fontSize: 12, color: CREAM, marginBottom: 12, lineHeight: 1.6 }}>{sh.notes}</div>}

                    <div style={{ fontSize: 10, letterSpacing: 2, color: MUTED, marginBottom: 8 }}>ESITO PER ARTICOLO</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      {(sh.items || []).map(it => {
                        const label = [it.sp, it.description, it.color, it.size].filter(Boolean).join(' ')
                        return (
                          <div key={it.id}>
                            <div style={{ fontSize: 11, color: CREAM, marginBottom: 5 }}>{label || '—'}</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {OUTCOMES.map(o => {
                                const c = OUTCOME_CFG[o]
                                const active = itemOutcome(it) === o
                                return (
                                  <button key={o} onClick={() => onItemOutcome(it.id, o)}
                                    style={{ padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 10, letterSpacing: 0.5,
                                      fontFamily: "'Josefin Sans', sans-serif",
                                      border: `1px solid ${active ? c.border : BORDER}`,
                                      background: active ? c.bg : 'transparent',
                                      color: active ? c.color : MUTED }}>
                                    {OUTCOME_LABELS[o]}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => {
                        const html = generateSamplePDF(sh, clients, prospects)
                        const w = window.open('', '_blank')
                        w.document.write(html); w.document.close()
                      }}
                        style={{ flex: '1 1 100%', padding: '11px', borderRadius: 8, cursor: 'pointer', fontSize: 11, letterSpacing: 1.5,
                          background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, fontFamily: "'Josefin Sans', sans-serif" }}>
                        Bolla Campioni
                      </button>
                      {returnPending(sh) && (
                        <button onClick={() => onMarkReturned(sh.id, todayISO())}
                          style={{ flex: 1, padding: '11px', borderRadius: 8, cursor: 'pointer', fontSize: 11, letterSpacing: 1.5,
                            background: 'transparent', border: `1px solid ${GREEN}`, color: GREEN, fontFamily: "'Josefin Sans', sans-serif" }}>
                          Segna rientrato
                        </button>
                      )}
                      <button onClick={() => setForm(toEditForm(sh))}
                        style={{ flex: 1, padding: '11px', borderRadius: 8, cursor: 'pointer', fontSize: 11, letterSpacing: 1.5,
                          background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, fontFamily: "'Josefin Sans', sans-serif" }}>
                        Modifica
                      </button>
                      <button onClick={() => handleDelete(sh)}
                        style={{ padding: '11px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 11, letterSpacing: 1.5,
                          background: 'transparent', border: '1px solid rgba(196,98,58,0.35)', color: CLAY, fontFamily: "'Josefin Sans', sans-serif" }}>
                        Elimina
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
