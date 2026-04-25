import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE } from '../tokens.js'
import { badgeStyle } from '../tokens.js'
import { orderTotal } from '../utils/helpers.js'

function fmt(n) {
  return '€' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const CATEGORY_STYLE = {
  ANCHOR: { color: '#b8965a', border: 'rgba(184,150,90,0.4)', bg: 'rgba(184,150,90,0.1)' },
  ALLIED: { color: '#7aaee8', border: 'rgba(90,130,184,0.4)', bg: 'rgba(90,130,184,0.1)' },
  SCOUT:  { color: '#8a9ab5', border: 'rgba(138,154,181,0.3)', bg: 'rgba(138,154,181,0.07)' },
}

function getCategory(client, orders) {
  if (client.category_override) return client.category_override
  const revenue = orders
    .filter(o => o.client === client.name && o.status === 'CONSEGNATO')
    .reduce((s, o) => s + orderTotal(o), 0)
  if (revenue >= 4000) return 'ANCHOR'
  if (revenue >= 1000) return 'ALLIED'
  return 'SCOUT'
}

function CategoryBadge({ category }) {
  const s = CATEGORY_STYLE[category] || CATEGORY_STYLE.SCOUT
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 2,
      fontSize: 8,
      letterSpacing: 2,
      fontWeight: 700,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      textTransform: 'uppercase',
    }}>{category}</span>
  )
}

function ClientDetail({ client, orders, onBack, onSelectOrder }) {
  const clientOrders = orders.filter(o => o.client === client.name)
  const activeOrders = clientOrders.filter(o => o.status !== 'CONSEGNATO')
  const revenue = clientOrders
    .filter(o => o.status === 'CONSEGNATO')
    .reduce((s, o) => s + orderTotal(o), 0)
  const category = getCategory(client, orders)

  return (
    <div style={{ padding: '0 16px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: GOLD,
        fontSize: 16, cursor: 'pointer', padding: '20px 0 10px',
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
        WebkitTapHighlightColor: 'transparent',
      }}>‹ Clienti</button>

      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: CREAM, lineHeight: 1.2, marginBottom: 8 }}>
        {client.name}
      </div>
      <CategoryBadge category={category} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20, marginBottom: 20 }}>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: GOLD, lineHeight: 1 }}>{activeOrders.length}</div>
          <div style={{ fontSize: 8, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginTop: 6 }}>Ordini Attivi</div>
        </div>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: GOLD, lineHeight: 1 }}>{fmt(revenue)}</div>
          <div style={{ fontSize: 8, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginTop: 6 }}>Revenue</div>
        </div>
      </div>

      {/* Contatti */}
      {(client.phone || client.email || client.contact || client.city) && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px', marginBottom: 20 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 14 }}>Contatti</div>
          {client.contact && (
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>Referente: {client.contact}</div>
          )}
          {client.phone && (
            <a href={`tel:${client.phone}`} style={{ display: 'block', fontSize: 15, color: GOLD, textDecoration: 'none', marginBottom: 8, fontFamily: "'Cormorant Garamond', serif" }}>
              {client.phone}
            </a>
          )}
          {client.email && (
            <a href={`mailto:${client.email}`} style={{ display: 'block', fontSize: 12, color: GOLD, textDecoration: 'none', marginBottom: 8 }}>
              {client.email}
            </a>
          )}
          {client.city && (
            <div style={{ fontSize: 11, color: MUTED }}>
              {client.city}{client.country && client.country !== 'Italia' ? `, ${client.country}` : ''}
            </div>
          )}
        </div>
      )}

      {/* Ordini */}
      {clientOrders.length > 0 && (
        <>
          <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>
            Storico Ordini
          </div>
          {clientOrders.map(o => (
            <div key={o.id} onClick={() => onSelectOrder(o)} style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 8,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: MUTED }}>{o.id} · {o.date}</span>
                <span style={badgeStyle(o.status)}>{o.status}</span>
              </div>
              {o.deliveryDate && (
                <div style={{ fontSize: 10, color: MUTED }}>Consegna: {o.deliveryDate}</div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default function MobileClients({ clients, orders, onSelectOrder }) {
  const [selected, setSelected] = useState(null)

  if (selected) {
    return (
      <ClientDetail
        client={selected}
        orders={orders}
        onBack={() => setSelected(null)}
        onSelectOrder={onSelectOrder}
      />
    )
  }

  const sorted = [...clients].sort((a, b) => {
    const ra = orders.filter(o => o.client === a.name && o.status === 'CONSEGNATO').reduce((s, o) => s + orderTotal(o), 0)
    const rb = orders.filter(o => o.client === b.name && o.status === 'CONSEGNATO').reduce((s, o) => s + orderTotal(o), 0)
    return rb - ra
  })

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
        {clients.length} clienti
      </div>

      {sorted.map(c => {
        const category = getCategory(c, orders)
        const active = orders.filter(o => o.client === c.name && o.status !== 'CONSEGNATO').length
        return (
          <div key={c.name} onClick={() => setSelected(c)} style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 10,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM, marginBottom: 4 }}>{c.name}</div>
              {active > 0 && (
                <div style={{ fontSize: 10, color: GOLD }}>
                  {active} ordine{active > 1 ? 'i' : ''} attivo{active > 1 ? 'i' : ''}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <CategoryBadge category={category} />
              {c.phone && <div style={{ fontSize: 10, color: MUTED }}>{c.phone}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
