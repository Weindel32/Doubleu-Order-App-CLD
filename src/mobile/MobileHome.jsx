import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE, STATUS_COLORS, GREEN } from '../tokens.js'
import { badgeStyle } from '../tokens.js'
import { daysUntilDelivery, paymentSummary, orderTotal, isConfirmed } from '../utils/helpers.js'
import { buildTodo } from '../lib/todo.js'

function fmt(n) {
  return '€' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function SectionTitle({ children, color }) {
  return (
    <div style={{ fontSize: 13, letterSpacing: 1.5, color: color || GOLD, textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </div>
  )
}

const TODO_VISIBLE = 6

// Una voce della lista "Da fare": tipo e scadenza in alto, club al centro,
// dettaglio sotto. Stessa lista della Dashboard desktop (lib/todo.js).
function TodoItem({ t, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', gap: 12, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10,
      padding: '12px 14px 12px 12px', marginBottom: 8, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
    }}>
      <div style={{ width: 3, borderRadius: 2, background: t.color, flexShrink: 0 }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: t.color, fontWeight: 600 }}>{t.kind}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: t.color, textAlign: 'right' }}>{t.right}</span>
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: CREAM, lineHeight: 1.2, marginTop: 4 }}>{t.title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 3 }}>
          <span style={{ fontSize: 14, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{t.sub}</span>
          <span style={{ fontSize: 13, color: MUTED, flexShrink: 0 }}>{t.rightSub}</span>
        </div>
      </div>
    </div>
  )
}

