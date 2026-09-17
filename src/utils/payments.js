// Scadenze e ritardi di pagamento.
//
// Un pagamento ha due modi di scadere:
//  - 'fissa'    → la scadenza e' la data digitata a mano (campo date)
//  - 'consegna' → la scadenza e' ancorata alla consegna reale dell'ordine,
//                 piu' un eventuale offset in giorni (saldo a 30gg ecc.)
//
// L'ancoraggio serve perche' la consegna si sposta: se il saldo e' "alla
// consegna" e spedisci con quattro giorni di anticipo, il credito scade
// quattro giorni prima — senza che nessuno debba riscrivere la data.
//
// Finche' l'ordine non e' consegnato la scadenza ancorata resta una stima,
// calcolata sulla consegna prevista: e' segnalata con estimated:true e non
// produce mai un ritardo, perche' un credito non puo' essere scaduto se la
// merce non e' ancora partita.

const DAY = 86400000

// Parsing locale di gg/mm/aaaa: payments.js non importa helpers.js perche'
// e' helpers a dipendere da qui (overduePayments), e un ciclo fra i due
// moduli sarebbe fragile da mantenere.
const parseDate = (str) => {
  if (!str) return null
  const [d, m, y] = String(str).split('/')
  if (!d || !m || !y) return null
  const date = new Date(+y, +m - 1, +d)
  return isNaN(date) ? null : date
}

export const startOfDay = (d) => {
  if (!d) return null
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const addDays = (date, days) => {
  if (!date) return null
  const x = new Date(date)
  x.setDate(x.getDate() + (parseInt(days) || 0))
  return x
}

export const formatItalian = (date) =>
  date ? `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}` : ''

// Scadenza effettiva di un pagamento.
// → { date: Date|null, estimated: boolean }
export function paymentDue(order, payment) {
  if (!payment) return { date: null, estimated: false }
  if (payment.dueMode === 'consegna') {
    const real = startOfDay(parseDate(order?.actualDeliveryDate))
    if (real) return { date: addDays(real, payment.dueOffsetDays), estimated: false }
    const planned = startOfDay(parseDate(order?.deliveryDate))
    if (planned) return { date: addDays(planned, payment.dueOffsetDays), estimated: true }
    return { date: null, estimated: true }
  }
  return { date: startOfDay(parseDate(payment.date)), estimated: false }
}

// Giorni di ritardo di un singolo pagamento.
// Positivo = in ritardo, negativo = in anticipo, 0 = puntuale, null = non
// calcolabile (manca la scadenza, o e' una stima su ordine non consegnato).
// Per un pagamento gia' incassato misura il ritardo storico (paidDate vs
// scadenza); per uno aperto misura quanto e' scaduto a oggi.
export function paymentDelay(order, payment, today = new Date()) {
  const { date: due, estimated } = paymentDue(order, payment)
  if (!due) return null
  if (payment.paid) {
    const paidOn = startOfDay(parseDate(payment.paidDate))
    if (!paidOn) return null
    return Math.round((paidOn - due) / DAY)
  }
  if (estimated) return null
  return Math.round((startOfDay(today) - due) / DAY)
}

// Riepilogo dei crediti scaduti di un ordine.
// → { amount, days, count } — days e' il ritardo del credito piu' vecchio.
export function overdueSummary(order, today = new Date()) {
  const open = (order?.payments || []).filter(p => !p.paid)
  let amount = 0, days = 0, count = 0
  for (const p of open) {
    const delay = paymentDelay(order, p, today)
    if (delay === null || delay <= 0) continue
    amount += parseFloat(p.amount) || 0
    count  += 1
    if (delay > days) days = delay
  }
  return { amount, days, count }
}

// Numero minimo di incassi verificati sotto il quale non si esprime un
// giudizio sul cliente: uno o due pagamenti sono un aneddoto, non un
// comportamento.
export const MIN_INCASSI_PER_GIUDIZIO = 3

// Ritardo medio di pagamento per cliente, sugli incassi gia' avvenuti.
// Un cliente si giudica da come ha pagato, non da quanto deve adesso.
//
// Contano solo gli incassi con una data REGISTRATA (paidDateVerified): quelli
// ereditati dalla migrazione hanno per costruzione ritardo zero e farebbero
// apparire puntuali clienti di cui non sappiamo nulla. Restano contati a parte
// come `unverified`, per poterlo dire in chiaro invece di tacerlo.
export function clientPaymentDelays(orders, today = new Date()) {
  const byClient = {}
  for (const o of (orders || [])) {
    for (const p of (o.payments || [])) {
      const delay = paymentDelay(o, p, today)
      if (delay === null) continue
      const row = byClient[o.client] ||= { name: o.client, delays: [], unverified: 0, openAmount: 0, openDays: 0 }
      if (p.paid) {
        if (p.paidDateVerified === false) row.unverified += 1
        else row.delays.push(delay)
      } else if (delay > 0) {
        row.openAmount += parseFloat(p.amount) || 0
        if (delay > row.openDays) row.openDays = delay
      }
    }
  }
  return Object.values(byClient)
    .map(r => {
      const count    = r.delays.length
      const enough   = count >= MIN_INCASSI_PER_GIUDIZIO
      return {
        name: r.name,
        count,
        unverified: r.unverified,
        // avg resta null finche' non c'e' abbastanza storia verificata: la UI
        // mostra il conteggio, non un giudizio.
        avg: enough ? Math.round(r.delays.reduce((s, d) => s + d, 0) / count) : null,
        worst: enough ? Math.max(...r.delays) : null,
        openAmount: r.openAmount,
        openDays: r.openDays,
      }
    })
    .filter(r => r.count > 0 || r.unverified > 0 || r.openAmount > 0)
    .sort((a, b) => (b.openDays - a.openDays) || ((b.avg ?? -999) - (a.avg ?? -999)))
}
