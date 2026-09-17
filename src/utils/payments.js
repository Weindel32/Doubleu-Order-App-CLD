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

// Oltre questa distanza dalla data dell'ordine una scadenza non e' plausibile:
// e' quasi sempre un anno digitato male. Due anni lascia spazio a dilazioni
// lunghe vere senza far passare un 2016 al posto di un 2026.
const MAX_GIORNI_SCADENZA = 730

// Una scadenza incoerente con la data dell'ordine va segnalata, non calcolata:
// un solo "20/04/2016" al posto di "20/04/2026" vale 3654 giorni di ritardo e
// travolge qualsiasi statistica gli si costruisca sopra.
export function isSuspectDueDate(order, payment) {
  const { date: due } = paymentDue(order, payment)
  const ordered = startOfDay(parseDate(order?.date))
  if (!due || !ordered) return false
  const diff = Math.round((due - ordered) / DAY)
  return diff < 0 || diff > MAX_GIORNI_SCADENZA
}

export const PAYER_LEVELS = {
  sconosciuto:  { label: 'Da valutare',          rank: 0 },
  puntuale:     { label: 'Puntuale',             rank: 1 },
  lieve:        { label: 'Ritardi lievi',        rank: 2 },
  sistematico:  { label: 'Ritardi sistematici',  rank: 3 },
  critico:      { label: 'Ritardi gravi',        rank: 4 },
}

const levelFor = (value) => {
  if (value === null || value === undefined) return 'sconosciuto'
  if (value <= 0)  return 'puntuale'
  if (value <= 10) return 'lieve'
  if (value <= 30) return 'sistematico'
  return 'critico'
}

// Mediana, non media: su cinque o sei incassi un singolo valore anomalo
// sposta la media di centinaia di giorni e riscrive la storia di un cliente.
// Un club che ha pagato una volta con sei mesi di ritardo e per il resto
// sempre puntuale resterebbe marchiato per anni.
const median = (values) => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

// Profilo pagatore calcolato su un insieme di ordini (tipicamente quelli di un
// cliente). Un cliente si giudica da come ha pagato, non da quanto deve adesso:
// per questo lo storico e l'esposizione aperta restano due misure separate.
//
// Contano solo gli incassi con data REGISTRATA (paidDateVerified): quelli
// ereditati dalla migrazione hanno per costruzione ritardo zero e farebbero
// apparire puntuali clienti di cui non sappiamo nulla. Restano contati a parte
// come `unverified`, per poterlo dire in chiaro invece di tacerlo.
//
// Le rate con una scadenza incoerente restano fuori dal calcolo e si contano
// come `suspect`: sono errori di digitazione da correggere, non comportamenti
// da misurare. Dichiararli e' meglio che scartarli in silenzio, altrimenti il
// refuso resta li' per sempre.
export function paymentProfile(orders, today = new Date()) {
  const delays = []
  let unverified = 0, suspect = 0, openAmount = 0, openDays = 0
  for (const o of (orders || [])) {
    for (const p of (o.payments || [])) {
      if (isSuspectDueDate(o, p)) { suspect += 1; continue }
      const delay = paymentDelay(o, p, today)
      if (delay === null) continue
      if (p.paid) {
        if (p.paidDateVerified === false) unverified += 1
        else delays.push(delay)
      } else if (delay > 0) {
        openAmount += parseFloat(p.amount) || 0
        if (delay > openDays) openDays = delay
      }
    }
  }
  const count  = delays.length
  const enough = count >= MIN_INCASSI_PER_GIUDIZIO
  const typical = enough ? median(delays) : null
  return {
    count,
    unverified,
    suspect,
    // `typical` e' la mediana dei ritardi: il comportamento abituale, non la
    // media, che un solo valore fuori scala rende inservibile.
    typical,
    worst: enough ? Math.max(...delays) : null,
    openAmount,
    openDays,
    level: levelFor(typical),
    hasOverdue: openAmount > 0,
  }
}

