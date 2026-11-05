// Strumenti di sola lettura del connettore MCP: ordini, preventivi,
// scadenze, clienti, campionature, panoramica. Ogni numero si calcola con
// le stesse funzioni dell'app (totali, pagamenti, piano di produzione,
// lista "da fare" del Dashboard, statistiche cliente): in chat esce quello
// che si vede nell'app, non una seconda versione dei conti.
//
// I dati arrivano da repo.snapshot(): { orders, forms, shipments, clients,
// prospects } già nel formato dell'app (vedi src/lib/orderModel.js).

import { UserError, matchScore, MATCH_THRESHOLD, normalize, isUuid, searchRecipients } from './_mcp-logic.js'
import {
  orderTotal, orderSubtotal, orderDiscount, orderIVA, orderShipping, paymentSummary, daysUntilDelivery,
  isConfirmed, isQuote, artPieceCount, missingSizeArticles, kitBillableQty,
} from '../src/utils/helpers.js'
import { paymentDue, paymentDelay, overdueSummary, formatItalian, PAYER_LEVELS } from '../src/utils/payments.js'
import {
  PURPOSE_LABELS, OUTCOME_LABELS, samplePieces, shipmentOutcomeSummary, needsFollowUp, returnOverdue,
  returnPending, recipientLabel, fmtDate, followUpBaseDate, addDaysISO, FOLLOW_UP_DAYS, sampleStats,
  sampleInvested, isGift,
} from '../src/utils/samples.js'
import { ORDER_STATUSES, ADULT_SIZES, KIDS_SIZES } from '../src/tokens.js'
import { buildTodo, quoteLastMove } from '../src/lib/todo.js'
import { revenueByYear } from '../src/lib/revenue.js'
import { enrichClient } from '../src/lib/clientStats.js'
import { productionPlan } from '../src/lib/production.js'
import { formStage } from '../src/lib/formStatus.js'

