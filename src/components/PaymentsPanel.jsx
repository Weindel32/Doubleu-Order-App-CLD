import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN } from '../tokens.js'
import { s, btnStyle, btnGoldStyle } from '../tokens.js'

const PAYMENT_TYPES   = ['acconto', 'intermedio', 'saldo']
const PAYMENT_METHODS = ['Bonifico', 'Contanti', 'Carta di Credito', 'Assegno', 'PayPal', 'Altro']

const TYPE_LABELS = { acconto: 'Acconto', intermedio: 'Intermedio', saldo: 'Saldo' }
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

export default function PaymentsPanel({ payments, setPayments, orderTotal }) {
  const [newP, setNewP] = useState({ type: 'acconto', amount: '', date: '', method: 'Bonifico', note: '', paid: false })

  const totalPaid    = payments.filter(p => p.paid).reduce((s, p)  => s + (parseFloat(p.amount) || 0), 0)
  const totalPending = payments.filter(p => !p.paid).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const residual     = Math.max(0, orderTotal - totalPaid - totalPending)

  const handleTypeChange = (type) => {
    const updates = { type }
    if (type === 'saldo') updates.amount = residual > 0 ? residual.toFixed(2) : newP.amount
    setNewP(prev => ({ ...prev, ...updates }))
  }

  const addPayment = () => {
    if (!newP.amount || !newP.date) return
    const p = { ...newP, id: `p${Date.now()}`, amount: parseFloat(newP.amount), date: isoToDisplay(newP.date) }
    setPayments([...payments, p])
    setNewP({ type: 'acconto', amount: '', date: '', method: 'Bonifico', note: '', paid: false })
  }

  const togglePaid = (id) =>
    setPayments(payments.map(p => p.id === id ? { ...p, paid: !p.paid } : p))

  const removePayment = (id) =>
    setPayments(payments.filter(p => p.id !== id))

  const inp = { ...s.input }

  return (
    <div style={{ ...s.card }}>
      <div style={s.cardTitle}>Pagamenti</div>

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
            const parse = s => { if (!s) return 0; const [d,m,y] = s.split('/'); return new Date(y,m-1,d).getTime() }
            return parse(a.date) - parse(b.date)
          }).map(p => {
            const tc = TYPE_COLORS[p.type] || TYPE_COLORS.acconto
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
                      <span style={{ fontSize: 11, color: MUTED }}>{p.date}</span>
                      {p.method && <span style={{ fontSize: 10, color: MUTED, opacity: 0.7 }}>{p.method}</span>}
                    </div>
                    {p.note && <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{p.note}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: p.paid ? GREEN : GOLD }}>
                    € {p.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
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
            <label style={s.label}>Data</label>
            <input type="date" style={{ ...inp, colorScheme: 'dark' }} value={newP.date} onChange={e => setNewP({ ...newP, date: e.target.value })} />
          </div>
          <div>
            <label style={s.label}>Metodo</label>
            <select style={inp} value={newP.method} onChange={e => setNewP({ ...newP, method: e.target.value })}>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>Nota</label>
          <input style={inp} value={newP.note} onChange={e => setNewP({ ...newP, note: e.target.value })} placeholder="Es. Acconto 50%" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, color: MUTED }}>
            <input type="checkbox" checked={newP.paid} onChange={e => setNewP({ ...newP, paid: e.target.checked })}
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
