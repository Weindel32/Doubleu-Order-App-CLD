import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE, ORDER_STATUSES } from '../tokens.js'
import { badgeStyle } from '../tokens.js'
import { daysUntilDelivery, paymentSummary } from '../utils/helpers.js'

function fmt(n) {
  return '€' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const FILTERS = ['Attivi', 'Tutti', ...ORDER_STATUSES]

// Ricerca senza accenti e maiuscole: "citta" trova "Città".
const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function MobileOrders({ orders, onSelectOrder, filter, onFilterChange }) {
  const [query, setQuery] = useState('')
  const q = norm(query.trim())

  // Con una ricerca si cerca in tutti gli ordini, a prescindere dal filtro:
  // un ordine consegnato non deve sparire solo perche' il filtro e' "Attivi".
  const filtered = orders.filter(o => {
    if (q) return [o.client, o.id, o.clientContact, o.clientCity, o.invoiceNumber].some(v => norm(v).includes(q))
    if (filter === 'Tutti') return true
    if (filter === 'Attivi') return o.status !== 'CONSEGNATO'
    return o.status === filter
  })

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Ricerca */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <input type="text" inputMode="search" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Cerca club, n. ordine, referente…" autoCapitalize="none" autoCorrect="off" enterKeyHint="search"
          style={{
            width: '100%', minHeight: 46, boxSizing: 'border-box', padding: '12px 40px 12px 14px',
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${query ? GOLD : BORDER}`, borderRadius: 10,
            color: CREAM, fontSize: 16, outline: 'none', fontFamily: "'Josefin Sans', sans-serif",
            WebkitAppearance: 'none', appearance: 'none',
          }}/>
        {query && (
          <button onClick={() => setQuery('')} aria-label="Cancella ricerca" style={{
            position: 'absolute', right: 0, top: 0, width: 44, height: 46, background: 'none', border: 'none',
            color: MUTED, fontSize: 22, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}>×</button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        marginBottom: 20,
        paddingBottom: 4,
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        {FILTERS.map(f => {
          const active = !q && filter === f
          return (
            <button key={f} onClick={() => { setQuery(''); onFilterChange(f) }} style={{
              flexShrink: 0,
              padding: '7px 14px', minHeight: 44,
              borderRadius: 22,
              border: `1px solid ${active ? GOLD : BORDER}`,
              background: active ? 'rgba(184,150,90,0.12)' : 'transparent',
              color: active ? GOLD : MUTED,
              fontSize: 13,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: "'Josefin Sans', sans-serif",
              whiteSpace: 'nowrap',
              WebkitTapHighlightColor: 'transparent',
            }}>{f}</button>
          )
        })}
      </div>

      <div style={{ fontSize: 13, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
        {q ? `${filtered.length} ${filtered.length === 1 ? 'risultato' : 'risultati'} in tutti gli ordini` : `${filtered.length} ordini`}
      </div>

      {filtered.map(o => {
        const days = daysUntilDelivery(o)
        const { residual, pending } = paymentSummary(o)
        return (
          <div key={o.id} onClick={() => onSelectOrder(o)} style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: '16px',
            marginBottom: 10,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: CREAM, flex: 1, marginRight: 10, lineHeight: 1.2 }}>{o.client}</div>
              <span style={{ ...badgeStyle(o.status), fontSize: 12, letterSpacing: 1, padding: "4px 10px" }}>{o.status}</span>
            </div>

            <div style={{ fontSize: 15, color: MUTED, marginBottom: 8 }}>{o.id} · {o.date}</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {o.deliveryDate ? (
                <span style={{ fontSize: 15, color: days !== null && days <= 3 ? CLAY : MUTED }}>
                  Consegna {o.deliveryDate}
                  {days !== null && ` · ${days < 0 ? `-${Math.abs(days)}g` : `+${days}g`}`}
                </span>
              ) : <span />}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                {pending > 0 && <span style={{ fontSize: 15, color: GOLD }}>Atteso {fmt(pending)}</span>}
                {residual > 0 && <span style={{ fontSize: 15, color: CLAY }}>Residuo {fmt(residual)}</span>}
              </div>
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 15, color: MUTED }}>
          Nessun ordine
        </div>
      )}
    </div>
  )
}
