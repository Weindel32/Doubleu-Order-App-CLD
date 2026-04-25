import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE, ORDER_STATUSES } from '../tokens.js'
import { badgeStyle } from '../tokens.js'
import { daysUntilDelivery, paymentSummary } from '../utils/helpers.js'

function fmt(n) {
  return '€' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const FILTERS = ['Attivi', 'Tutti', ...ORDER_STATUSES]

export default function MobileOrders({ orders, onSelectOrder, filter, onFilterChange }) {

  const filtered = orders.filter(o => {
    if (filter === 'Tutti') return true
    if (filter === 'Attivi') return o.status !== 'CONSEGNATO'
    return o.status === filter
  })

  return (
    <div style={{ padding: '20px 16px' }}>

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
          const active = filter === f
          return (
            <button key={f} onClick={() => onFilterChange(f)} style={{
              flexShrink: 0,
              padding: '7px 14px',
              borderRadius: 20,
              border: `1px solid ${active ? GOLD : BORDER}`,
              background: active ? 'rgba(184,150,90,0.12)' : 'transparent',
              color: active ? GOLD : MUTED,
              fontSize: 9,
              letterSpacing: 2,
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: "'Josefin Sans', sans-serif",
              whiteSpace: 'nowrap',
              WebkitTapHighlightColor: 'transparent',
            }}>{f}</button>
          )
        })}
      </div>

      <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
        {filtered.length} ordini
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
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM, flex: 1, marginRight: 10, lineHeight: 1.2 }}>{o.client}</div>
              <span style={badgeStyle(o.status)}>{o.status}</span>
            </div>

            <div style={{ fontSize: 10, color: MUTED, marginBottom: 8 }}>{o.id} · {o.date}</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {o.deliveryDate ? (
                <span style={{ fontSize: 10, color: days !== null && days <= 3 ? CLAY : MUTED }}>
                  Consegna {o.deliveryDate}
                  {days !== null && ` · ${days < 0 ? `-${Math.abs(days)}g` : `+${days}g`}`}
                </span>
              ) : <span />}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                {pending > 0 && <span style={{ fontSize: 10, color: GOLD }}>Atteso {fmt(pending)}</span>}
                {residual > 0 && <span style={{ fontSize: 10, color: CLAY }}>Residuo {fmt(residual)}</span>}
              </div>
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 12, color: MUTED }}>
          Nessun ordine
        </div>
      )}
    </div>
  )
}
