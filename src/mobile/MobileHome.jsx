import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE, STATUS_COLORS } from '../tokens.js'
import { badgeStyle } from '../tokens.js'
import { needsAlert, daysUntilDelivery, paymentSummary } from '../utils/helpers.js'

function fmt(n) {
  return '€' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function SectionTitle({ children, color }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: 3, color: color || GOLD, textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </div>
  )
}

export default function MobileHome({ orders, onSelectOrder, onGoToOrders }) {
  const [showPaymentDetail, setShowPaymentDetail] = useState(false)

  const alerts = orders.filter(o => needsAlert(o))

  const statusCounts = {
    'PREVENTIVO':        orders.filter(o => o.status === 'PREVENTIVO').length,
    'CONFERMATO':        orders.filter(o => o.status === 'CONFERMATO').length,
    'IN PRODUZIONE':     orders.filter(o => o.status === 'IN PRODUZIONE').length,
    'CONSEGNA PARZIALE': orders.filter(o => o.status === 'CONSEGNA PARZIALE').length,
    'CONSEGNATO':        orders.filter(o => o.status === 'CONSEGNATO').length,
  }

  const activeOrders = orders.filter(o => o.status !== 'CONSEGNATO' && o.status !== 'PREVENTIVO')

  const totalPending = orders
    .filter(o => o.status !== 'PREVENTIVO')
    .reduce((sum, o) => sum + paymentSummary(o).pending, 0)

  const totalResidual = orders
    .filter(o => o.status !== 'PREVENTIVO')
    .reduce((sum, o) => sum + paymentSummary(o).residual, 0)

  // Dettaglio pagamenti attesi per cliente
  const pendingByClient = {}
  orders
    .filter(o => o.status !== 'PREVENTIVO')
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

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Alert scadenze */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle color={CLAY}>⚠ {alerts.length} Ordine{alerts.length > 1 ? 'i' : ''} in Scadenza</SectionTitle>
          {alerts.map(o => {
            const days = daysUntilDelivery(o)
            return (
              <div key={o.id} onClick={() => onSelectOrder(o)} style={{
                background: 'rgba(196,98,58,0.08)',
                border: '1px solid rgba(196,98,58,0.3)',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 10,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM }}>{o.client}</div>
                  <div style={{ fontSize: 11, color: CLAY, fontWeight: 700 }}>
                    {days === null ? '' : days < 0 ? `${Math.abs(days)}g scaduto` : days === 0 ? 'Oggi' : `${days}g`}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{o.id} · Consegna {o.deliveryDate}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stato ordini — card cliccabili */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>Stato Ordini</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Object.entries(statusCounts)
            .filter(([, v]) => v > 0)
            .map(([status, count]) => {
              const sc = STATUS_COLORS[status]
              return (
                <div key={status} onClick={() => onGoToOrders(status)} style={{
                  background: sc.bg,
                  border: `1px solid ${sc.border}`,
                  borderRadius: 10,
                  padding: '16px',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  position: 'relative',
                }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: sc.color, lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: 8, letterSpacing: 2, color: sc.color, textTransform: 'uppercase', marginTop: 6, opacity: 0.85 }}>{status}</div>
                  <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, color: sc.color, opacity: 0.5 }}>›</div>
                </div>
              )
            })}
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
                <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Da incassare (attesi)</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: GOLD }}>{fmt(totalPending)}</div>
              </div>
              {totalPending > 0 && (
                <div style={{ fontSize: 18, color: GOLD, opacity: 0.6, marginTop: 4, transition: 'transform 0.2s', transform: showPaymentDetail ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</div>
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
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: CREAM }}>{clientName}</div>
                    <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>
                      {data.items.map(i => i.type).join(' · ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: GOLD }}>{fmt(data.total)}</div>
                    <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>›</div>
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
                <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Residuo non pianificato</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: CLAY }}>{fmt(totalResidual)}</div>
              </div>
            </>
          )}
        </div>
      </div>

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
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM, flex: 1, marginRight: 10 }}>{o.client}</div>
                  <span style={badgeStyle(o.status)}>{o.status}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: MUTED }}>{o.id}</span>
                  {days !== null && (
                    <span style={{ fontSize: 10, color: days <= 3 ? CLAY : MUTED }}>
                      {days < 0 ? `Scaduto ${Math.abs(days)}g` : days === 0 ? 'Consegna oggi' : `Consegna tra ${days}g`}
                    </span>
                  )}
                </div>
                {(pending > 0 || residual > 0) && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    {pending > 0 && <span style={{ fontSize: 10, color: GOLD }}>Atteso: {fmt(pending)}</span>}
                    {residual > 0 && <span style={{ fontSize: 10, color: CLAY }}>Residuo: {fmt(residual)}</span>}
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
