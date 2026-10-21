import { useState, useEffect } from 'react'
import { GOLD, MUTED, CREAM, CLAY, GREEN } from '../tokens.js'
import { s, btnStyle } from '../tokens.js'
import { orderTotal, paymentSummary, daysUntilDelivery, needsAlert, isConfirmed, isQuote,
  hasMissingSizes, missingSizeArticles, hasOverduePayment, parseDate } from '../utils/helpers.js'
import { overdueSummary } from '../utils/payments.js'
import { needsFollowUp, returnOverdue, fmtDate, daysSince, recipientLabel, followUpBaseDate } from '../utils/samples.js'
import { fetchOrderForms, formStage } from '../lib/orderForms.js'
import StatCard from '../components/StatCard.jsx'
import OrderFormModal from '../components/OrderFormModal.jsx'
import { revenueByYear } from '../components/RevenueCards.jsx'

// La Dashboard risponde a una domanda: cosa devo fare oggi. Quattro numeri,
// la riga del fatturato e una lista unica di cose da fare, dalla piu'
// urgente. Elenchi e grafici stanno nelle loro pagine (Archivio,
// Preventivi, Analytics).

const QUOTE_STALE_DAYS = 7   // preventivo senza movimento da almeno 7 giorni
const TODO_VISIBLE = 8

const RED = '#ef4444', BLUE = '#7aaee8', YELLOW = '#e8c96e'
const eur  = (n) => `€ ${n.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`
const eur2 = (n) => `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// Ultimo movimento di un preventivo: la data, o l'ultima modifica della
// trattativa se e' piu' recente.
function quoteLastMove(q) {
  const d = parseDate(q.date)?.getTime() || 0
  const n = q.negotiation?.editedAt ? new Date(q.negotiation.editedAt).getTime() || 0 : 0
  return Math.max(d, n) || null
}

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

  // ── Da fare: una lista unica, ordinata per urgenza ──────────────
  // prio 1 = soldi o consegne gia' in ritardo, 2 = tocca a noi a breve,
  // 3 = da completare, 4 = da seguire.
  const todo = []
  const add = (t) => todo.push({ ...t, seq: todo.length })

  confirmed.filter(hasOverduePayment)
    .sort((a, b) => overdueSummary(b).days - overdueSummary(a).days)
    .forEach(o => {
      const { amount, days } = overdueSummary(o)
      add({ key: `pay-${o.id}`, prio: 1, color: days > 30 ? RED : GOLD, kind: 'Credito scaduto',
        title: o.client, sub: o.id, right: eur2(amount), rightSub: `${plural(days, 'giorno', 'giorni')} di ritardo`,
        onClick: () => openOrder(o) })
    })

  orders.filter(needsAlert)
    .sort((a, b) => (daysUntilDelivery(a) ?? 999) - (daysUntilDelivery(b) ?? 999))
    .forEach(o => {
      const days = daysUntilDelivery(o)
      const late = days < 0
      add({ key: `del-${o.id}`, prio: late ? 1 : 2, color: late ? RED : days <= 3 ? CLAY : YELLOW, kind: 'Consegna',
        title: o.client, sub: `${o.id} · ${o.deliveryDate}`,
        right: late ? `In ritardo di ${plural(-days, 'giorno', 'giorni')}` : days === 0 ? 'Consegna oggi' : days === 1 ? 'Consegna domani' : `Tra ${days} giorni`,
        rightSub: `${o.pieces || 0} pz · ${o.status}`, onClick: () => openOrder(o) })
    })

  orders.forEach(o => {
    const stage = formStage(forms[o.id])
    if (stage.key !== 'received' && stage.key !== 'request') return
    add({ key: `form-${o.id}`, prio: 2, color: stage.key === 'request' ? CLAY : GREEN,
      kind: stage.key === 'request' ? 'Richiesta del cliente' : 'Taglie da applicare',
      title: o.client, sub: `${o.id} · ${stage.text}`, right: stage.badge, rightSub: 'apri il modulo',
      onClick: () => setFormOrderId(o.id) })
  })

  orders.filter(hasMissingSizes).forEach(o => {
    if (forms[o.id] && ['received', 'request'].includes(formStage(forms[o.id]).key)) return
    const missing = missingSizeArticles(o)
    const stage = forms[o.id] ? formStage(forms[o.id]) : null
    add({ key: `size-${o.id}`, prio: 3, color: CLAY, kind: 'Taglie mancanti',
      title: o.client, sub: `${o.id} · ${missing.map(a => a.description).filter(Boolean).slice(0, 2).join(', ') || 'da completare'}`,
      right: plural(missing.length, 'articolo senza taglie', 'articoli senza taglie'),
      rightSub: stage ? `modulo: ${stage.badge.toLowerCase()}` : 'nessun modulo inviato', onClick: () => openOrder(o) })
  })

  const now = Date.now()
  orders.filter(o => isQuote(o) && !o.lost && !o.standby)
    .map(q => ({ q, last: quoteLastMove(q) }))
    .filter(({ last }) => last && (now - last) / 86400000 >= QUOTE_STALE_DAYS)
    .sort((a, b) => a.last - b.last)
    .forEach(({ q, last }) => {
      const days = Math.floor((now - last) / 86400000)
      add({ key: `quote-${q.id}`, prio: 4, color: BLUE, kind: 'Preventivo fermo',
        title: q.client, sub: `${q.id} · ${q.date}`, right: `Fermo da ${days} giorni`, rightSub: 'da sollecitare',
        onClick: () => { setEditOrder(q); setView('newQuote') } })
    })

  shipments.filter(sh => needsFollowUp(sh) || returnOverdue(sh))
    .sort((a, b) => (a.shipped_date || '').localeCompare(b.shipped_date || ''))
    .forEach(sh => {
      const overdue = returnOverdue(sh)
      const days = daysSince(followUpBaseDate(sh))
      add({ key: `sample-${sh.id}`, prio: overdue ? 3 : 4, color: overdue ? CLAY : BLUE, kind: overdue ? 'Reso scaduto' : 'Campionatura',
        title: recipientLabel(sh, clients, prospects), sub: `Inviati il ${fmtDate(sh.shipped_date)}`,
        right: overdue ? `Rientro previsto il ${fmtDate(sh.return_due_date)}` : 'Nessun esito',
        rightSub: days !== null ? `${days} giorni fa` : 'da sollecitare', onClick: () => setView('samples') })
    })

  todo.sort((a, b) => a.prio - b.prio || a.seq - b.seq)
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
    </div>
    {formOrder && <OrderFormModal order={formOrder} form={forms[formOrder.id]} onClose={() => setFormOrderId(null)}
      onFormChange={f => setForms(m => ({ ...m, [f.order_id]: f.status === 'revocato' ? undefined : f }))}
      onOrderUpdated={next => onOrdersChange(orders.map(o => o.id === next.id ? next : o))}/>}
  </>)
}
