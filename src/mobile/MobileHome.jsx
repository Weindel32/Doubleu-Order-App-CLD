import { GOLD, MUTED, CREAM, CLAY, BORDER, SURFACE, STATUS_COLORS } from '../tokens.js'
import { badgeStyle } from '../tokens.js'
import { needsAlert, daysUntilDelivery, paymentSummary, orderTotal } from '../utils/helpers.js'

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

export default function MobileHome({ orders, onSelectOrder }) {
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

      {/* Stato ordini */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>Stato Ordini</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Object.entries(statusCounts)
            .filter(([, v]) => v > 0)
            .map(([status, count]) => {
              const sc = STATUS_COLORS[status]
              return (
                <div key={status} style={{
                  background: sc.bg,
                  border: `1px solid ${sc.border}`,
                  borderRadius: 10,
                  padding: '16px',
                }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: sc.color, lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: 8, letterSpacing: 2, color: sc.color, textTransform: 'uppercase', marginTop: 6, opacity: 0.85 }}>{status}</div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Pagamenti */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>Situazione Pagamenti</SectionTitle>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Da incassare (attesi)</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: GOLD }}>{fmt(totalPending)}</div>
            </div>
          </div>
          {totalResidual > 0 && (
            <>
              <div style={{ height: 1, background: `rgba(184,150,90,0.12)` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Residuo non pianificato</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: CLAY }}>{fmt(totalResidual)}</div>
                </div>
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