export default function MobileHome({ orders, allOrders = orders, forms = {}, shipments = [], clients = [], prospects = [], onSelectOrder, onSelectQuote, onGoToOrders, onGoToTab }) {
  const [showPaymentDetail, setShowPaymentDetail] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // Cosa fare oggi: crediti scaduti, consegne, taglie, preventivi fermi,
  // campionature. Un tocco apre l'ordine, il preventivo o le campionature.
  const open = {
    order:  (id) => { const o = allOrders.find(x => x.id === id); if (o) onSelectOrder(o) },
    form:   (id) => { const o = allOrders.find(x => x.id === id); if (o) onSelectOrder(o) },
    quote:  (id) => { const q = allOrders.find(x => x.id === id); if (q) onSelectQuote(q) },
    sample: ()   => onGoToTab('samples'),
  }
  const todo = buildTodo({ orders: allOrders, forms, shipments, clients, prospects })
  const visibleTodo = showAll ? todo : todo.slice(0, TODO_VISIBLE)

  const statusCounts = {
    'PREVENTIVO':        orders.filter(o => o.status === 'PREVENTIVO' && !o.lost).length,
    'CONFERMATO':        orders.filter(o => o.status === 'CONFERMATO').length,
    'IN PRODUZIONE':     orders.filter(o => o.status === 'IN PRODUZIONE').length,
    'CONSEGNA PARZIALE': orders.filter(o => o.status === 'CONSEGNA PARZIALE').length,
    'CONSEGNATO':        orders.filter(o => o.status === 'CONSEGNATO').length,
  }

  const activeOrders = orders.filter(o => isConfirmed(o) && o.status !== 'CONSEGNATO')

  const totalPending = orders
    .filter(isConfirmed)
    .reduce((sum, o) => sum + paymentSummary(o).pending, 0)

  const totalResidual = orders
    .filter(isConfirmed)
    .reduce((sum, o) => sum + paymentSummary(o).residual, 0)

  // Dettaglio pagamenti attesi per cliente
  const pendingByClient = {}
  orders
    .filter(isConfirmed)
    .forEach(o => {
      const pending = (o.payments || [])
        .filter(p => !p.paid && parseFloat(p.amount) > 0)
      if (pending.length === 0) return
      if (!pendingByClient[o.client]) pendingByClient[o.client] = { total: 0, items: [], order: o }
      pending.forEach(p => {
        pendingByClient[o.client].total += parseFloat(p.amount)
        pendingByClient[o.client].items.push({ type: p.type, amount: parseFloat(p.amount), orderId: o.id })
      })
      pendingByClient[o.client].order = o
    })
  const pendingClients = Object.entries(pendingByClient).sort((a, b) => b[1].total - a[1].total)

  const parseDate = d => {
    if (!d) return 0
    const [dd,mm,yyyy] = d.split('/')
    return new Date(`${yyyy}-${mm}-${dd}`).getTime() || 0
  }
  const fullyPaid = orders
    .filter(isConfirmed)
    .filter(o => { const ps = paymentSummary(o); return ps.total > 0 && ps.residual === 0 && ps.pending === 0 })
    .sort((a,b) => parseDate(b.date) - parseDate(a.date))
    .slice(0, 5)

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Da fare oggi */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionTitle>Da fare oggi</SectionTitle>
          {todo.length > 0 && <span style={{ fontSize: 13, color: MUTED }}>{todo.length === 1 ? '1 cosa' : `${todo.length} cose`}</span>}
        </div>
        {todo.length === 0 ? (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px', fontSize: 16, color: GREEN }}>
            ✓ Niente in sospeso
          </div>
        ) : (
          <>
            {visibleTodo.map(t => <TodoItem key={t.key} t={t} onClick={() => open[t.target.type](t.target.id)}/>)}
            {todo.length > TODO_VISIBLE && (
              <button onClick={() => setShowAll(v => !v)} style={{
                width: '100%', minHeight: 44, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 10,
                color: GOLD, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
                fontFamily: "'Josefin Sans', sans-serif", WebkitTapHighlightColor: 'transparent',
              }}>{showAll ? 'Mostra meno' : `Mostra tutte (${todo.length})`}</button>
            )}
          </>
        )}
      </div>

      {/* Stato ordini — card cliccabili */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>Stato Ordini</SectionTitle>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          {Object.entries(statusCounts)
            .filter(([, v]) => v > 0)
            .map(([status, count], i) => (
              <div key={status} onClick={() => onGoToOrders(status)} style={{
                display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '0 16px',
                borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: STATUS_COLORS[status].solid, flexShrink: 0 }}/>
                <span style={{ flex: 1, fontSize: 15, letterSpacing: 1, color: CREAM, textTransform: 'uppercase' }}>{status}</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: CREAM, lineHeight: 1 }}>{count}</span>
                <span style={{ fontSize: 20, color: MUTED }}>›</span>
              </div>
            ))}
        </div>
      </div>

      {/* Situazione pagamenti — espandibile */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>Situazione Pagamenti</SectionTitle>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>

          {/* Da incassare — toccabile */}
          <div
            onClick={() => totalPending > 0 && setShowPaymentDetail(v => !v)}
            style={{
              padding: '16px',
              cursor: totalPending > 0 ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Da incassare (attesi)</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: GOLD }}>{fmt(totalPending)}</div>
              </div>
              {totalPending > 0 && (
                <div style={{ fontSize: 20, color: GOLD, opacity: 0.6, marginTop: 4, transition: 'transform 0.2s', transform: showPaymentDetail ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</div>
              )}
            </div>
          </div>

          {/* Dettaglio per cliente — espandibile */}
          {showPaymentDetail && pendingClients.length > 0 && (
            <div style={{ borderTop: `1px solid rgba(184,150,90,0.15)` }}>
              {pendingClients.map(([clientName, data]) => (
                <div
                  key={clientName}
                  onClick={() => onSelectOrder(data.order)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid rgba(255,255,255,0.04)`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: CREAM }}>{clientName}</div>
                    <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
                      {data.items.map(i => i.type).join(' · ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: GOLD }}>{fmt(data.total)}</div>
                    <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>›</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Residuo non pianificato */}
          {totalResidual > 0 && (
            <>
              <div style={{ height: 1, background: `rgba(184,150,90,0.12)` }} />
              <div style={{ padding: '16px' }}>
                <div style={{ fontSize: 13, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Residuo non pianificato</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: CLAY }}>{fmt(totalResidual)}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ultimi 5 ordini incassati */}
      {fullyPaid.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle color={GREEN}>Ultimi Ordini Incassati</SectionTitle>
          {fullyPaid.map(o => {
            const tot = orderTotal(o)
            return (
              <div key={o.id} onClick={() => onSelectOrder(o)} style={{
                background: SURFACE,
                border: `1px solid rgba(74,158,110,0.25)`,
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 10,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: CREAM }}>{o.client}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: GREEN }}>
                    ✓ {fmt(tot)}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 15, color: MUTED }}>{o.id}</span>
                  <span style={{ fontSize: 13, color: MUTED }}>{o.date || '—'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Ordini attivi */}
      {activeOrders.length > 0 && (
        <div>
          <SectionTitle>Ordini in Corso</SectionTitle>
          {activeOrders.map(o => {
            const days = daysUntilDelivery(o)
            const { residual, pending } = paymentSummary(o)
            return (
              <div key={o.id} onClick={() => onSelectOrder(o)} style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 10,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: CREAM, flex: 1, marginRight: 10 }}>{o.client}</div>
                  <span style={{ ...badgeStyle(o.status), fontSize: 12, letterSpacing: 1, padding: "4px 10px" }}>{o.status}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, color: MUTED }}>{o.id}</span>
                  {days !== null && (
                    <span style={{ fontSize: 15, color: days <= 3 ? CLAY : MUTED }}>
                      {days < 0 ? `Scaduto ${Math.abs(days)}g` : days === 0 ? 'Consegna oggi' : `Consegna tra ${days}g`}
                    </span>
                  )}
                </div>
                {(pending > 0 || residual > 0) && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    {pending > 0 && <span style={{ fontSize: 15, color: GOLD }}>Atteso: {fmt(pending)}</span>}
                    {residual > 0 && <span style={{ fontSize: 15, color: CLAY }}>Residuo: {fmt(residual)}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 12, letterSpacing: 1, color: MUTED, padding: '24px 0 4px' }}>
        Order App · v{__APP_VERSION__}
      </div>
    </div>
  )
}
