import { orderTotal, orderIVA, isConfirmed } from '../utils/helpers.js'
import { paymentDue, formatItalian } from '../utils/payments.js'

// Tre numeri diversi, non intercambiabili per decidere: valore ordini
// (il totale confermato, IVA e spedizione comprese quando presenti),
// ricavi al netto IVA (imponibile + spedizione, esclusa l'IVA che non
// è mai un ricavo aziendale) e incassato (i pagamenti segnati come
// ricevuti, per data del pagamento — non della data dell'ordine, così
// una rata saldata l'anno dopo conta nell'anno in cui è arrivata).
export function revenueByYear(orders) {
  const confirmed = orders.filter(isConfirmed)
  const byYear = {}
  const year = (y) => (byYear[y] = byYear[y] || { value: 0, net: 0, collected: 0 })
  confirmed.forEach(o => {
    const m = o.date?.match(/(\d{4})/)
    if (m) { year(m[1]).value += orderTotal(o); year(m[1]).net += orderTotal(o) - orderIVA(o) }
    // L'incasso si attribuisce all'anno in cui i soldi sono arrivati davvero
    // (paidDate). Per i pagamenti storici senza data di incasso si ricade
    // sulla scadenza, che e' il dato migliore disponibile.
    ;(o.payments || []).filter(p => p.paid).forEach(p => {
      const when = p.paidDate || formatItalian(paymentDue(o, p).date)
      const y = when?.match(/(\d{4})/)?.[1]
      if (y) year(y).collected += parseFloat(p.amount) || 0
    })
  })
  const entries = Object.entries(byYear).filter(([, v]) => v.value > 0).sort(([a], [b]) => a - b)
  const lastTwo = entries.slice(-2)
  const growth = lastTwo.length === 2 && lastTwo[0][1].value > 0
    ? Math.round((lastTwo[1][1].value - lastTwo[0][1].value) / lastTwo[0][1].value * 100)
    : null
  return { entries, growth, prevYear: lastTwo.length === 2 ? lastTwo[0][0] : null }
}
