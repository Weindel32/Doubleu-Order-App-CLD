import { GOLD, CLAY, GREEN } from '../tokens.js'
import { daysUntilDelivery, needsAlert, isConfirmed, isQuote, hasMissingSizes, missingSizeArticles, hasOverduePayment, parseDate } from '../utils/helpers.js'
import { overdueSummary } from '../utils/payments.js'
import { needsFollowUp, returnOverdue, fmtDate, daysSince, recipientLabel, followUpBaseDate } from '../utils/samples.js'
import { formStage } from './formStatus.js'

// "Cosa devo fare oggi": la lista unica del Dashboard, dalla più urgente.
// Sta qui e non nella pagina perché la legge anche il connettore MCP:
// stesse regole, stesso ordine, stessi testi. Ogni voce dice a cosa si
// riferisce (target) invece di sapere come aprirlo: il Dashboard ne fa un
// click, la chat una riga di testo.

export const QUOTE_STALE_DAYS = 7   // preventivo senza movimento da almeno 7 giorni

const RED = '#ef4444', BLUE = '#7aaee8', YELLOW = '#e8c96e'
// Punto delle migliaia a mano: toLocaleString('it-IT') non lo mette sotto 10.000 (1800,00).
const eur2 = (n) => {
  const [int, dec] = Math.abs(n).toFixed(2).split('.')
  return `€ ${n < 0 ? '−' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// Ultimo movimento di un preventivo: la data, o l'ultima modifica della
// trattativa se e' piu' recente.
export function quoteLastMove(q) {
  const d = parseDate(q.date)?.getTime() || 0
  const n = q.negotiation?.editedAt ? new Date(q.negotiation.editedAt).getTime() || 0 : 0
  return Math.max(d, n) || null
}

// forms: { [orderId]: modulo taglie più recente }
export function buildTodo({ orders = [], forms = {}, shipments = [], clients = [], prospects = [], now = Date.now() }) {
  const confirmed = orders.filter(isConfirmed)
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
        target: { type: 'order', id: o.id } })
    })

  orders.filter(needsAlert)
    .sort((a, b) => (daysUntilDelivery(a) ?? 999) - (daysUntilDelivery(b) ?? 999))
    .forEach(o => {
      const days = daysUntilDelivery(o)
      const late = days < 0
      add({ key: `del-${o.id}`, prio: late ? 1 : 2, color: late ? RED : days <= 3 ? CLAY : YELLOW, kind: 'Consegna',
        title: o.client, sub: `${o.id} · ${o.deliveryDate}`,
        right: late ? `In ritardo di ${plural(-days, 'giorno', 'giorni')}` : days === 0 ? 'Consegna oggi' : days === 1 ? 'Consegna domani' : `Tra ${days} giorni`,
        rightSub: `${o.pieces || 0} pz · ${o.status}`, target: { type: 'order', id: o.id } })
    })

  orders.forEach(o => {
    const stage = formStage(forms[o.id])
    if (stage.key !== 'received' && stage.key !== 'request') return
    add({ key: `form-${o.id}`, prio: 2, color: stage.key === 'request' ? CLAY : GREEN,
      kind: stage.key === 'request' ? 'Richiesta del cliente' : 'Taglie da applicare',
      title: o.client, sub: `${o.id} · ${stage.text}`, right: stage.badge, rightSub: 'apri il modulo',
      target: { type: 'form', id: o.id } })
  })

  orders.filter(hasMissingSizes).forEach(o => {
    if (forms[o.id] && ['received', 'request'].includes(formStage(forms[o.id]).key)) return
    const missing = missingSizeArticles(o)
    const stage = forms[o.id] ? formStage(forms[o.id]) : null
    add({ key: `size-${o.id}`, prio: 3, color: CLAY, kind: 'Taglie mancanti',
      title: o.client, sub: `${o.id} · ${missing.map(a => a.description).filter(Boolean).slice(0, 2).join(', ') || 'da completare'}`,
      right: plural(missing.length, 'articolo senza taglie', 'articoli senza taglie'),
      rightSub: stage ? `modulo: ${stage.badge.toLowerCase()}` : 'nessun modulo inviato', target: { type: 'order', id: o.id } })
  })

  orders.filter(o => isQuote(o) && !o.lost && !o.standby)
    .map(q => ({ q, last: quoteLastMove(q) }))
    .filter(({ last }) => last && (now - last) / 86400000 >= QUOTE_STALE_DAYS)
    .sort((a, b) => a.last - b.last)
    .forEach(({ q, last }) => {
      const days = Math.floor((now - last) / 86400000)
      add({ key: `quote-${q.id}`, prio: 4, color: BLUE, kind: 'Preventivo fermo',
        title: q.client, sub: `${q.id} · ${q.date}`, right: `Fermo da ${days} giorni`, rightSub: 'da sollecitare',
        target: { type: 'quote', id: q.id } })
    })

  shipments.filter(sh => needsFollowUp(sh) || returnOverdue(sh))
    .sort((a, b) => (a.shipped_date || '').localeCompare(b.shipped_date || ''))
    .forEach(sh => {
      const overdue = returnOverdue(sh)
      const days = daysSince(followUpBaseDate(sh))
      add({ key: `sample-${sh.id}`, prio: overdue ? 3 : 4, color: overdue ? CLAY : BLUE, kind: overdue ? 'Reso scaduto' : 'Campionatura',
        title: recipientLabel(sh, clients, prospects), sub: `Inviati il ${fmtDate(sh.shipped_date)}`,
        right: overdue ? `Rientro previsto il ${fmtDate(sh.return_due_date)}` : 'Nessun esito',
        rightSub: days !== null ? `${days} giorni fa` : 'da sollecitare', target: { type: 'sample', id: sh.id } })
    })

  todo.sort((a, b) => a.prio - b.prio || a.seq - b.seq)
  return todo
}
