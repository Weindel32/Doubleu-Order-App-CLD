import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, GREEN, BORDER, ADULT_SIZES, KIDS_SIZES, CATEGORIES } from '../tokens.js'
import { s, btnStyle, btnGoldStyle } from '../tokens.js'
import SpAutocomplete from './SpAutocomplete.jsx'
import {
  PURPOSES, PURPOSE_LABELS, alwaysReturned, OUTCOMES, OUTCOME_LABELS,
  todayISO, addDaysISO, itemValue, euro, FOLLOW_UP_DAYS,
} from '../utils/samples.js'

const inp = { ...s.input }

const EMPTY_ITEM = () => ({ sp: '', description: '', category: '', color: '', size: '', quantity: 1, unit_value: '', returned: false })

export function emptyShipment(prefill = {}) {
  return {
    client_id: null, prospect_id: null, recipient_name: '', contact_name: '',
    shipped_date: todayISO(), purpose: 'valutazione',
    return_required: false, return_due_date: '', returned_date: '',
    carrier: '', tracking: '', shipping_cost: '',
    outcome: 'in_attesa', outcome_date: '', outcome_order_id: '',
    follow_up_date: '', notes: '',
    items: [EMPTY_ITEM()],
    ...prefill,
  }
}

// Compila un invio partendo da un cliente in anagrafica
export const shipmentFromClient = (client) => emptyShipment({
  client_id: client.id, recipient_name: client.name, contact_name: '',
})

// …o da un prospect in pipeline
export const shipmentFromProspect = (prospect) => emptyShipment({
  prospect_id: prospect.id, recipient_name: prospect.name,
  contact_name: prospect.contact_name || '',
})

export function shipmentToForm(sh) {
  return {
    ...sh,
    shipping_cost:    sh.shipping_cost ? String(sh.shipping_cost) : '',
    return_due_date:  sh.return_due_date  || '',
    returned_date:    sh.returned_date    || '',
    follow_up_date:   sh.follow_up_date   || '',
    outcome_order_id: sh.outcome_order_id || '',
    contact_name:     sh.contact_name || '',
    carrier:          sh.carrier  || '',
    tracking:         sh.tracking || '',
    notes:            sh.notes    || '',
    items: (sh.items || []).length > 0
      ? sh.items.map(it => ({ ...it, unit_value: it.unit_value ? String(it.unit_value) : '', quantity: it.quantity || 1 }))
      : [EMPTY_ITEM()],
  }
}

const SIZE_HINTS = [...ADULT_SIZES, ...KIDS_SIZES, 'UNI']