const DAY = 86400000
const eur = (n) => `€ ${(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const eur0 = (n) => `€ ${(n || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 })}`
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const isoToIt = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
const text = (t, data) => ({ content: [{ type: 'text', text: data === undefined ? t : `${t}\n\nDati: ${JSON.stringify(data)}` }] })
const clampLimit = (v, def, max) => Math.min(Math.max(parseInt(v) || def, 1), max)

const startOfToday = (now) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d }

// ─── Filtri comuni ───────────────────────────────────────────────

function matchesClient(name, query) {
  return !query || matchScore(query, name) >= MATCH_THRESHOLD
}

function parseStatus(value) {
  if (!value) return null
  const n = normalize(value)
  const found = ORDER_STATUSES.find(s => normalize(s) === n)
  if (!found) throw new UserError(`Stato "${value}" non riconosciuto. Validi: ${ORDER_STATUSES.join(', ')}.`)
  return found
}

function findOrder(orders, numero) {
  const q = String(numero || '').trim().toUpperCase()
  if (!q) throw new UserError('Indica il numero dell\'ordine o del preventivo, es. DU-2026-1642 o 1642.')
  const exact = orders.find(o => o.id.toUpperCase() === q)
  if (exact) return exact
  const tail = orders.filter(o => o.id.toUpperCase().endsWith(`-${q}`))
  if (tail.length === 1) return tail[0]
  if (tail.length > 1) throw new UserError(`Più ordini finiscono con ${q}: ${tail.map(o => o.id).join(', ')}. Indica il numero completo.`)
  throw new UserError(`Nessun ordine o preventivo con numero ${numero}.`)
}

// ─── Righe di testo ──────────────────────────────────────────────

function orderLine(o, now) {
  const pay = paymentSummary(o)
  const over = overdueSummary(o, new Date(now))
  const days = daysUntilDelivery(o)
  const parts = [
    `${o.id} · ${o.client} · ${o.date || 's.d.'} · ${o.status}`,
    `${o.pieces || 0} pz · ${eur(orderTotal(o))}`,
  ]
  if (o.deliveryDate && !['CONSEGNATO', 'ANNULLATO', 'PREVENTIVO'].includes(o.status)) {
    parts.push(`consegna ${o.deliveryDate}${days !== null ? (days < 0 ? ` (in ritardo di ${-days} gg)` : ` (tra ${days} gg)`) : ''}`)
  }
  if (isConfirmed(o)) {
    parts.push(`incassato ${eur(pay.paid)}`)
    if (pay.pending + pay.residual > 0.005) parts.push(`da incassare ${eur(pay.pending + pay.residual)}`)
    if (over.amount > 0) parts.push(`SCADUTO ${eur(over.amount)} da ${over.days} gg`)
  }
  if (missingSizeArticles(o).length) parts.push('taglie mancanti')
  return parts.join(' · ')
}

function orderData(o, now) {
  const pay = paymentSummary(o)
  return {
    numero: o.id, cliente: o.client, data: o.date, stato: o.status, pezzi: o.pieces || 0,
    totale: Math.round(orderTotal(o) * 100) / 100, consegna_prevista: o.deliveryDate || null,
    giorni_alla_consegna: daysUntilDelivery(o), incassato: pay.paid, da_incassare: pay.pending + pay.residual,
    scaduto: overdueSummary(o, new Date(now)).amount,
  }
}

function sizesText(art) {
  const parts = []
  for (const sz of KIDS_SIZES) if (art.sizes?.kids?.[sz]) parts.push(`${sz}a:${art.sizes.kids[sz]}`)
  for (const sz of ADULT_SIZES) if (art.sizes?.adult?.[sz]) parts.push(`${sz}:${art.sizes.adult[sz]}`)
  if (art.sizes?.uni) parts.push(`UNI:${art.sizes.uni}`)
  return parts.join(' ')
}

function shipmentLine(sh, clients, prospects) {
  const sum = shipmentOutcomeSummary(sh)
  const esiti = Object.entries(sum.counts).map(([k, n]) => `${OUTCOME_LABELS[k] || k} ${n}`).join(', ')
  const parts = [
    `${fmtDate(sh.shipped_date)} · ${recipientLabel(sh, clients, prospects)} · ${PURPOSE_LABELS[sh.purpose] || sh.purpose}${isGift(sh) ? ' (omaggio)' : ''}`,
    `${samplePieces(sh)} pz`,
    `esiti: ${esiti || 'nessun articolo'}`,
  ]
  if (returnOverdue(sh)) parts.push(`RESO SCADUTO dal ${fmtDate(sh.return_due_date)}`)
  else if (returnPending(sh)) parts.push(`reso atteso${sh.return_due_date ? ` entro il ${fmtDate(sh.return_due_date)}` : ''}`)
  if (needsFollowUp(sh)) parts.push('DA SOLLECITARE')
  else if (sum.isOpen) parts.push(`follow-up il ${fmtDate(sh.follow_up_date || addDaysISO(followUpBaseDate(sh), FOLLOW_UP_DAYS))}`)
  if (sh.source === 'claude-mcp') parts.push('creato da chat')
  return `${parts.join(' · ')} [id ${sh.id}]`
}

// ─── Strumenti ───────────────────────────────────────────────────

export const READ_TOOLS = [
  {
    name: 'panoramica',
    title: 'Panoramica Order App',
    description: 'I numeri del Dashboard: ordini confermati e valore, preventivi, in produzione, da incassare, fatturato per anno, campionature, e quante cose da fare ci sono per urgenza.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'scadenze',
    title: 'Scadenze e cose da fare',
    description: 'La lista "da fare" del Dashboard (crediti scaduti, consegne vicine o in ritardo, taglie da applicare o mancanti, preventivi fermi, campionature da sollecitare, resi scaduti) più consegne, rate e resi in arrivo nei prossimi giorni.',
    inputSchema: { type: 'object', properties: { giorni: { type: 'integer', minimum: 1, maximum: 90, description: 'Orizzonte per le cose in arrivo, default 14.' } } },
  },
  {
    name: 'cerca_ordini',
    title: 'Cerca ordini',
    description: 'Elenca ordini e/o preventivi, i più recenti per primi, con totale, consegna e situazione incassi. Filtri facoltativi: cliente (anche parziale), stato, anno.',
    inputSchema: {
      type: 'object',
      properties: {
        cliente: { type: 'string' },
        stato: { type: 'string', description: ORDER_STATUSES.join(', ') },
        anno: { type: 'integer' },
        tipo: { type: 'string', enum: ['ordini', 'preventivi', 'tutti'], description: 'ordini = confermati (default), preventivi, tutti (anche annullati).' },
        limite: { type: 'integer', minimum: 1, maximum: 50, description: 'Default 10.' },
      },
    },
  },
  {
    name: 'leggi_ordine',
    title: 'Dettaglio ordine',
    description: 'Dettaglio completo di un ordine o preventivo: kit e articoli con taglie, importi (subtotale, sconto, IVA, spedizione, totale), rate con scadenze e ritardi, modulo taglie, piano di produzione, note.',
    inputSchema: { type: 'object', properties: { numero: { type: 'string', description: 'Es. DU-2026-1642 oppure 1642.' } }, required: ['numero'] },
  },
  {
    name: 'preventivi_aperti',
    title: 'Preventivi aperti',
    description: 'Preventivi non persi, dal più fermo: totale, giorni dall\'ultimo movimento, standby con motivo.',
    inputSchema: {
      type: 'object',
      properties: {
        fermi_da_giorni: { type: 'integer', minimum: 0, description: 'Solo quelli fermi da almeno N giorni.' },
        includi_standby: { type: 'boolean', description: 'Default true.' },
      },
    },
  },
  {
    name: 'scheda_cliente',
    title: 'Scheda cliente',
    description: 'Situazione di un cliente: fatturato, pezzi, fascia, ultimo ordine, profilo pagatore, crediti aperti, ordini, preventivi, campionature. Accetta nome (anche parziale) o id.',
    inputSchema: { type: 'object', properties: { cliente: { type: 'string' } }, required: ['cliente'] },
  },
  {
    name: 'elenca_invii_campioni',
    title: 'Elenca invii campioni',
    description: 'Campionature inviate, le più recenti per prime, con esiti, reso e follow-up. Filtri: cliente (anche parziale) e filtro.',
    inputSchema: {
      type: 'object',
      properties: {
        cliente: { type: 'string' },
        filtro: { type: 'string', enum: ['tutti', 'aperti', 'da_sollecitare', 'resi_da_recuperare', 'resi_scaduti'], description: 'Default tutti.' },
        limite: { type: 'integer', minimum: 1, maximum: 50, description: 'Default 20.' },
      },
    },
  },
].map(t => ({ ...t, annotations: { readOnlyHint: true, openWorldHint: false } }))

export function createReadTools({ repo, now: nowFn = () => Date.now() }) {
  const load = () => repo.snapshot()

  return {
    async panoramica() {
      const { orders, forms, shipments, clients, prospects } = await load()
      const now = nowFn()
      const confirmed = orders.filter(isConfirmed)
      const quotes = orders.filter(o => o.status === 'PREVENTIVO')
      const inProd = orders.filter(o => o.status === 'IN PRODUZIONE')
      const totalRev = confirmed.reduce((a, o) => a + orderTotal(o), 0)
      const pending = confirmed.reduce((t, o) => t + paymentSummary(o).pending, 0)
      const residual = confirmed.reduce((t, o) => t + paymentSummary(o).residual, 0)
      const { entries, growth, prevYear } = revenueByYear(orders)
      const todo = buildTodo({ orders, forms, shipments, clients, prospects, now })
      const byPrio = [1, 2, 3, 4].map(p => todo.filter(t => t.prio === p).length)
      const st = sampleStats(shipments)
      const lines = [
        `Confermati: ${confirmed.length} ordini · ${eur0(totalRev)}`,
        `Preventivi: ${quotes.length} come nel Dashboard (contati anche i persi) · aperti ${quotes.filter(q => !q.lost && !q.standby).length}${quotes.some(q => q.standby && !q.lost) ? ` · in standby ${quotes.filter(q => q.standby && !q.lost).length}` : ''}`,
        `In produzione: ${inProd.length}`,
        `Da incassare: ${eur0(pending + residual)} (${eur0(pending)} attesi · ${eur0(residual)} da pianificare)`,
        'Fatturato per anno (valore ordini · netto IVA · incassato):',
        ...entries.map(([y, v]) => `  ${y}: ${eur0(v.value)} · ${eur0(v.net)} · ${eur0(v.collected)}`),
      ]
      if (growth !== null) lines.push(`  Variazione sul ${prevYear}: ${growth > 0 ? '+' : ''}${growth}%`)
      lines.push(
        `Campionature: ${st.count} invii · ${st.open} aperti · ${st.toFollowUp} da sollecitare · ${st.toReturn} resi da recuperare (${st.overdue} scaduti) · investito ${eur0(st.invested)}`,
        `Da fare: ${todo.length} (urgenti ${byPrio[0]} · a breve ${byPrio[1]} · da completare ${byPrio[2]} · da seguire ${byPrio[3]}). Il dettaglio con lo strumento scadenze.`,
      )
      return text(lines.join('\n'))
    },

    async scadenze({ giorni } = {}) {
      const { orders, forms, shipments, clients, prospects } = await load()
      const now = nowFn()
      const horizon = clampLimit(giorni, 14, 90)
      const today = startOfToday(now)
      const until = new Date(today.getTime() + horizon * DAY)
      const todo = buildTodo({ orders, forms, shipments, clients, prospects, now })
      const PRIO = { 1: 'URGENTE', 2: 'A BREVE', 3: 'DA COMPLETARE', 4: 'DA SEGUIRE' }
      const lines = [`DA FARE (come nel Dashboard), ${todo.length}:`]
      todo.forEach(t => lines.push(`- [${PRIO[t.prio]}] ${t.kind}: ${t.title} · ${t.sub} · ${t.right}${t.rightSub ? ` (${t.rightSub})` : ''}`))

      // Consegne nel periodo, con il piano di produzione: pronto entro la data promessa?
      const deliveries = orders
        .filter(o => isConfirmed(o) && o.status !== 'CONSEGNATO')
        .map(o => ({ o, days: daysUntilDelivery(o) }))
        .filter(x => x.days !== null && x.days >= 0 && x.days <= horizon)
        .sort((a, b) => a.days - b.days)
      lines.push('', `CONSEGNE NEI PROSSIMI ${horizon} GIORNI: ${deliveries.length}`)
      deliveries.forEach(({ o, days }) => {
        const plan = productionPlan(o, forms[o.id]?.submitted_at)
        const risk = plan.ready && plan.delay > 0 ? ` · ATTENZIONE: pronto previsto il ${isoToIt(plan.ready)}, ${plan.delay} gg dopo la consegna` : plan.ready ? ` · pronto previsto il ${isoToIt(plan.ready)}` : ''
        lines.push(`- ${o.deliveryDate} (tra ${days} gg) · ${o.client} · ${o.id} · ${o.pieces || 0} pz · ${o.status}${risk}`)
      })

      // Rate non incassate che scadono nel periodo (le scadute sono già sopra).
      const due = []
      for (const o of orders.filter(isConfirmed)) {
        for (const p of o.payments || []) {
          if (p.paid || !(parseFloat(p.amount) > 0)) continue
          const { date, estimated } = paymentDue(o, p)
          if (!date || date < today || date > until) continue
          due.push({ o, p, date, estimated })
        }
      }
      due.sort((a, b) => a.date - b.date)
      lines.push('', `RATE IN SCADENZA NEI PROSSIMI ${horizon} GIORNI: ${due.length}`)
      due.forEach(({ o, p, date, estimated }) => lines.push(`- ${formatItalian(date)}${estimated ? ' (stima, legata alla consegna)' : ''} · ${o.client} · ${o.id} · ${p.type || 'rata'} ${eur(parseFloat(p.amount))}`))

      const returns = shipments
        .filter(sh => returnPending(sh) && !returnOverdue(sh) && sh.return_due_date)
        .filter(sh => { const d = new Date(`${sh.return_due_date}T00:00:00`); return d >= today && d <= until })
        .sort((a, b) => a.return_due_date.localeCompare(b.return_due_date))
      lines.push('', `RESI CAMPIONI ATTESI NEI PROSSIMI ${horizon} GIORNI: ${returns.length}`)
      returns.forEach(sh => lines.push(`- ${fmtDate(sh.return_due_date)} · ${recipientLabel(sh, clients, prospects)} · ${samplePieces(sh)} pz`))

      return text(lines.join('\n'))
    },

    async cerca_ordini({ cliente, stato, anno, tipo, limite } = {}) {
      const { orders } = await load()
      const now = nowFn()
      const status = parseStatus(stato)
      const kind = tipo || (status === 'PREVENTIVO' ? 'preventivi' : status === 'ANNULLATO' ? 'tutti' : 'ordini')
      if (!['ordini', 'preventivi', 'tutti'].includes(kind)) throw new UserError('tipo deve essere ordini, preventivi o tutti.')
      const max = clampLimit(limite, 10, 50)
      const found = orders.filter(o => {
        if (kind === 'ordini' && !isConfirmed(o)) return false
        if (kind === 'preventivi' && !isQuote(o)) return false
        if (status && o.status !== status) return false
        if (anno && !(o.date || '').endsWith(String(anno))) return false
        return matchesClient(o.client, cliente)
      })
      if (!found.length) return text('Nessun ordine con questi filtri.')
      const shown = found.slice(0, max)
      const head = `${kind === 'preventivi' ? plural(found.length, 'preventivo', 'preventivi') : plural(found.length, 'ordine', 'ordini')}${found.length > max ? `, mostro i ${max} più recenti` : ''}:`
      return text([head, ...shown.map(o => `- ${orderLine(o, now)}`)].join('\n'), shown.map(o => orderData(o, now)))
    },

    async leggi_ordine({ numero } = {}) {
      const { orders, forms } = await load()
      const now = nowFn()
      const o = findOrder(orders, numero)
      const lines = [
        `${isQuote(o) ? 'Preventivo' : 'Ordine'} ${o.id} · ${o.client} · ${o.status}${o.lost ? ` · PERSO (${o.lostReason || 'senza motivo'})` : ''}${o.standby ? ` · STANDBY (${o.standbyReason || 'senza motivo'})` : ''}`,
        `Data ${o.date || 's.d.'} · consegna prevista ${o.deliveryDate || 'n.d.'}${o.shippedDate ? ` · spedito ${o.shippedDate}` : ''}${o.actualDeliveryDate ? ` · consegnato ${o.actualDeliveryDate}` : ''}`,
        `Tipo ${o.orderType} · prezzi ${o.pricingMode === 'kit' ? 'a kit' : 'per articolo'} · ${o.pieces || 0} pezzi`,
      ]
      const contact = [o.clientContact, o.clientEmail, o.clientPhone, [o.clientAddress, o.clientCity].filter(Boolean).join(', ')].filter(Boolean)
      if (contact.length) lines.push(`Contatti: ${contact.join(' · ')}`)
      lines.push('', 'Contenuto:')
      for (const kit of o.kits || []) {
        if (o.pricingMode === 'kit') lines.push(`  ${/^kit\b/i.test(kit.name || '') ? kit.name : `Kit ${kit.name || ''}`.trim()}: ${kitBillableQty(o, kit)} × ${eur(parseFloat(kit.price))}${kit.omaggio ? ` + ${kit.omaggio} omaggio` : ''}`)
        for (const a of kit.articles || []) {
          const pcs = artPieceCount(a)
          const price = o.pricingMode === 'kit' ? '' : ` · ${eur(parseFloat(a.price))}/pz`
          lines.push(`  - ${[a.sp, a.description, a.color].filter(Boolean).join(' · ')} · ${pcs || (a.estimatedQty ? `~${a.estimatedQty}` : 0)} pz${price}${pcs ? ` · ${sizesText(a)}` : ' · TAGLIE MANCANTI'}${a.omaggio ? ` · ${a.omaggio} omaggio` : ''}`)
        }
      }
      lines.push('', `Importi: subtotale ${eur(orderSubtotal(o))}${orderDiscount(o) ? ` · sconto −${eur(orderDiscount(o))}` : ''}${o.ivaEnabled ? ` · IVA ${o.ivaRate}% ${eur(orderIVA(o))}` : ''}${orderShipping(o) ? ` · spedizione ${eur(orderShipping(o))}` : ''} · TOTALE ${eur(orderTotal(o))}`)
      if (!isQuote(o)) {
        const pay = paymentSummary(o)
        lines.push(`Incassi: incassato ${eur(pay.paid)} · pianificato ${eur(pay.pending)} · da pianificare ${eur(pay.residual)}`)
        for (const p of o.payments || []) {
          const { date, estimated } = paymentDue(o, p)
          const delay = paymentDelay(o, p, new Date(now))
          const state = p.paid
            ? `incassata${p.paidDate ? ` il ${p.paidDate}` : ''}${delay ? ` (${delay > 0 ? `${delay} gg in ritardo` : `${-delay} gg in anticipo`})` : ''}`
            : delay > 0 ? `SCADUTA da ${delay} gg` : 'da incassare'
          lines.push(`  - ${p.type || 'rata'} ${eur(parseFloat(p.amount))} · scadenza ${date ? formatItalian(date) : 'n.d.'}${estimated ? ' (stima)' : ''} · ${state}`)
        }
        const form = forms[o.id]
        lines.push(`Modulo taglie: ${formStage(form).text}`)
        const missing = missingSizeArticles(o)
        if (missing.length) lines.push(`Taglie mancanti su: ${missing.map(a => a.description).filter(Boolean).join(', ')}`)
        if (!['CONSEGNATO', 'ANNULLATO'].includes(o.status)) {
          const plan = productionPlan(o, form?.submitted_at)
          lines.push(plan.start
            ? `Produzione: inizio ${isoToIt(plan.start)}${plan.manualStart ? ' (impostato a mano)' : ''} · ${plan.days} gg lavorativi · pronto ${isoToIt(plan.ready)}${plan.delay === null ? '' : plan.delay > 0 ? ` · ${plan.delay} gg DOPO la consegna promessa` : plan.delay === 0 ? ' · il giorno stesso della consegna promessa' : ` · ${-plan.delay} gg prima della consegna`}`
            : 'Produzione: non ancora pianificata (servono le taglie del cliente o una data di inizio).')
        }
      }
      for (const [label, v] of [['Note', o.notes], ['Note produzione', o.productionNotes], ['Nota ordine', o.orderNote]]) if (v) lines.push(`${label}: ${v}`)
      return text(lines.join('\n'), orderData(o, now))
    },

    async preventivi_aperti({ fermi_da_giorni, includi_standby } = {}) {
      const { orders } = await load()
      const now = nowFn()
      const minDays = parseInt(fermi_da_giorni) || 0
      const withStandby = includi_standby !== false
      const rows = orders
        .filter(o => isQuote(o) && !o.lost && (withStandby || !o.standby))
        .map(q => ({ q, last: quoteLastMove(q) }))
        .map(x => ({ ...x, days: x.last ? Math.floor((now - x.last) / DAY) : null }))
        .filter(x => (x.days ?? 0) >= minDays)
        .sort((a, b) => (b.days ?? -1) - (a.days ?? -1))
      if (!rows.length) return text('Nessun preventivo aperto con questi filtri.')
      const total = rows.reduce((t, { q }) => t + orderTotal(q), 0)
      const lines = [`${plural(rows.length, 'preventivo aperto', 'preventivi aperti')} · ${eur0(total)} in totale:`]
      rows.forEach(({ q, days }) => lines.push(`- ${q.id} · ${q.client} · ${q.date} · ${eur(orderTotal(q))} · ${q.pieces || 0} pz · ${days !== null ? `fermo da ${days} gg` : 'data mancante'}${q.standby ? ` · STANDBY: ${q.standbyReason || 'senza motivo'}` : ''}`))
      return text(lines.join('\n'), rows.map(({ q, days }) => ({ numero: q.id, cliente: q.client, totale: orderTotal(q), fermo_da_giorni: days, standby: !!q.standby })))
    },

    async scheda_cliente({ cliente } = {}) {
      const { orders, shipments, clients, prospects } = await load()
      const now = nowFn()
      let c = isUuid(cliente) ? clients.find(x => x.id === cliente.trim()) : null
      if (!c) {
        const cands = searchRecipients(cliente, { clients, prospects: [] })
        if (!cands.length) {
          const p = searchRecipients(cliente, { clients: [], prospects })
          throw new UserError(p.length
            ? `Nessun cliente "${cliente}" in anagrafica; c'è come prospect: ${p.map(x => x.nome).join(', ')}.`
            : `Nessun cliente somiglia a "${cliente}".`)
        }
        const exact = cands.filter(x => x.somiglianza >= 0.9)
        if (cands.length > 1 && exact.length !== 1) {
          return text(`Più clienti possibili, chiedi quale:\n${cands.map(x => `- ${x.nome}${x.citta ? ` (${x.citta})` : ''} [id ${x.id}]`).join('\n')}`, cands)
        }
        c = clients.find(x => x.id === (exact[0] || cands[0]).id)
      }
      const e = enrichClient(c, orders, shipments)
      const payer = e.payer
      const open = e.confirmed.map(o => ({ o, s: paymentSummary(o), over: overdueSummary(o, new Date(now)) }))
        .filter(x => x.s.pending + x.s.residual > 0.005)
      const lines = [
        `${c.name}${c.city ? ` · ${c.city}` : ''}${c.country && !/^ital/i.test(c.country) ? ` · ${c.country}` : ''}${c.category ? ` · ${c.category}` : ''} · fascia ${e.tier}`,
        `Ordini confermati: ${e.confirmed.length} · fatturato ${eur0(e.total)} (istituzionale ${eur0(e.totalIst)} · soci ${eur0(e.totalSoci)}) · ${e.pieces} pezzi · ultimo ordine ${e.lastOrder || 'mai'}`,
        `Profilo pagatore: ${PAYER_LEVELS[payer.level].label}${payer.typical !== null ? ` · ritardo tipico ${payer.typical} gg` : ''} (${plural(payer.count, 'incasso valutato', 'incassi valutati')})${payer.hasOverdue ? ` · SCADUTO ${eur(payer.openAmount)} da ${payer.openDays} gg` : ''}`,
      ]
      const contact = [c.contact, c.email, c.phone].filter(Boolean)
      if (contact.length) lines.push(`Contatti: ${contact.join(' · ')}`)
      if (open.length) {
        lines.push('Da incassare:')
        open.forEach(({ o, s, over }) => lines.push(`  - ${o.id} · ${eur(s.pending + s.residual)}${over.amount ? ` (di cui scaduto ${eur(over.amount)})` : ''}`))
      }
      const recent = [...e.allOrders].slice(0, 10)
      if (recent.length) {
        lines.push('Ordini e preventivi recenti:')
        recent.forEach(o => lines.push(`  - ${o.id} · ${o.date} · ${o.status}${o.lost ? ' (perso)' : ''} · ${eur(orderTotal(o))}`))
      }
      if (e.samples.length) {
        lines.push(`Campionature: ${e.samples.length} · investito ${eur0(e.sampleInv)}`)
        e.samples.slice(0, 5).forEach(sh => lines.push(`  - ${shipmentLine(sh, clients, prospects)}`))
      }
      if (e.unlinkable.length) lines.push(`Nota: ${e.unlinkable.length} ordini sono collegati solo per nome, non per anagrafica.`)
      return text(lines.join('\n'), { id: c.id, nome: c.name, fatturato: e.total, ordini: e.confirmed.length, fascia: e.tier })
    },

    async elenca_invii_campioni({ cliente, filtro, limite } = {}) {
      const { shipments, clients, prospects } = await load()
      const f = filtro || 'tutti'
      const FILTERS = {
        tutti: () => true,
        aperti: sh => shipmentOutcomeSummary(sh).isOpen,
        da_sollecitare: needsFollowUp,
        resi_da_recuperare: returnPending,
        resi_scaduti: returnOverdue,
      }
      if (!FILTERS[f]) throw new UserError(`filtro deve essere uno di: ${Object.keys(FILTERS).join(', ')}.`)
      const max = clampLimit(limite, 20, 50)
      const found = [...shipments]
        .sort((a, b) => (b.shipped_date || '').localeCompare(a.shipped_date || ''))
        .filter(FILTERS[f])
        .filter(sh => matchesClient(recipientLabel(sh, clients, prospects), cliente))
      if (!found.length) return text('Nessuna campionatura con questi filtri.')
      const shown = found.slice(0, max)
      const st = sampleStats(found)
      return text([
        `${plural(found.length, 'invio', 'invii')}${found.length > max ? `, mostro i ${max} più recenti` : ''} · ${st.pieces} pezzi · investito ${eur0(st.invested)}${st.conversion !== null ? ` · conversione in ordine ${Math.round(st.conversion)}%` : ''}:`,
        ...shown.map(sh => `- ${shipmentLine(sh, clients, prospects)}`),
      ].join('\n'), shown.map(sh => ({ id: sh.id, destinatario: recipientLabel(sh, clients, prospects), data: sh.shipped_date, motivo: sh.purpose, pezzi: samplePieces(sh), investito: sampleInvested(sh) })))
    },
  }
}
