import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'

export function getAllArticles(order) {
  return (order.kits || []).flatMap(k => k.articles || [])
}

export function artPieceCount(art) {
  return ADULT_SIZES.reduce((s, sz) => s + (art.sizes?.adult?.[sz] || 0), 0)
       + KIDS_SIZES.reduce((s, sz)  => s + (art.sizes?.kids?.[sz]  || 0), 0)
}

// ── Kit pricing: price × kitQuantity (explicit number of kits/players)
// ── Single pricing: price × pieces per article
export function orderSubtotal(order) {
  if (!order.kits) return 0
  if (order.pricingMode === 'kit') {
    return order.kits.reduce((sum, kit) => {
      const qty = parseInt(order.kitQuantity) || 0
      return sum + (parseFloat(kit.price) || 0) * qty
    }, 0)
  }
  return (order.kits || []).flatMap(k => k.articles || []).reduce((sum, a) => {
    return sum + (parseFloat(a.price) || 0) * artPieceCount(a)
  }, 0)
}

export function orderIVA(order) {
  if (!order.ivaEnabled) return 0
  return orderSubtotal(order) * ((parseFloat(order.ivaRate) || 22) / 100)
}

export function orderTotal(order) {
  return orderSubtotal(order) + orderIVA(order)
}

export function paymentSummary(order) {
  const total   = orderTotal(order)
  const paid    = (order.payments || []).filter(p => p.paid).reduce((s, p)  => s + (parseFloat(p.amount) || 0), 0)
  const pending = (order.payments || []).filter(p => !p.paid).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  return { total, paid, pending, residual: Math.max(0, total - paid - pending) }
}

export function parseDate(str) {
  if (!str) return null
  const [d, m, y] = str.split('/')
  return new Date(+y, +m - 1, +d)
}

export function daysUntilDelivery(order) {
  const delivery = parseDate(order.deliveryDate)
  if (!delivery) return null
  const today = new Date(); today.setHours(0,0,0,0)
  return Math.round((delivery - today) / 86400000)
}

export function needsAlert(order) {
  if (['CONSEGNATO'].includes(order.status)) return false
  const days = daysUntilDelivery(order)
  if (days === null) return false
  return days <= (order.alertDays || 7)
}
