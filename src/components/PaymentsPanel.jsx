import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN } from '../tokens.js'
import { s, btnStyle, btnGoldStyle } from '../tokens.js'
import DatePicker from './DatePicker.jsx'
import { paymentDue, paymentDelay, formatItalian, splitPayment, splitAmount, isSuspectDueDate, depositDeviation } from '../utils/payments.js'

const PAYMENT_TYPES   = ['acconto', 'intermedio', 'saldo']
const PAYMENT_METHODS = ['Bonifico', 'Contanti', 'Carta di Credito', 'Assegno', 'PayPal', 'Altro']

const TYPE_LABELS = { acconto: 'Acconto', intermedio: 'Intermedio', saldo: 'Saldo' }
const DUE_LABELS  = { fissa: 'Data fissa', consegna: 'Alla consegna' }
const TYPE_COLORS = {
  acconto:    { bg: 'rgba(196,98,58,0.15)', color: CLAY,  border: 'rgba(196,98,58,0.3)'  },
  intermedio: { bg: 'rgba(184,150,90,0.12)', color: GOLD, border: 'rgba(184,150,90,0.3)' },
  saldo:      { bg: 'rgba(74,158,110,0.15)', color: GREEN, border: 'rgba(74,158,110,0.3)' },
}

const isoToDisplay = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const todayDisplay = () => {
  const t = new Date()
  return `${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`
}

const displayToIso = (display) => {
  if (!display) return ''
  const [d, m, y] = display.split('/')
  return `${y}-${m}-${d}`
}

