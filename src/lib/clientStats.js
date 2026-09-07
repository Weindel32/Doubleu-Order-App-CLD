import { orderTotal, parseDate, isConfirmed } from '../utils/helpers.js'
import { sampleInvested } from '../utils/samples.js'

export const normalizeName = (name) => (name || '').trim().replace(/\s+/g, ' ').toLowerCase()

const getTier = (total) => total >= 4000 ? 'ANCHOR' : total >= 1000 ? 'ALLIED' : 'SCOUT'

// Arricchisce un cliente con ordini/campionature collegati (per client_id,
// con fallback sul nome normalizzato per chi non è ancora collegato) e le
// metriche derivate usate sia dalla lista Clienti che dalla card unificata.
export function enrichClient(c, orders, shipments) {
  const linked      = orders.filter(o => o.clientId === c.id)
  const textMatch   = orders.filter(o => !o.clientId && normalizeName(o.client) === normalizeName(c.name))
  const allOrders   = [...linked, ...textMatch]
  const confirmed   = allOrders.filter(isConfirmed)
  const total       = confirmed.reduce((sum, o) => sum + orderTotal(o), 0)
  const pieces      = confirmed.reduce((sum, o) => sum + (o.pieces || 0), 0)
  const totalIst    = confirmed.filter(o => o.orderType !== 'soci').reduce((sum, o) => sum + orderTotal(o), 0)
  const totalSoci   = confirmed.filter(o => o.orderType === 'soci').reduce((sum, o) => sum + orderTotal(o), 0)
  const unlinkable  = textMatch.filter(o => o.status !== 'PREVENTIVO')
  const nonConfirmed = allOrders.filter(o => !isConfirmed(o))
  const lastTs      = confirmed.reduce((max, o) => { const d = parseDate(o.date); return d && d.getTime() > max ? d.getTime() : max }, 0)
  const lastOrder   = confirmed.reduce((best, o) => { const d = parseDate(o.date); return d && d.getTime() === lastTs ? o.date : best }, null)
  // Campionature: collegate per client_id, con fallback sul nome per
  // gli invii registrati a un destinatario non ancora in anagrafica
  const samples   = shipments.filter(sh => sh.client_id === c.id || (!sh.client_id && !sh.prospect_id && normalizeName(sh.recipient_name) === normalizeName(c.name)))
  const sampleInv = samples.reduce((v, sh) => v + sampleInvested(sh), 0)
  return { ...c, allOrders, confirmed, total, pieces, totalIst, totalSoci, tier: getTier(total), unlinkable, nonConfirmed, lastTs, lastOrder, samples, sampleInv }
}
