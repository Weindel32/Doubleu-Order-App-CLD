import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'

export function getAllArticles(order) {
  return (order.kits || []).flatMap(k => k.articles || [])
}

// ── Order status predicates ───────────────────────────────────────
// Un ordine annullato resta in archivio ma è escluso da fatturato,
// pezzi prodotti e alert pagamenti (tracciato a parte nelle statistiche).
export const isCancelled = order => order.status === 'ANNULLATO'
export const isQuote     = order => order.status === 'PREVENTIVO'
export const isConfirmed = order => order.status !== 'PREVENTIVO' && order.status !== 'ANNULLATO'

export function artPieceCount(art) {
  return ADULT_SIZES.reduce((s, sz) => s + (art.sizes?.adult?.[sz] || 0), 0)
       + KIDS_SIZES.reduce((s, sz)  => s + (art.sizes?.kids?.[sz]  || 0), 0)
       + (art.sizes?.uni || 0)
}

// ── Kit pricing: price × kit.quantity (per-kit), fallback to order.kitQuantity for old records
// ── Single pricing: price × pieces per article
// In entrambe le modalità la quantità fatturabile esclude l'omaggio — la
// quantità intera ordinata (per produzione/consegna) resta quella delle
// taglie inserite per ogni articolo, mai toccata qui.
export function orderSubtotal(order) {
  if (!order.kits) return 0
  if (order.pricingMode === 'kit') {
    return order.kits.reduce((sum, kit) => sum + kitLineBase(order, kit), 0)
  }
  return getAllArticles(order).reduce((sum, a) => sum + artLineBase(a), 0)
}

// ── Shipping is a flat cost added to the total (net, not subject to IVA)
export function orderShipping(order) {
  return parseFloat(order.shipping) || 0
}

// ── Sconto ────────────────────────────────────────────────────────
// discountMode: 'nessuno' | 'ordine' (default, sull'intero subtotale)
// | 'articolo' (per riga: per articolo in pricing singolo, per kit in
// pricing kit). Gli ordini salvati prima di questa modalità non hanno
// il campo e ricadono su 'ordine', quindi restano invariati.
// discountType: 'percentuale' (% sulla base) | 'importo' (€ sulla riga).
export function discountAmount(base, type, value) {
  const v = parseFloat(value) || 0
  if (v <= 0 || base <= 0) return 0
  const amount = type === 'importo' ? v : base * (v / 100)
  return Math.min(amount, base)
}

// Pezzi dell'articolo al netto dell'omaggio — solo per il fatturato: la
// produzione/consegna deve sempre vedere il totale pieno, mai questo.
export function artBillablePieces(art) {
  const pieces = artPieceCount(art) || parseInt(art.estimatedQty) || 0
  return Math.max(0, pieces - (parseFloat(art.omaggio) || 0))
}

export function artLineBase(art) {
  return (parseFloat(art.price) || 0) * artBillablePieces(art)
}

// Quantità di kit fatturabile: la quantità ordinata (persone/kit) meno i
// kit dati in omaggio, un numero deciso da chi compila l'ordine — non
// dedotto dai singoli capi omaggio (un kit può avere pezzi diversi tra loro,
// es. pantaloncino per un kit uomo e gonnellino per un kit donna, entrambi
// nello stesso "2 kit omaggio"). Quantità di produzione invariata altrove.
export function kitBillableQty(order, kit) {
  const qty = parseInt(kit.quantity) || parseInt(order.kitQuantity) || 0
  return Math.max(0, qty - (parseFloat(kit.omaggio) || 0))
}

export function kitLineBase(order, kit) {
  return (parseFloat(kit.price) || 0) * kitBillableQty(order, kit)
}

export function artLineDiscount(art) {
  return discountAmount(artLineBase(art), art.discountType, art.discountValue)
}

export function kitLineDiscount(order, kit) {
  return discountAmount(kitLineBase(order, kit), kit.discountType, kit.discountValue)
}

// Sconto di riga effettivamente applicato: vale solo in modalità
// 'articolo' e solo per il pricing corrispondente, così i valori
// rimasti su articoli/kit non compaiono se poi si torna allo sconto
// sull'intero ordine.
export function artDiscountApplied(order, art) {
  if (order.discountMode !== 'articolo' || order.pricingMode === 'kit') return 0
  return artLineDiscount(art)
}

export function kitDiscountApplied(order, kit) {
  if (order.discountMode !== 'articolo' || order.pricingMode !== 'kit') return 0
  return kitLineDiscount(order, kit)
}

export function orderDiscount(order) {
  if (order.discountMode === 'nessuno') return 0
  if (order.discountMode === 'articolo') {
    if (order.pricingMode === 'kit') {
      return (order.kits || []).reduce((s, kit) => s + kitLineDiscount(order, kit), 0)
    }
    return getAllArticles(order).reduce((s, art) => s + artLineDiscount(art), 0)
  }
  return discountAmount(orderSubtotal(order), order.discountType, order.discountValue)
}

// ── Imponibile: subtotale al netto dello sconto. È la base dell'IVA.
export function orderTaxable(order) {
  return orderSubtotal(order) - orderDiscount(order)
}

export function orderIVA(order) {
  if (!order.ivaEnabled) return 0
  return orderTaxable(order) * ((parseFloat(order.ivaRate) || 22) / 100)
}

export function orderTotal(order) {
  return orderTaxable(order) + orderIVA(order) + orderShipping(order)
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
  if (['CONSEGNATO', 'ANNULLATO'].includes(order.status)) return false
  const days = daysUntilDelivery(order)
  if (days === null) return false
  return days <= (order.alertDays || 7)
}