export default function SampleModal({ form, setForm, clients = [], prospects = [], orders = [], onSave, onCancel, saving, title }) {
  // 'cliente' | 'prospect' | 'altro' — dedotto dai riferimenti già presenti
  const [target, setTarget] = useState(
    form.client_id ? 'cliente' : form.prospect_id ? 'prospect' : 'altro'
  )

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const setItem = (i, k, v) => setForm(f => ({
    ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it),
  }))

  const addItem    = ()  => setForm(f => ({ ...f, items: [...f.items, EMPTY_ITEM()] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, idx) => idx !== i) : f.items }))

  const chooseTarget = (t) => {
    setTarget(t)
    setForm(f => ({ ...f, client_id: null, prospect_id: null, recipient_name: t === 'altro' ? f.recipient_name : '' }))
  }

  const pickClient = (id) => {
    const c = clients.find(x => String(x.id) === String(id))
    setForm(f => ({ ...f, client_id: c ? c.id : null, prospect_id: null, recipient_name: c ? c.name : '' }))
  }

  const pickProspect = (id) => {
    const p = prospects.find(x => String(x.id) === String(id))
    setForm(f => ({
      ...f, prospect_id: p ? p.id : null, client_id: null,
      recipient_name: p ? p.name : '',
      contact_name: f.contact_name || p?.contact_name || '',
    }))
  }

  // I set misure rientrano sempre: la scelta non è modificabile.
  const forcedReturn = alwaysReturned(form.purpose)
  const mustReturn   = forcedReturn || form.return_required

  const choosePurpose = (purpose) => setForm(f => ({
    ...f,
    purpose,
    return_required: alwaysReturned(purpose) ? true : f.return_required,
    return_due_date: alwaysReturned(purpose) && !f.return_due_date
      ? addDaysISO(f.shipped_date, 30)
      : f.return_due_date,
  }))

  const goodsValue = form.items.reduce((v, it) => v + itemValue(it), 0)
  const totalValue = goodsValue + (parseFloat(form.shipping_cost) || 0)
  const pieces     = form.items.reduce((n, it) => n + (parseInt(it.quantity) || 0), 0)

  const validItems = form.items.some(it => (it.sp || '').trim() || (it.description || '').trim())
  const canSave    = !!form.recipient_name.trim() && !!form.shipped_date && validItems

  return (
    <div style={{ padding: 32, maxHeight: '86vh', overflowY: 'auto' }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: CREAM, letterSpacing: 2, marginBottom: 22 }}>
        {title || 'Registra Invio Campioni'}
      </div>

      {/* ── Destinatario ── */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={s.cardTitle}>Destinatario</div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { k: 'cliente',  label: 'Cliente acquisito' },
            { k: 'prospect', label: 'Prospect' },
            { k: 'altro',    label: 'Altro / non in archivio' },
          ].map(t => (
            <button key={t.k} onClick={() => chooseTarget(t.k)}
              style={{ padding: '6px 14px', borderRadius: 3, cursor: 'pointer', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
                border: `1px solid ${target === t.k ? GOLD : BORDER}`,
                background: target === t.k ? 'rgba(184,150,90,0.15)' : 'transparent',
                color: target === t.k ? GOLD : MUTED }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={s.label}>{target === 'altro' ? 'Nome destinatario *' : target === 'prospect' ? 'Prospect *' : 'Cliente *'}</label>
            {target === 'cliente' && (
              <select style={{ ...inp, cursor: 'pointer' }} value={form.client_id || ''} onChange={e => pickClient(e.target.value)}>
                <option value="">— seleziona —</option>
                {[...clients].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'it'))
                  .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {target === 'prospect' && (
              <select style={{ ...inp, cursor: 'pointer' }} value={form.prospect_id || ''} onChange={e => pickProspect(e.target.value)}>
                <option value="">— seleziona —</option>
                {[...prospects].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'it'))
                  .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {target === 'altro' && (
              <input style={inp} value={form.recipient_name} placeholder="es. Studio XY"
                onChange={e => set('recipient_name', e.target.value)}/>
            )}
          </div>
          <div>
            <label style={s.label}>Referente</label>
            <input style={inp} value={form.contact_name} placeholder="A chi è indirizzato"
              onChange={e => set('contact_name', e.target.value)}/>
          </div>
        </div>
      </div>

      {/* ── Invio ── */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={s.cardTitle}>Invio</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Data invio *</label>
            <input style={inp} type="date" value={form.shipped_date} onChange={e => set('shipped_date', e.target.value)}/>
          </div>
          <div>
            <label style={s.label}>Motivo</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.purpose} onChange={e => choosePurpose(e.target.value)}>
              {PURPOSES.map(p => <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Follow-up</label>
            <input style={inp} type="date" value={form.follow_up_date}
              onChange={e => set('follow_up_date', e.target.value)}/>
            <div style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>
              Vuoto = sollecito dopo {FOLLOW_UP_DAYS} giorni
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={s.label}>Corriere</label>
            <input style={inp} value={form.carrier} placeholder="es. DHL, GLS, a mano"
              onChange={e => set('carrier', e.target.value)}/>
          </div>
          <div>
            <label style={s.label}>Tracking</label>
            <input style={inp} value={form.tracking} onChange={e => set('tracking', e.target.value)}/>
          </div>
          <div>
            <label style={s.label}>Costo spedizione (€)</label>
            <input style={inp} type="number" step="0.01" value={form.shipping_cost} placeholder="0"
              onChange={e => set('shipping_cost', e.target.value)}/>
          </div>
        </div>
      </div>

      {/* ── Reso ── */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={s.cardTitle}>Reso</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: mustReturn ? 14 : 0 }}>
          <div onClick={() => { if (!forcedReturn) set('return_required', !form.return_required) }}
            style={{ width: 40, height: 22, borderRadius: 11, position: 'relative', flexShrink: 0,
              cursor: forcedReturn ? 'not-allowed' : 'pointer', opacity: forcedReturn ? 0.6 : 1,
              background: mustReturn ? GREEN : 'rgba(255,255,255,0.12)', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 3, left: mustReturn ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }}/>
          </div>
          <span style={{ fontSize: 12, color: mustReturn ? GREEN : MUTED }}>
            {mustReturn ? 'I campioni devono rientrare' : 'Campioni a fondo perduto'}
          </span>
          {forcedReturn && (
            <span style={{ fontSize: 10, color: MUTED, fontStyle: 'italic' }}>
              — i set misure rientrano sempre
            </span>
          )}
        </div>

        {mustReturn && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={s.label}>Rientro previsto</label>
              <input style={inp} type="date" value={form.return_due_date} onChange={e => set('return_due_date', e.target.value)}/>
            </div>
            <div>
              <label style={s.label}>Rientrato il</label>
              <input style={inp} type="date" value={form.returned_date} onChange={e => set('returned_date', e.target.value)}/>
            </div>
          </div>
        )}
      </div>

      {/* ── Articoli ── */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ ...s.cardTitle, marginBottom: 0 }}>Campioni Inviati</div>
          <button style={{ ...btnGoldStyle, padding: '4px 14px', fontSize: 9 }} onClick={addItem}>+ Riga</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {form.items.map((it, i) => (
            <div key={i} style={{ padding: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1fr', gap: 10, marginBottom: 10 }}>
                <SpAutocomplete
                  value={it.sp}
                  category={it.category}
                  inputStyle={inp}
                  onSelect={p => setForm(f => ({
                    ...f,
                    items: f.items.map((row, idx) => idx === i
                      ? { ...row, sp: p.code, description: p.description, category: p.category }
                      : row),
                  }))}
                />
                <div>
                  <label style={s.label}>Descrizione</label>
                  <input style={inp} value={it.description} onChange={e => setItem(i, 'description', e.target.value)}/>
                </div>
                <div>
                  <label style={s.label}>Categoria</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={it.category} onChange={e => setItem(i, 'category', e.target.value)}>
                    <option value="">— nessuna —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.6fr 0.9fr auto', gap: 10, alignItems: 'flex-end' }}>
                <div>
                  <label style={s.label}>Colore</label>
                  <input style={inp} value={it.color} onChange={e => setItem(i, 'color', e.target.value)}/>
                </div>
                <div>
                  <label style={s.label}>Taglia</label>
                  <input style={inp} value={it.size} list="du-sample-sizes" placeholder="es. L"
                    onChange={e => setItem(i, 'size', e.target.value)}/>
                </div>
                <div>
                  <label style={s.label}>Q.tà</label>
                  <input style={inp} type="number" min="1" value={it.quantity}
                    onChange={e => setItem(i, 'quantity', e.target.value)}/>
                </div>
                <div>
                  <label style={s.label}>Valore un. (€)</label>
                  <input style={inp} type="number" step="0.01" value={it.unit_value} placeholder="0"
                    onChange={e => setItem(i, 'unit_value', e.target.value)}/>
                </div>
                <button onClick={() => removeItem(i)} disabled={form.items.length === 1}
                  title="Rimuovi riga"
                  style={{ padding: '9px 14px', borderRadius: 3, fontSize: 14, lineHeight: 1,
                    cursor: form.items.length === 1 ? 'not-allowed' : 'pointer',
                    background: 'transparent', border: '1px solid rgba(196,98,58,0.35)',
                    color: CLAY, opacity: form.items.length === 1 ? 0.35 : 1 }}>×</button>
              </div>

              {mustReturn && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <input type="checkbox" checked={!!it.returned} onChange={e => setItem(i, 'returned', e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: GREEN }}/>
                  <span style={{ fontSize: 11, color: it.returned ? GREEN : MUTED }}>Rientrato</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <datalist id="du-sample-sizes">
          {SIZE_HINTS.map(sz => <option key={sz} value={sz}/>)}
        </datalist>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED }}>PEZZI</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: CREAM }}>{pieces}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED }}>VALORE MERCE</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: GOLD }}>{euro(goodsValue, 2)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED }}>TOTALE CON SPEDIZIONE</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: GOLD }}>{euro(totalValue, 2)}</div>
          </div>
        </div>
      </div>

      {/* ── Esito ── */}
      <div style={{ ...s.card, marginBottom: 20 }}>
        <div style={s.cardTitle}>Esito</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={s.label}>Stato</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.outcome} onChange={e => set('outcome', e.target.value)}>
              {OUTCOMES.map(o => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
            </select>
          </div>
          {form.outcome === 'ordine' && (
            <div>
              <label style={s.label}>Ordine collegato</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.outcome_order_id || ''}
                onChange={e => set('outcome_order_id', e.target.value)}>
                <option value="">— nessuno —</option>
                {orders.filter(o => o.status !== 'PREVENTIVO')
                  .map(o => <option key={o.id} value={o.id}>{o.id} · {o.client}</option>)}
              </select>
            </div>
          )}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={s.label}>Note</label>
            <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={form.notes}
              placeholder="Feedback ricevuto, dettagli sull'invio…"
              onChange={e => set('notes', e.target.value)}/>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...btnGoldStyle, padding: '9px 26px' }} onClick={onSave} disabled={saving || !canSave}>
          {saving ? 'Salvataggio…' : 'Salva Invio'}
        </button>
        <button style={{ ...btnStyle(false), padding: '9px 20px' }} onClick={onCancel}>Annulla</button>
        {!canSave && (
          <span style={{ fontSize: 10, color: MUTED, alignSelf: 'center' }}>
            Servono destinatario, data e almeno un articolo
          </span>
        )}
      </div>
    </div>
  )
}
