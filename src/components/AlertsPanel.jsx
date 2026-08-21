import { GOLD, MUTED, CREAM, CLAY } from '../tokens.js'
import { daysUntilDelivery, needsAlert, paymentSummary, isConfirmed } from '../utils/helpers.js'
import {
  needsFollowUp, returnOverdue, fmtDate, daysSince, recipientLabel,
  samplePieces, PURPOSE_LABELS, followUpBaseDate,
} from '../utils/samples.js'

export default function AlertsPanel({ orders, setView, setEditOrder, shipments = [], clients = [], prospects = [] }) {
  const alerts = (orders||[]).filter(o => needsAlert(o))
    .sort((a, b) => (daysUntilDelivery(a) ?? 999) - (daysUntilDelivery(b) ?? 999))

  const pendingPayments = (orders||[]).filter(o =>
    isConfirmed(o) && (o.payments || []).some(p => !p.paid)
  )

  // Campionature senza risposta e resi scaduti: un invio senza esito è
  // lavoro commerciale già pagato che rischia di restare a metà.
  const sampleAlerts = (shipments || [])
    .filter(sh => needsFollowUp(sh) || returnOverdue(sh))
    .sort((a, b) => (a.shipped_date || '').localeCompare(b.shipped_date || ''))

  if (alerts.length === 0 && pendingPayments.length === 0 && sampleAlerts.length === 0) return null

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

      {sampleAlerts.length > 0 && (
        <div style={{ background:'rgba(90,130,184,0.07)', border:'1px solid rgba(90,130,184,0.28)', borderRadius:10, padding:'18px 22px', marginTop:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <span>◇</span>
            <span style={{ fontSize:9, letterSpacing:3, color:'#7aaee8', textTransform:'uppercase', fontWeight:700 }}>
              Campionature da Seguire · {sampleAlerts.length}
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {sampleAlerts.map(sh => {
              const overdue = returnOverdue(sh)
              const days    = daysSince(followUpBaseDate(sh))
              const color   = overdue ? CLAY : '#7aaee8'
              return (
                <div key={sh.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.03)', borderRadius:6, padding:'10px 14px', cursor: setView ? 'pointer' : 'default' }}
                  onClick={() => setView && setView('samples')}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:3, height:36, borderRadius:2, background:color }} />
                    <div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:CREAM }}>
                        {recipientLabel(sh, clients, prospects)}
                      </div>
                      <div style={{ fontSize:10, color:MUTED, marginTop:1 }}>
                        {fmtDate(sh.shipped_date)} · {PURPOSE_LABELS[sh.purpose] || sh.purpose} · {samplePieces(sh)} pz
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, fontWeight:700, color }}>
                      {overdue ? `Reso scaduto il ${fmtDate(sh.return_due_date)}` : 'Nessun esito'}
                    </div>
                    <div style={{ fontSize:10, color:MUTED, marginTop:2 }}>
                      {days !== null ? `inviati ${days} giorni fa` : 'da sollecitare'}
                    </div>
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
