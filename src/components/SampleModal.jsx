import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, GREEN, BORDER, ADULT_SIZES, KIDS_SIZES, CATEGORIES } from '../tokens.js'
import { s, btnStyle, btnGoldStyle } from '../tokens.js'
import SpAutocomplete from './SpAutocomplete.jsx'
import DatePicker from './DatePicker.jsx'
import { OutcomeBadge } from './SampleTimeline.jsx'
import {
  PURPOSES, PURPOSE_LABELS, alwaysReturned, OUTCOMES, OUTCOME_LABELS, OUTCOME_CFG,
  todayISO, addDaysISO, itemCostValue, itemPriceValue, euro, FOLLOW_UP_DAYS,
} from '../utils/samples.js'
import { generateSamplePDF } from '../utils/pdfSample.js'

const inp = { ...s.input, fontSize: 14 }

// _key identifica la riga lato client (per lo stato "espansa/chiusa"),
// indipendente dalla posizione nell'array e dall'id del db — non viene
// salvato: dataService whitelista solo i campi che conosce.
const newKey = () => `k${Date.now()}${Math.random().toString(36).slice(2)}`

const EMPTY_ITEM = () => ({
  _key: newKey(),
  sp: '', description: '', category: '', color: '', size: '', quantity: 1,
  unit_cost: '', unit_price: '', returned: false,
  outcome: 'in_attesa', outcome_date: '', outcome_note: '', outcome_order_id: '',
  revision_requested: false,
})

export function emptyShipment(prefill = {}) {
  return {
    client_id: null, prospect_id: null, recipient_name: '', contact_name: '',
    shipped_date: todayISO(), purpose: 'valutazione',
    return_required: false, return_due_date: '', returned_date: '',
    carrier: '', tracking: '', shipping_cost: '',
    follow_up_date: '', notes: '', omaggio: false,
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
    shipping_cost:   sh.shipping_cost ? String(sh.shipping_cost) : '',
    return_due_date: sh.return_due_date || '',
    returned_date:   sh.returned_date   || '',
    follow_up_date:  sh.follow_up_date  || '',
    omaggio:         !!sh.omaggio,
    contact_name:    sh.contact_name || '',
    carrier:         sh.carrier  || '',
    tracking:        sh.tracking || '',
    notes:           sh.notes    || '',
    items: (sh.items || []).length > 0
      ? sh.items.map(it => ({
          ...it,
          _key: it.id || newKey(),
          unit_cost:  it.unit_cost  ? String(it.unit_cost)  : '',
          unit_price: it.unit_price ? String(it.unit_price) : '',
          quantity:   it.quantity || 1,
          outcome:      it.outcome || 'in_attesa',
          outcome_date: it.outcome_date || '',
          outcome_note: it.outcome_note || '',
          outcome_order_id: it.outcome_order_id || '',
          revision_requested: !!it.revision_requested,
        }))
      : [EMPTY_ITEM()],
  }
}

const SIZE_HINTS = [...ADULT_SIZES, ...KIDS_SIZES, 'UNI']