// Stessa misura, un cliente per riga, per la vista Analytics.
export function clientPaymentDelays(orders, today = new Date()) {
  const byClient = {}
  for (const o of (orders || [])) (byClient[o.client] ||= []).push(o)
  return Object.entries(byClient)
    .map(([name, os]) => ({ name, ...paymentProfile(os, today) }))
    .filter(r => r.count > 0 || r.unverified > 0 || r.suspect > 0 || r.openAmount > 0)
    .sort((a, b) => (b.openDays - a.openDays) || ((b.typical ?? -999) - (a.typical ?? -999)))
}

// Divide un importo in n tranche senza perdere centesimi: le prime sono
// arrotondate al centesimo, l'ultima assorbe il resto. Su 737,50 in 3 non
// esiste una divisione esatta, e tre volte 245,83 lascerebbero un centesimo
// scoperto.
export function splitAmount(total, parts) {
  const cents = Math.round((parseFloat(total) || 0) * 100)
  const n = Math.max(1, parseInt(parts) || 1)
  const base = Math.floor(cents / n)
  const out = Array(n).fill(base)
  out[n - 1] = cents - base * (n - 1)
  return out.map(c => c / 100)
}

// Spezza una rata in n tranche a date fisse, scalate di `everyDays` giorni a
// partire da `firstDateISO`. Le tranche intermedie diventano di tipo
// 'intermedio', l'ultima eredita il tipo della rata originale (di norma il
// saldo), cosi' resta riconoscibile quale chiude l'ordine.
export function splitPayment(payment, { parts, firstDateISO, everyDays = 30 }) {
  const n = Math.max(2, parseInt(parts) || 2)
  const amounts = splitAmount(payment.amount, n)
  const start = firstDateISO ? new Date(`${firstDateISO}T00:00:00`) : new Date()
  const now = Date.now()
  return amounts.map((amount, i) => ({
    ...payment,
    id: `p${now + i}`,
    amount,
    type: i === n - 1 ? (payment.type || 'saldo') : 'intermedio',
    // Date fisse: una dilazione si concorda a calendario, non si sposta con
    // la consegna come fa un saldo ancorato.
    dueMode: 'fissa',
    dueOffsetDays: 0,
    date: formatItalian(addDays(start, i * (parseInt(everyDays) || 30))),
    paid: false,
    paidDate: null,
    paidDateVerified: true,
    note: payment.note || `Rata ${i + 1} di ${n}`,
  }))
}

// ─── Condizioni concordate vs ordine reale ───────────────────────────────────

// Percentuale di acconto effettiva di un ordine, sul totale delle sue rate.
// null quando non ci sono rate: un ordine senza pagamenti non "deroga", e' solo
// incompleto.
export function depositPercentOf(payments) {
  const rows = payments || []
  const total = rows.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  if (!(total > 0)) return null
  const deposit = rows
    .filter(p => p.type === 'acconto')
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  return Math.round(deposit / total * 100)
}

// Confronta le rate di un ordine con le condizioni concordate col cliente.
// → null quando non c'e' niente da dire; altrimenti { expected, actual, reason }.
//
// Sotto la soglia di importo concordata l'acconto non si chiede, quindi non
// c'e' nessuna deroga da segnalare: un avviso che scatta su ogni ordine da
// venti euro e' un avviso che si smette di leggere.
export function depositDeviation(terms, payments, orderTotal, tolerance = 5) {
  if (!terms) return null
  const expected = Number(terms.payment_deposit_percent)
  if (!(expected > 0)) return null

  const soglia = Number(terms.payment_deposit_min_amount)
  if (soglia > 0 && (parseFloat(orderTotal) || 0) < soglia) return null

  const actual = depositPercentOf(payments)
  if (actual === null) return null
  if (Math.abs(actual - expected) <= tolerance) return null

  return {
    expected,
    actual,
    reason: actual === 0 ? 'nessun acconto' : actual < expected ? 'acconto inferiore' : 'acconto superiore',
  }
}
