import { GOLD, MUTED, CREAM, CLAY, GREEN } from '../tokens.js'
import { daysUntilDelivery, needsAlert, paymentSummary, daysUntilPayment, pendingPaymentsNeedingAlert } from '../utils/helpers.js'

export default function AlertsPanel({ orders, setView, setEditOrder }) {
  const alerts = (orders||[]).filter(o => needsAlert(o))
    .sort((a, b) => (daysUntilDelivery(a) ?? 999) - (daysUntilDelivery(b) ?? 999))

  const pendingPayments = (orders||[]).filter(o =>
    o.status !== 'PREVENTIVO' && (o.payments || []).some(p => !p.paid)
  )

  // Orders with unpaid payments scaduti o entro 7 giorni
  const paymentAlertOrders = (orders||[])
    .map(o => ({ order: o, alerts: pendingPaymentsNeedingAlert(o) }))
    .filter(x => x.alerts.length > 0)
    .sort((a, b) => {
      const minDays = arr => Math.min(...arr.map(p => daysUntilPayment(p) ?? 999))
      return minDays(a.alerts) - minDays(b.alerts)
    })

  if (alerts.length === 0 && pendingPayments.length === 0 && paymentAlertOrders.length === 0) return null

  const urgencyColor = (days) => {
    if (days < 0)  return '#ef4444'
    if (days <= 3) return CLAY
    if (days <= 7) return '#e8c96e'
    return GOLD
  }

  const urgencyLabel = (days) => {
    if (days < 0)   return `Scaduto da ${Math.abs(days)} giorni`
    if (days === 0) return 'Consegna oggi'
    if (days === 1) return 'Consegna domani'
    return `${days} giorni alla consegna`
  }

  const paymentUrgencyLabel = (days) => {
    if (days < 0)   return `Scaduto da ${Math.abs(days)} giorni`
    if (days === 0) return 'Scade oggi'
    if (days === 1) return 'Scade domani'
    return `Scade in ${days} giorni`
  }

  const TYPE_LABELS = { acconto: 'Acconto', intermedio: 'Intermedio', saldo: 'Saldo' }

  return (
    <div style={{ marginBottom: 28 }}>
      {alerts.length > 0 && (
        <div style={{ background:'rgba(196,98,58,0.08)', border:`1px solid rgba(196,98,58,0.25)`, borderRadius:10, padding:'18px 22px', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <span>⚠</span>
            <span style={{ fontSize:9, letterSpacing:3, color:CLAY, textTransform:'uppercase', fontWeight:700 }}>
              Scadenze Consegna · {alerts.length} ordini
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {alerts.map(order => {
              const days = daysUntilDelivery(order)
              const color = urgencyColor(days)
              return (
                <div key={order.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.03)', borderRadius:6, padding:'10px 14px', cursor:'pointer' }}
                  onClick={() => { setEditOrder(order); setView('new') }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:3, height:36, borderRadius:2, background:color }} />
                    <div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:CREAM }}>{order.client}</div>
                      <div style={{ fontSize:10, color:MUTED, marginTop:1 }}>{order.id} · {order.deliveryDate}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, fontWeight:700, color }}>{urgencyLabel(days)}</div>
                    <div style={{ fontSize:10, color:MUTED, marginTop:2 }}>{order.pieces} pz · {order.status}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {paymentAlertOrders.length > 0 && (
        <div style={{ background:'rgba(196,98,58,0.06)', border:`1px solid rgba(196,98,58,0.2)`, borderRadius:10, padding:'18px 22px', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <span>⏰</span>
            <span style={{ fontSize:9, letterSpacing:3, color:CLAY, textTransform:'uppercase', fontWeight:700 }}>
              Scadenze Pagamento · {paymentAlertOrders.length} ordini
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {paymentAlertOrders.map(({ order, alerts: pAlerts }) => {
              const firstDays = daysUntilPayment(pAlerts[0])
              const color = urgencyColor(firstDays)
              return (
                <div key={order.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.03)', borderRadius:6, padding:'10px 14px', cursor:'pointer' }}
                  onClick={() => { setEditOrder(order); setView('new') }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:3, borderRadius:2, background:color, alignSelf:'stretch', minHeight:36 }} />
                    <div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:CREAM }}>{order.client}</div>
                      <div style={{ fontSize:10, color:MUTED, marginTop:1 }}>
                        {order.id} · {pAlerts.map(p => `${TYPE_LABELS[p.type] || p.type} ${p.date}`).join(', ')}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, fontWeight:700, color }}>{paymentUrgencyLabel(firstDays)}</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color, marginTop:2 }}>
                      € {pAlerts.reduce((s, p) => s + (parseFloat(p.amount)||0), 0).toLocaleString('it-IT', { minimumFractionDigits:2 })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pendingPayments.length > 0 && (
        <div style={{ background:'rgba(184,150,90,0.06)', border:`1px solid rgba(184,150,90,0.2)`, borderRadius:10, padding:'18px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <span>€</span>
            <span style={{ fontSize:9, letterSpacing:3, color:GOLD, textTransform:'uppercase', fontWeight:700 }}>
              Pagamenti in Sospeso · {pendingPayments.length} ordini
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {pendingPayments.map(order => {
              const { pending } = paymentSummary(order)
              return (
                <div key={order.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.03)', borderRadius:6, padding:'10px 14px', cursor:'pointer' }}
                  onClick={() => { setEditOrder(order); setView('new') }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:3, height:36, borderRadius:2, background:GOLD }} />
                    <div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:CREAM }}>{order.client}</div>
                      <div style={{ fontSize:10, color:MUTED, marginTop:1 }}>{order.id}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:GOLD }}>
                      € {pending.toLocaleString('it-IT', { minimumFractionDigits:2 })}
                    </div>
                    <div style={{ fontSize:10, color:MUTED, marginTop:2 }}>da incassare</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
