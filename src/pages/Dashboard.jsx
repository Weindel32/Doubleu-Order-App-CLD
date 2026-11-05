import { useState, useEffect } from 'react'
import { GOLD, MUTED, CREAM, CLAY, GREEN } from '../tokens.js'
import { s, btnStyle } from '../tokens.js'
import { orderTotal, paymentSummary, isConfirmed } from '../utils/helpers.js'
import { fetchOrderForms, formStage, formActivity, lastSendText } from '../lib/orderForms.js'
import StatCard from '../components/StatCard.jsx'
import OrderFormModal from '../components/OrderFormModal.jsx'
import { revenueByYear } from '../lib/revenue.js'
import { buildTodo } from '../lib/todo.js'

// La Dashboard risponde a una domanda: cosa devo fare oggi. Quattro numeri,
// la riga del fatturato e una lista unica di cose da fare, dalla piu'
// urgente. Elenchi e grafici stanno nelle loro pagine (Archivio,
// Preventivi, Analytics).

const TODO_VISIBLE = 8

const YELLOW = '#e8c96e'
const eur  = (n) => `€ ${n.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

export default function Dashboard({ orders, setView, setEditOrder, onOrdersChange, navigateToOrders, onNavigateToQuotes, shipments = [], clients = [], prospects = [] }) {
  const [forms, setForms] = useState({})
  const [formOrderId, setFormOrderId] = useState(null)
  const [showAll, setShowAll] = useState(false)
  useEffect(() => {
    fetchOrderForms().then(rows => {
      if (!rows) return
      const map = {}
      for (const f of rows) if (!map[f.order_id]) map[f.order_id] = f
      setForms(map)
    })
  }, [])

  const confirmed = orders.filter(isConfirmed)
  const quotes    = orders.filter(o => o.status === 'PREVENTIVO')
  const inProd    = orders.filter(o => o.status === 'IN PRODUZIONE')
  const totalRev  = confirmed.reduce((a, o) => a + orderTotal(o), 0)
  // "Da incassare" copre sia le rate gia' pianificate (pending) sia il saldo
  // non ancora programmato (residual).
  const totalPending  = confirmed.reduce((t, o) => t + paymentSummary(o).pending, 0)
  const totalResidual = confirmed.reduce((t, o) => t + paymentSummary(o).residual, 0)

  const { entries, growth, prevYear } = revenueByYear(orders)
  const thisYear = String(new Date().getFullYear())
  const yearRow = entries.find(([y]) => y === thisYear)?.[1]

  const openOrder = (o) => { setEditOrder(o); setView('new') }

  // ── Da fare: una lista unica, ordinata per urgenza (lib/todo.js) ──
  const targetClick = {
    order:  (id) => { const o = orders.find(x => x.id === id); if (o) openOrder(o) },
    form:   (id) => setFormOrderId(id),
    quote:  (id) => { const q = orders.find(x => x.id === id); if (q) { setEditOrder(q); setView('newQuote') } },
    sample: ()   => setView('samples'),
  }
  const todo = buildTodo({ orders, forms, shipments, clients, prospects })
    .map(t => ({ ...t, onClick: () => targetClick[t.target.type](t.target.id) }))

  // Moduli mandati e non ancora inviati dal cliente: non sono cose da
  // fare, ma si vede a che punto e' ciascun club (e quando sollecitare).
  const ACT_ORDER = { stale: 0, unopened: 1, opened: 2, unknown: 3, filling: 4 }
  const ACT_COLOR = { stale: CLAY, unopened: YELLOW, opened: GOLD, unknown: MUTED, filling: GREEN }
  const inProgress = orders
    .map(o => ({ o, f: forms[o.id] }))
    .filter(({ f }) => f && f.status === 'aperto' && formStage(f).key !== 'created' && !f.change_request)
    .map(x => ({ ...x, act: formActivity(x.f) }))
    .sort((a, b) => ACT_ORDER[a.act.kind] - ACT_ORDER[b.act.kind])
  const visible = showAll ? todo : todo.slice(0, TODO_VISIBLE)
  const formOrder = formOrderId ? orders.find(o => o.id === formOrderId) : null

  return (<>
    <div>
      <div style={s.topBar}>
        <div>
          <div style={s.pageTitle}>Dashboard</div>
          <div style={s.pageSub}>Panoramica operativa · {new Date().toLocaleDateString('it-IT')}</div>
        </div>
        <button style={btnStyle(true)} onClick={() => { setEditOrder(null); setView('new') }}>+ Nuovo Ordine</button>
      </div>

      <div style={s.grid4}>
        <StatCard label="Preventivi"    value={quotes.length}    sub="In attesa"     onClick={onNavigateToQuotes || undefined}/>
        <StatCard label="Confermati"    value={confirmed.length} sub={`${totalRev.toLocaleString('it-IT', { maximumFractionDigits: 0 })} €`} accent onClick={navigateToOrders ? () => navigateToOrders('Confermato') : undefined}/>
        <StatCard label="In Produzione" value={inProd.length}    sub="Ordini attivi" onClick={navigateToOrders ? () => navigateToOrders('In Produzione') : undefined}/>
        <StatCard label="Da Incassare"  value={eur(totalPending + totalResidual)}
          sub={`${eur(totalPending)} attesi · ${eur(totalResidual)} da pianificare`}
          onClick={navigateToOrders ? () => navigateToOrders('Da Incassare') : undefined}/>
      </div>

      {/* Fatturato dell'anno in una riga: il dettaglio per anno e' in Analytics */}
      {yearRow && (
        <div onClick={() => setView('analytics')} title="Dettaglio per anno in Analytics" style={{
          display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap', cursor: 'pointer',
          padding: '14px 4px 18px', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: 10, letterSpacing: 3, color: MUTED, textTransform: 'uppercase' }}>Fatturato {thisYear}</span>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: GOLD }}>{eur(yearRow.value)}</span>
          <span style={{ fontSize: 12, color: MUTED }}>netto IVA {eur(yearRow.net)}</span>
          <span style={{ fontSize: 12, color: MUTED }}>incassato {eur(yearRow.collected)}</span>
          {growth !== null && entries[entries.length - 1][0] === thisYear && (
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: growth >= 0 ? GREEN : CLAY }}>
              {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% vs {prevYear}
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10, letterSpacing: 2, color: GOLD }}>ANALYTICS →</span>
        </div>
      )}

      {/* ── Da fare ─────────────────────────────────────────── */}
      <div style={{ ...s.card, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: todo.length ? 14 : 0 }}>
          <div style={s.cardTitle}>Da fare</div>
          <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1 }}>{todo.length ? plural(todo.length, 'cosa', 'cose') : ''}</div>
        </div>
        {todo.length === 0 ? (
          <div style={{ fontSize: 13, color: GREEN, padding: '6px 0 2px' }}>✓ Niente in sospeso.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visible.map(t => (
              <div key={t.key} onClick={t.onClick} style={{
                display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.03)',
                borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                <div style={{ width: 3, alignSelf: 'stretch', minHeight: 34, borderRadius: 2, background: t.color, flexShrink: 0 }}/>
                <div style={{ width: 150, flexShrink: 0, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: t.color, fontWeight: 700 }}>{t.kind}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: CREAM }}>{t.title}</div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.sub}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.color }}>{t.right}</div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{t.rightSub}</div>
                </div>
              </div>
            ))}
            {todo.length > TODO_VISIBLE && (
              <button onClick={() => setShowAll(!showAll)} style={{
                alignSelf: 'flex-start', marginTop: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 11, letterSpacing: 1, color: GOLD, textDecoration: 'underline', fontFamily: 'inherit',
              }}>{showAll ? 'Mostra meno' : `Mostra tutte (${todo.length})`}</button>
            )}
          </div>
        )}
      </div>

      {inProgress.length > 0 && (
        <div style={{ ...s.card, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
            <div style={s.cardTitle}>Moduli taglie in corso</div>
            <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1 }}>{inProgress.length}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {inProgress.map(({ o, f, act }) => {
              const c = ACT_COLOR[act.kind]
              const pct = act.expected ? Math.min(100, Math.round(act.pieces / act.expected * 100)) : null
              return (
                <div key={o.id} onClick={() => setFormOrderId(o.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  <div style={{ width: 3, alignSelf: 'stretch', minHeight: 34, borderRadius: 2, background: c, flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: CREAM }}>{o.client}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>{o.id}{lastSendText(f) ? ` · inviato via ${lastSendText(f)}` : ''}</div>
                  </div>
                  {pct !== null && act.pieces > 0 && (
                    <div style={{ width: 90, flexShrink: 0 }}>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: c }}/>
                      </div>
                      <div style={{ fontSize: 9, color: MUTED, marginTop: 3, textAlign: 'right' }}>{pct}%</div>
                    </div>
                  )}
                  <div style={{ textAlign: 'right', flexShrink: 0, maxWidth: 320 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: c }}>{act.text}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{act.when}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
    {formOrder && <OrderFormModal order={formOrder} form={forms[formOrder.id]} onClose={() => setFormOrderId(null)}
      onFormChange={f => setForms(m => ({ ...m, [f.order_id]: f.status === 'revocato' ? undefined : f }))}
      onOrderUpdated={next => onOrdersChange(orders.map(o => o.id === next.id ? next : o))}/>}
  </>)
}