export default function PaymentsPanel({ payments, setPayments, orderTotal, shipping, setShipping, invoiceNumber, setInvoiceNumber, order, clientTerms, onInstallmentsGranted }) {
  const emptyPayment = { type: 'acconto', amount: '', date: '', method: 'Bonifico', note: '', paid: false, dueMode: 'fissa', dueOffsetDays: 0, paidDate: '' }
  const [newP, setNewP] = useState(emptyPayment)
  const [editingId, setEditingId] = useState(null)
  const [splitting, setSplitting] = useState(null)   // { id, parts, firstDate, everyDays }
  const [editP, setEditP] = useState(null)

  const totalPaid    = payments.filter(p => p.paid).reduce((s, p)  => s + (parseFloat(p.amount) || 0), 0)
  const totalPending = payments.filter(p => !p.paid).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const residual     = Math.max(0, orderTotal - totalPaid - totalPending)

  const handleTypeChange = (type) => {
    const updates = { type }
    if (type === 'saldo') updates.amount = residual > 0 ? residual.toFixed(2) : newP.amount
    setNewP(prev => ({ ...prev, ...updates }))
  }

  // La scadenza effettiva resta sempre scritta nel campo date, anche quando e'
  // ancorata alla consegna: Doubleu Finance legge la tabella pagamenti
  // direttamente e scarta le rate senza data, quindi una rata ancorata con
  // date vuoto sparirebbe dal suo modale incassi. Il database ha comunque un
  // trigger che la ricalcola se la consegna si sposta.
  const dueDateFor = (form) => {
    if (form.dueMode !== 'consegna') return isoToDisplay(form.date)
    const due = paymentDue(order, { ...form, dueOffsetDays: parseInt(form.dueOffsetDays) || 0 })
    return formatItalian(due.date) || null
  }

  // Rateizzazione di una rata aperta. E' un'eccezione negoziata sul singolo
  // ordine, non una condizione del cliente: per questo vive qui e non in
  // anagrafica, e marca l'ordine come dilazionato.
  const openSplit = (p) => setSplitting({
    id: p.id,
    parts: 3,
    firstDate: displayToIso(paymentDue(order, p).date ? formatItalian(paymentDue(order, p).date) : '') || '',
    everyDays: 30,
  })

  const confirmSplit = () => {
    if (!splitting) return
    const original = payments.find(p => p.id === splitting.id)
    if (!original) { setSplitting(null); return }
    const tranche = splitPayment(original, {
      parts: splitting.parts,
      firstDateISO: splitting.firstDate,
      everyDays: splitting.everyDays,
    })
    setPayments(payments.flatMap(p => p.id === splitting.id ? tranche : [p]))
    onInstallmentsGranted?.(true)
    setSplitting(null)
  }

  // Condizioni concordate in anagrafica: si applicano con un clic invece di
  // reinserire le stesse due rate a ogni ordine. Resta un'azione esplicita —
  // generare rate da sole, senza che nessuno le abbia chieste, e' il tipo di
  // automatismo che poi ci si dimentica di aver subito.
  // Sotto la soglia concordata l'acconto non si propone: su un ordine da venti
  // euro non ha senso chiederlo.
  const depositMin = Number(clientTerms?.payment_deposit_min_amount) || 0
  const sopraSoglia = !depositMin || (parseFloat(orderTotal) || 0) >= depositMin
  const depositPct = sopraSoglia ? Number(clientTerms?.payment_deposit_percent) : 0
  const canApplyTerms = !!clientTerms
    && payments.length === 0
    && orderTotal > 0
    && (depositPct > 0 || clientTerms.payment_balance_due_mode)

  const applyClientTerms = () => {
    const rows = []
    const now = Date.now()
    const balanceMode   = clientTerms.payment_balance_due_mode || 'consegna'
    const balanceOffset = parseInt(clientTerms.payment_balance_offset_days) || 0
    let residuo = orderTotal

    if (depositPct > 0) {
      const amount = Math.round(orderTotal * depositPct) / 100
      residuo -= amount
      rows.push({
        id: `p${now}`, type: 'acconto', amount, method: 'Bonifico',
        note: `Acconto ${depositPct}%`, paid: false,
        dueMode: 'fissa', dueOffsetDays: 0, date: todayDisplay(), paidDate: null,
      })
    }
    if (residuo > 0.005) {
      const saldo = {
        id: `p${now + 1}`, type: 'saldo', amount: Math.round(residuo * 100) / 100,
        method: 'Bonifico', note: '', paid: false,
        dueMode: balanceMode, dueOffsetDays: balanceOffset, paidDate: null,
      }
      saldo.date = dueDateFor({ ...saldo, date: '' })
      rows.push(saldo)
    }
    if (rows.length) setPayments(rows)
  }

  // Con scadenza ancorata alla consegna la data fissa non serve: la calcola
  // paymentDue() sulla consegna reale dell'ordine.
  const addPayment = () => {
    if (!newP.amount) return
    if (newP.dueMode === 'fissa' && !newP.date) return
    const p = {
      ...newP, id: `p${Date.now()}`, amount: parseFloat(newP.amount),
      date: dueDateFor(newP),
      dueOffsetDays: parseInt(newP.dueOffsetDays) || 0,
      paidDate: newP.paid ? (isoToDisplay(newP.paidDate) || todayDisplay()) : null,
    }
    setPayments([...payments, p])
    setNewP(emptyPayment)
  }

  // Spuntare "pagato" registra oggi come data di incasso; se serve un'altra
  // data si corregge dalla riga in modifica, come per le date di consegna.
  const togglePaid = (id) =>
    setPayments(payments.map(p => p.id === id
      ? { ...p, paid: !p.paid, paidDate: !p.paid ? (p.paidDate || todayDisplay()) : null }
      : p))

  const removePayment = (id) =>
    setPayments(payments.filter(p => p.id !== id))

  const startEdit = (p) => {
    setEditingId(p.id)
    setEditP({
      ...p,
      date: displayToIso(p.date),
      paidDate: displayToIso(p.paidDate),
      dueMode: p.dueMode || 'fissa',
      dueOffsetDays: p.dueOffsetDays || 0,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditP(null)
  }

  const saveEdit = () => {
    if (!editP.amount) return
    if (editP.dueMode === 'fissa' && !editP.date) return
    setPayments(payments.map(p =>
      p.id === editingId
        ? {
            ...editP,
            amount: parseFloat(editP.amount),
            date: dueDateFor(editP),
            dueOffsetDays: parseInt(editP.dueOffsetDays) || 0,
            paidDate: editP.paid ? (isoToDisplay(editP.paidDate) || todayDisplay()) : null,
            // Correggere a mano la data di incasso la rende un dato
            // registrato: smette di contare come ereditata dall'archivio.
            paidDateVerified: p.paidDateVerified !== false
              || isoToDisplay(editP.paidDate) !== (p.paidDate || null),
          }
        : p
    ))
    cancelEdit()
  }

  const inp = { ...s.input }

  // Selettore scadenza condiviso fra il form di inserimento e quello di
  // modifica: data fissa oppure ancorata alla consegna reale + N giorni.
  const DueFields = ({ value, onChange }) => {
    const preview = paymentDue(order, { ...value, dueOffsetDays: parseInt(value.dueOffsetDays) || 0 })
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={s.label}>Scadenza</label>
            <select style={inp} value={value.dueMode || 'fissa'} onChange={e => onChange({ ...value, dueMode: e.target.value })}>
              <option value="fissa">Data fissa</option>
              <option value="consegna">Alla consegna</option>
            </select>
          </div>
          {value.dueMode === 'consegna' ? (
            <div>
              <label style={s.label}>Giorni dopo la consegna</label>
              <input type="number" min="0" style={inp} value={value.dueOffsetDays ?? 0}
                onChange={e => onChange({ ...value, dueOffsetDays: e.target.value })} placeholder="0" />
            </div>
          ) : (
            <DatePicker label="Data" value={value.date} onChange={v => onChange({ ...value, date: v })} />
          )}
        </div>
        {value.dueMode === 'consegna' && (
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1, marginTop: 8 }}>
            {preview.date
              ? `Scade il ${formatItalian(preview.date)}${preview.estimated ? ' — stima sulla consegna prevista, si ricalcola alla consegna reale' : ''}`
              : 'Nessuna data di consegna sull\'ordine: la scadenza si calcola quando la inserisci.'}
          </div>
        )}
      </div>
    )
  }

  // Data di incasso: compare solo quando il pagamento risulta saldato.
  const PaidDateField = ({ value, onChange }) => value.paid ? (
    <div style={{ marginBottom: 10 }}>
      <DatePicker label="Incassato il" value={value.paidDate} onChange={v => onChange({ ...value, paidDate: v })} />
    </div>
  ) : null

  return (
    <div style={{ ...s.card }}>
      <div style={s.cardTitle}>Pagamenti</div>

      {canApplyTerms && (
        <div style={{ background:'rgba(184,150,90,0.06)', border:`1px solid rgba(184,150,90,0.25)`, borderRadius:8, padding:'14px 16px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:2, color:GOLD, marginBottom:3 }}>CONDIZIONI DEL CLIENTE</div>
            <div style={{ fontSize:11, color:MUTED }}>
              {depositPct > 0
                ? `Acconto ${depositPct}%`
                : depositMin && !sopraSoglia
                  ? `Nessun acconto sotto € ${depositMin.toLocaleString('it-IT')}`
                  : 'Nessun acconto'}
              {' · saldo '}
              {(clientTerms.payment_balance_due_mode || 'consegna') === 'consegna'
                ? `alla consegna${parseInt(clientTerms.payment_balance_offset_days) ? ` + ${clientTerms.payment_balance_offset_days}gg` : ''}`
                : 'a data da concordare'}
            </div>
          </div>
          <button style={{ ...btnGoldStyle, padding:'8px 18px', fontSize:9 }} onClick={applyClientTerms}>
            Applica
          </button>
        </div>
      )}

      {(() => {
        const dev = depositDeviation(clientTerms, payments, orderTotal)
        if (!dev) return null
        return (
          <div style={{ background: 'rgba(196,98,58,0.08)', border: `1px solid rgba(196,98,58,0.3)`, borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: CLAY, marginBottom: 4 }}>DIVERSO DALLE CONDIZIONI CONCORDATE</div>
            <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>
              Con questo cliente e' concordato un acconto del {dev.expected}%, qui e' {dev.actual}% ({dev.reason}).
              Nessun problema se e' una scelta: l'avviso serve solo a non derogare per distrazione.
            </div>
          </div>
        )
      })()}

      {/* Shipping cost */}
      {setShipping && (
        <div style={{ background: 'rgba(184,150,90,0.06)', border: `1px solid rgba(184,150,90,0.2)`, borderRadius: 8, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, marginBottom: 2 }}>SPESE DI SPEDIZIONE</div>
            <div style={{ fontSize: 10, color: MUTED, opacity: 0.8 }}>Si sommano al totale. Lascia vuoto o 0 per spedizione gratuita.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, color: GOLD }}>€</span>
            <input
              type="number" min="0" step="0.01"
              style={{ ...inp, width: 120, textAlign: 'right' }}
              value={shipping}
              onChange={e => setShipping(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>
      )}

      {/* Invoice reference */}
      {setInvoiceNumber && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, marginBottom: 2 }}>NUMERO FATTURA</div>
            <div style={{ fontSize: 10, color: MUTED, opacity: 0.8 }}>Riferimento del documento emesso. Se inserito, compare anche sul PDF cliente.</div>
          </div>
          <input
            style={{ ...inp, width: 200 }}
            value={invoiceNumber}
            onChange={e => setInvoiceNumber(e.target.value)}
            placeholder="Es. FT/2026/152"
          />
        </div>
      )}

      {/* Summary bar */}
      {orderTotal > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Totale Ordine',  value: orderTotal,    color: CREAM },
            { label: 'Incassato',      value: totalPaid,     color: GREEN },
            { label: 'In Sospeso',     value: totalPending,  color: GOLD  },
            { label: 'Residuo',        value: residual,      color: residual > 0 ? CLAY : MUTED },
          ].map(item => (
            <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: item.color }}>
                € {item.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {orderTotal > 0 && (
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 20, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${Math.min(100, (totalPaid / orderTotal) * 100)}%`, background: GREEN, transition: 'width 0.4s' }} />
          <div style={{ width: `${Math.min(100, (totalPending / orderTotal) * 100)}%`, background: GOLD, opacity: 0.6, transition: 'width 0.4s' }} />
        </div>
      )}

      {/* Existing payments */}
      {payments.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {[...payments].sort((a, b) => {
            const when = p => paymentDue(order, p).date?.getTime() ?? 0
            return when(a) - when(b)
          }).map(p => {
            const tc    = TYPE_COLORS[p.type] || TYPE_COLORS.acconto
            const due     = paymentDue(order, p)
            const delay   = paymentDelay(order, p)
            // Una scadenza lontana anni dalla data dell'ordine e' un refuso:
            // va segnalata qui, dove si corregge, non solo nelle statistiche.
            const suspect = isSuspectDueDate(order, p)

            if (editingId === p.id && editP) {
              return (
                <div key={p.id} style={{ padding: '12px 0', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, marginBottom: 10 }}>MODIFICA PAGAMENTO</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={s.label}>Tipo</label>
                      <select style={inp} value={editP.type} onChange={e => setEditP({ ...editP, type: e.target.value })}>
                        {PAYMENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Importo €</label>
                      <input type="number" style={inp} value={editP.amount} onChange={e => setEditP({ ...editP, amount: e.target.value })} />
                    </div>
                    <div>
                      <label style={s.label}>Metodo</label>
                      <select style={inp} value={editP.method} onChange={e => setEditP({ ...editP, method: e.target.value })}>
                        {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <DueFields value={editP} onChange={setEditP} />
                  <PaidDateField value={editP} onChange={setEditP} />
                  <div style={{ marginBottom: 10 }}>
                    <label style={s.label}>Nota</label>
                    <input style={inp} value={editP.note} onChange={e => setEditP({ ...editP, note: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, color: MUTED }}>
                      <input type="checkbox" checked={editP.paid}
                        onChange={e => setEditP({ ...editP, paid: e.target.checked, paidDate: e.target.checked ? (editP.paidDate || displayToIso(todayDisplay())) : '' })}
                        style={{ accentColor: GREEN }} />
                      Già pagato
                    </label>
                    <button style={{ ...btnGoldStyle, padding: '7px 18px', fontSize: 9 }} onClick={saveEdit}>Salva</button>
                    <button style={{ ...btnStyle, padding: '7px 18px', fontSize: 9 }} onClick={cancelEdit}>Annulla</button>
                  </div>
                </div>
              )
            }

            if (splitting?.id === p.id) {
              const anteprima = splitAmount(p.amount, splitting.parts)
              const start = splitting.firstDate ? new Date(`${splitting.firstDate}T00:00:00`) : null
              return (
                <div key={p.id} style={{ padding: '16px', marginBottom: 10, background: 'rgba(184,150,90,0.06)', border: `1px solid rgba(184,150,90,0.3)`, borderRadius: 8 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: GOLD, marginBottom: 4 }}>RATEIZZA · {TYPE_LABELS[p.type]} € {(parseFloat(p.amount)||0).toLocaleString('it-IT',{minimumFractionDigits:2})}</div>
                  <div style={{ fontSize: 10, color: MUTED, opacity: 0.8, marginBottom: 14 }}>
                    La rata viene sostituita da piu' tranche a date fisse. L'ordine resta segnato come dilazionato.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={s.label}>Numero tranche</label>
                      <select style={inp} value={splitting.parts} onChange={e => setSplitting(v => ({ ...v, parts: parseInt(e.target.value) }))}>
                        {[2,3,4,5,6,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <DatePicker label="Prima scadenza" value={splitting.firstDate} onChange={v => setSplitting(s2 => ({ ...s2, firstDate: v }))}/>
                    <div>
                      <label style={s.label}>Ogni quanti giorni</label>
                      <input type="number" min="1" style={inp} value={splitting.everyDays}
                        onChange={e => setSplitting(v => ({ ...v, everyDays: e.target.value }))}/>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
                    {anteprima.map((amount, i) => {
                      const d = start ? new Date(start) : null
                      if (d) d.setDate(d.getDate() + i * (parseInt(splitting.everyDays) || 30))
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: MUTED, padding: '3px 0' }}>
                          <span>{i === anteprima.length - 1 ? TYPE_LABELS[p.type] || 'Saldo' : `Rata ${i+1}`}</span>
                          <span style={{ color: CREAM }}>
                            € {amount.toLocaleString('it-IT',{minimumFractionDigits:2})}
                            <span style={{ color: MUTED, marginLeft: 10 }}>{d ? formatItalian(d) : '—'}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ ...btnGoldStyle, padding: '7px 18px', fontSize: 9 }} onClick={confirmSplit} disabled={!splitting.firstDate}>Conferma</button>
                    <button style={{ ...btnStyle(false), padding: '7px 18px', fontSize: 9 }} onClick={() => setSplitting(null)}>Annulla</button>
                  </div>
                </div>
              )
            }

            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.05)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Paid toggle */}
                  <div
                    onClick={() => togglePaid(p.id)}
                    style={{
                      width: 20, height: 20, borderRadius: '50%', cursor: 'pointer',
                      border: `2px solid ${p.paid ? GREEN : BORDER}`,
                      background: p.paid ? GREEN : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.2s',
                    }}
                  >
                    {p.paid && <span style={{ color: 'white', fontSize: 11, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 2, fontSize: 9, letterSpacing: 2, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                        {TYPE_LABELS[p.type]}
                      </span>
                      <span style={{ fontSize: 11, color: MUTED }}>
                        {due.date ? formatItalian(due.date) : '—'}
                        {p.dueMode === 'consegna' && <span style={{ opacity: 0.6 }}> · alla consegna{p.dueOffsetDays ? ` +${p.dueOffsetDays}gg` : ''}{due.estimated ? ' (stima)' : ''}</span>}
                      </span>
                      {p.method && <span style={{ fontSize: 10, color: MUTED, opacity: 0.7 }}>{p.method}</span>}
                      {suspect && (
                        <span style={{ padding: '2px 8px', borderRadius: 2, fontSize: 9, letterSpacing: 1, fontWeight: 700, background: 'rgba(196,98,58,0.15)', color: CLAY, border: `1px solid rgba(196,98,58,0.35)` }}>
                          SCADENZA DA CONTROLLARE
                        </span>
                      )}
                      {!p.paid && delay !== null && delay > 0 && (
                        <span style={{ padding: '2px 8px', borderRadius: 2, fontSize: 9, letterSpacing: 1, fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)' }}>
                          SCADUTO DA {delay}GG
                        </span>
                      )}
                    </div>
                    {p.paid && p.paidDate && (
                      <div style={{ fontSize: 10, color: delay !== null && delay > 0 ? CLAY : GREEN, marginTop: 3 }}>
                        Incassato il {p.paidDate}
                        {delay !== null && delay > 0 && ` · ${delay}gg di ritardo`}
                        {delay !== null && delay < 0 && ` · ${Math.abs(delay)}gg di anticipo`}
                      </div>
                    )}
                    {suspect && (
                      <div style={{ fontSize: 10, color: CLAY, marginTop: 3, lineHeight: 1.5 }}>
                        La scadenza non e' coerente con la data dell'ordine ({order?.date || '—'}): controlla l'anno.
                        Finche' resta cosi' questa rata non conta nel rating del cliente.
                      </div>
                    )}
                    {p.note && <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{p.note}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: p.paid ? GREEN : GOLD }}>
                    € {p.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                  {!p.paid && (parseFloat(p.amount) || 0) > 0 && (
                    <button onClick={() => openSplit(p)}
                      style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 3, color: MUTED, cursor: 'pointer', fontSize: 9, letterSpacing: 1, padding: '3px 8px' }}
                      title="Dividi questa rata in piu' tranche">
                      RATEIZZA
                    </button>
                  )}
                  <button onClick={() => startEdit(p)}
                    style={{ background: 'none', border: 'none', color: GOLD, cursor: 'pointer', fontSize: 12, opacity: 0.7, padding: '0 4px' }}
                    title="Modifica pagamento">
                    ✎
                  </button>
                  <button onClick={() => removePayment(p.id)}
                    style={{ background: 'none', border: 'none', color: CLAY, cursor: 'pointer', fontSize: 14, opacity: 0.6, padding: '0 4px' }}>
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add payment form */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px' }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, marginBottom: 12 }}>AGGIUNGI PAGAMENTO</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={s.label}>Tipo</label>
            <select style={inp} value={newP.type} onChange={e => handleTypeChange(e.target.value)}>
              {PAYMENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Importo €</label>
            <input type="number" style={inp} value={newP.amount} onChange={e => setNewP({ ...newP, amount: e.target.value })} placeholder="0.00" />
          </div>
          <div>
            <label style={s.label}>Metodo</label>
            <select style={inp} value={newP.method} onChange={e => setNewP({ ...newP, method: e.target.value })}>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <DueFields value={newP} onChange={setNewP} />
        <PaidDateField value={newP} onChange={setNewP} />
        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>Nota</label>
          <input style={inp} value={newP.note} onChange={e => setNewP({ ...newP, note: e.target.value })} placeholder="Es. Acconto 50%" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, color: MUTED }}>
            <input type="checkbox" checked={newP.paid}
              onChange={e => setNewP({ ...newP, paid: e.target.checked, paidDate: e.target.checked ? (newP.paidDate || displayToIso(todayDisplay())) : '' })}
              style={{ accentColor: GREEN }} />
            Già pagato
          </label>
          <button style={{ ...btnGoldStyle, padding: '7px 18px', fontSize: 9 }} onClick={addPayment}>
            + Aggiungi
          </button>
        </div>
      </div>
    </div>
  )
}
