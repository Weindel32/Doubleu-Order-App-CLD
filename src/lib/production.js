// Tempi di produzione: si parte dalla ricezione delle taglie del club e si contano i giorni
// lavorativi (lunedi'-venerdi', festivita' nazionali escluse). Stesse regole della Production Sheet.
// Date "solo giorno" come stringhe aaaa-mm-gg, per non avere sorprese di fuso orario.

export const DEFAULT_PRODUCTION_DAYS = 30

const day = d => d.toISOString().slice(0, 10)
const fromISO = s => new Date(`${s}T00:00:00Z`)
const plus = (d, n) => new Date(d.getTime() + n * 86_400_000)

// Domenica di Pasqua (algoritmo di Meeus/Jones/Butcher).
function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31), dd = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, dd))
}

const FIXED_HOLIDAYS = ['01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-08', '12-25', '12-26']

export function isWorkingDay(d) {
  const dow = d.getUTCDay()
  if (dow === 0 || dow === 6) return false
  if (FIXED_HOLIDAYS.includes(day(d).slice(5))) return false
  return day(d) !== day(plus(easter(d.getUTCFullYear()), 1)) // Lunedi' dell'Angelo
}

// Giorno italiano di un istante: le taglie arrivate alle 23:30 sono di quel giorno.
export const italianDay = instant => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(instant))

// Primo giorno di produzione: taglie ricevute lun-mer → giorno lavorativo dopo; gio-dom → lunedi' dopo.
export function startFromReceipt(receipt) {
  const r = fromISO(receipt)
  const dow = r.getUTCDay()
  let d = dow >= 1 && dow <= 3 ? plus(r, 1) : plus(r, ((8 - dow) % 7) || 7)
  while (!isWorkingDay(d)) d = plus(d, 1)
  return day(d)
}

// Ultimo giorno di produzione: `days` lavorativi, il primo conta come giorno 1.
export function productionEnd(start, days) {
  let d = fromISO(start)
  while (!isWorkingDay(d)) d = plus(d, 1)
  for (let n = 1; n < days;) { d = plus(d, 1); if (isWorkingDay(d)) n++ }
  return day(d)
}

const fromItalian = s => {
  const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

// "gio 22/10"
export const shortDay = s => `${fromISO(s).toLocaleDateString('it-IT', { weekday: 'short', timeZone: 'UTC' })} ${s.slice(8, 10)}/${s.slice(5, 7)}`

// Piano di un ordine: ricezione taglie (submitted_at del modulo), inizio (a mano o calcolato),
// giorni, pronto e scarto in giorni di calendario rispetto alla consegna prevista (>0 = in ritardo).
export function productionPlan(order, sizesSubmittedAt) {
  const days = order.productionDays > 0 ? order.productionDays : DEFAULT_PRODUCTION_DAYS
  const receipt = sizesSubmittedAt ? italianDay(sizesSubmittedAt) : null
  const start = order.productionStart || (receipt ? startFromReceipt(receipt) : null)
  const ready = start ? productionEnd(start, days) : null
  const promised = fromItalian(order.deliveryDate)
  const delay = ready && promised ? Math.round((fromISO(ready) - fromISO(promised)) / 86_400_000) : null
  return { receipt, start, manualStart: !!order.productionStart, days, ready, delay }
}