export default function SampleModal({ form, setForm, clients = [], prospects = [], orders = [], onSave, onCancel, saving, title }) {
  // 'cliente' | 'prospect' | 'altro' — dedotto dai riferimenti già presenti
  const [target, setTarget] = useState(
    form.client_id ? 'cliente' : form.prospect_id ? 'prospect' : 'altro'
  )

  // Righe articolo: chiuse di default (basta descrizione + q.tà + esito
  // per orientarsi), aperte solo quelle ancora vuote da compilare — così
  // un invio con più articoli non costringe a scrollare tutto il modal.
  const [expanded, setExpanded] = useState(() => new Set(
    form.items.filter(it => !((it.sp || '').trim() || (it.description || '').trim())).map(it => it._key)
  ))
  const toggleExpanded = (key) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const setItem = (i, k, v) => setForm(f => ({
    ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it),
  }))

  // Cambiare esito imposta la data di oggi se non già presente, come
  // già si fa per la data di rientro sui set misure.
  const setItemOutcome = (i, outcome) => setForm(f => ({
    ...f, items: f.items.map((it, idx) => idx === i
      ? { ...it, outcome, outcome_date: it.outcome_date || (outcome !== 'in_attesa' ? todayISO() : it.outcome_date) }
      : it),
  }))

  const addItem = () => {
    const item = EMPTY_ITEM()
    setForm(f => ({ ...f, items: [...f.items, item] }))
    setExpanded(prev => new Set(prev).add(item._key))
  }
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

  // Regalare la merce e pretenderla indietro sono in contraddizione:
  // attivare l'omaggio azzera la richiesta di reso, e la sezione Reso
  // sparisce anche per i set misure, che altrimenti rientrano sempre.
  const toggleGift = () => setForm(f => ({
    ...f,
    omaggio: !f.omaggio,
    return_required: !f.omaggio ? false : f.return_required,
  }))

  // I set misure rientrano sempre: la scelta non è modificabile.
  const forcedReturn = alwaysReturned(form.purpose) && !form.omaggio
  const mustReturn   = !form.omaggio && (forcedReturn || form.return_required)

  const choosePurpose = (purpose) => setForm(f => ({
    ...f,
    purpose,
    return_required: alwaysReturned(purpose) ? true : f.return_required,
    return_due_date: alwaysReturned(purpose) && !f.return_due_date
      ? addDaysISO(f.shipped_date, 30)
      : f.return_due_date,
  }))

  const costValue  = form.items.reduce((v, it) => v + itemCostValue(it), 0)
  const priceValue = form.items.reduce((v, it) => v + itemPriceValue(it), 0)
  const totalCost  = costValue + (parseFloat(form.shipping_cost) || 0)
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
              style={{ padding: '6px 14px', borderRadius: 3, cursor: 'pointer', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
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
            <DatePicker label="Data invio *" value={form.shipped_date} onChange={v => set('shipped_date', v)}/>
          </div>
          <div>
            <label style={s.label}>Motivo</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.purpose} onChange={e => choosePurpose(e.target.value)}>
              {PURPOSES.map(p => <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>)}
            </select>
          </div>
          <div>
            <DatePicker label="Follow-up" value={form.follow_up_date} onChange={v => set('follow_up_date', v)}/>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
              Vuoto = sollecito dopo {FOLLOW_UP_DAYS} giorni
            </div>
          </div>
        </div>

        {/* L'omaggio non è un motivo alternativo: un invio in valutazione
            può essere anche regalato, e va contato nello storico. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div onClick={toggleGift}
            style={{ width: 40, height: 22, borderRadius: 11, position: 'relative', flexShrink: 0, cursor: 'pointer',
              background: form.omaggio ? CLAY : 'rgba(255,255,255,0.12)', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 3, left: form.omaggio ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }}/>
          </div>
          <span style={{ fontSize: 13, color: form.omaggio ? CLAY : MUTED }}>
            {form.omaggio ? 'Regalati al cliente' : 'Non regalati'}
          </span>
          <span style={{ fontSize: 11, color: MUTED, fontStyle: 'italic' }}>
            — la merce resta al destinatario e non verrà fatturata
          </span>
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
              <DatePicker label="Rientro previsto" value={form.return_due_date} onChange={v => set('return_due_date', v)}/>
            </div>
            <div>
              <DatePicker label="Rientrato il" value={form.returned_date} onChange={v => set('returned_date', v)}/>
            </div>
          </div>
        )}
      </div>

      {/* ── Articoli ── */}
      <div style={{ ...s.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ ...s.cardTitle, marginBottom: 0 }}>Campioni Inviati</div>
          <button style={{ ...btnGoldStyle, padding: '4px 14px', fontSize: 11 }} onClick={addItem}>+ Riga</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {form.items.map((it, i) => {
            const outCfg = OUTCOME_CFG[it.outcome || 'in_attesa']
            const isOpen = expanded.has(it._key)
            const label = [it.sp, it.description, it.color, it.size, it.quantity > 1 ? `×${it.quantity}` : null]
              .filter(Boolean).join(' ')
            return (
            <div key={it._key} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderLeft: `3px solid ${outCfg.color}`, borderRadius: 8, overflow: 'hidden' }}>

              {/* Intestazione riga: sempre visibile, click per espandere */}
              <div onClick={() => toggleExpanded(it._key)}
                style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <span style={{ color: GOLD, fontSize: 16, flexShrink: 0, padding: '4px 2px' }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={{ fontSize: 13, color: CREAM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label || 'Nuovo articolo'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  {it.revision_requested && (
                    <span title="Richiede modifiche" style={{ fontSize: 11, letterSpacing: 1, padding: '2px 8px', borderRadius: 2,
                      color: '#e8c96e', background: 'rgba(232,201,110,0.12)', border: '1px solid rgba(232,201,110,0.35)' }}>
                      ✎ DA RIVEDERE
                    </span>
                  )}
                  <OutcomeBadge outcome={it.outcome || 'in_attesa'}/>
                  <button onClick={e => { e.stopPropagation(); removeItem(i) }} disabled={form.items.length === 1}
                    title="Rimuovi riga"
                    style={{ padding: '7px 13px', borderRadius: 4, fontSize: 16, lineHeight: 1, marginLeft: 4,
                      cursor: form.items.length === 1 ? 'not-allowed' : 'pointer',
                      background: 'transparent', border: '1px solid rgba(196,98,58,0.35)',
                      color: CLAY, opacity: form.items.length === 1 ? 0.35 : 1 }}>×</button>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '0 18px 18px' }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 0.6fr 0.8fr 0.8fr', gap: 10, marginBottom: 10 }}>
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
                      <label style={s.label}>Costo un. (€)</label>
                      <input style={inp} type="number" step="0.01" value={it.unit_cost} placeholder="0"
                        onChange={e => setItem(i, 'unit_cost', e.target.value)}/>
                    </div>
                    <div>
                      <label style={s.label}>Prezzo club (€)</label>
                      <input style={inp} type="number" step="0.01" value={it.unit_price} placeholder="0"
                        onChange={e => setItem(i, 'unit_price', e.target.value)}/>
                    </div>
                  </div>

                  {mustReturn && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <input type="checkbox" checked={!!it.returned} onChange={e => setItem(i, 'returned', e.target.checked)}
                        style={{ cursor: 'pointer', accentColor: GREEN }}/>
                      <span style={{ fontSize: 11, color: it.returned ? GREEN : MUTED }}>Rientrato</span>
                    </div>
                  )}

                  {/* Esito di questa riga: articoli diversi nello stesso invio
                      possono avere feedback diversi */}
                  <div style={{ paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: it.outcome === 'ordine' ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 8 }}>
                      <div>
                        <label style={s.label}>Esito articolo</label>
                        <select style={{ ...inp, cursor: 'pointer' }} value={it.outcome || 'in_attesa'} onChange={e => setItemOutcome(i, e.target.value)}>
                          {OUTCOMES.map(o => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
                        </select>
                      </div>
                      {it.outcome === 'ordine' && (
                        <div>
                          <label style={s.label}>Ordine collegato</label>
                          <select style={{ ...inp, cursor: 'pointer' }} value={it.outcome_order_id || ''}
                            onChange={e => setItem(i, 'outcome_order_id', e.target.value)}>
                            <option value="">— nessuno —</option>
                            {orders.filter(o => o.status !== 'PREVENTIVO')
                              .map(o => <option key={o.id} value={o.id}>{o.id} · {o.client}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    {(it.outcome || 'in_attesa') !== 'in_attesa' && (
                      <>
                        <input style={inp} value={it.outcome_note || ''} placeholder="Nota sul feedback ricevuto per questo articolo…"
                          onChange={e => setItem(i, 'outcome_note', e.target.value)}/>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!it.revision_requested}
                            onChange={e => setItem(i, 'revision_requested', e.target.checked)}
                            style={{ cursor: 'pointer', accentColor: '#e8c96e' }}/>
                          <span style={{ fontSize: 11, color: it.revision_requested ? '#e8c96e' : MUTED }}>
                            Richiede modifiche prima di riproporlo — a prescindere dall'esito
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>

        <datalist id="du-sample-sizes">
          {SIZE_HINTS.map(sz => <option key={sz} value={sz}/>)}
        </datalist>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}`, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: MUTED }}>PEZZI</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: CREAM }}>{pieces}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: MUTED }}>VALORE A COSTO</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: GOLD }}>{euro(costValue, 2)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: MUTED }}>VALORE AL CLUB</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#7aaee8' }}>{euro(priceValue, 2)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: MUTED }}>COSTO CON SPEDIZIONE</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: GOLD }}>{euro(totalCost, 2)}</div>
          </div>
        </div>
      </div>

      {/* ── Note generali sull'invio ── */}
      <div style={{ ...s.card, marginBottom: 20 }}>
        <div style={s.cardTitle}>Note Invio</div>
        <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.notes}
          placeholder="Dettagli sulla spedizione, contesto dell'invio…"
          onChange={e => set('notes', e.target.value)}/>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={{ ...btnGoldStyle, padding: '9px 26px' }} onClick={onSave} disabled={saving || !canSave}>
          {saving ? 'Salvataggio…' : 'Salva Invio'}
        </button>
        <button style={{ ...btnStyle(false), padding: '9px 20px' }} onClick={onCancel}>Annulla</button>
        {form.id && (
          <button style={{ ...btnStyle(false), padding: '9px 20px' }}
            onClick={() => {
              const html = generateSamplePDF(form, clients, prospects)
              const w = window.open('', '_blank')
              w.document.write(html); w.document.close()
            }}>
            Bolla Campioni
          </button>
        )}
        {!canSave && (
          <span style={{ fontSize: 12, color: MUTED, alignSelf: 'center' }}>
            Servono destinatario, data e almeno un articolo
          </span>
        )}
      </div>
    </div>
  )
}
