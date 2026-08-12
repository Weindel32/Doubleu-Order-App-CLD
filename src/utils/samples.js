import { GOLD, MUTED, CLAY, GREEN } from '../tokens.js'

// ─── Registro campionature ───────────────────────────────────────
// Un invio di campioni (sample_shipments) raccoglie data, destinatario
// e righe articolo (sample_items). Le date sono in formato ISO
// (yyyy-mm-dd) come next_action_date dei prospect: si ordinano e si
// confrontano come stringhe. fmtDate() le mostra all'italiana.

export const PURPOSES = ['valutazione', 'misurazione', 'fiera', 'omaggio']

export const PURPOSE_LABELS = {
  valutazione: 'Valutazione',
  misurazione: 'Set misure',
  fiera:       'Fiera / Evento',
  omaggio:     'Omaggio',
}

// I set misure servono a provare le taglie e rientrano sempre.
export const alwaysReturned = (purpose) => purpose === 'misurazione'

export const OUTCOMES = ['in_attesa', 'positivo', 'negativo', 'preventivo', 'ordine']

export const OUTCOME_LABELS = {
  in_attesa:  'In attesa',
  positivo:   'Feedback positivo',
  negativo:   'Feedback negativo',
  preventivo: 'Preventivo emesso',
  ordine:     'Ordine acquisito',
}

export const OUTCOME_CFG = {
  in_attesa:  { color: MUTED,     border: 'rgba(138,154,181,0.3)',  bg: 'rgba(138,154,181,0.12)' },
  positivo:   { color: '#7aaee8', border: 'rgba(90,130,184,0.35)',  bg: 'rgba(90,130,184,0.15)'  },
  negativo:   { color: CLAY,      border: 'rgba(196,98,58,0.3)',    bg: 'rgba(196,98,58,0.12)'   },
  preventivo: { color: GOLD,      border: 'rgba(184,150,90,0.35)',  bg: 'rgba(184,150,90,0.15)'  },
  ordine:     { color: GREEN,     border: 'rgba(74,158,110,0.35)',  bg: 'rgba(74,158,110,0.15)'  },
}

// Un esito è "chiuso" quando la palla è tornata a noi: niente più follow-up.
export const isOpenOutcome = (sh) => (sh.outcome || 'in_attesa') === 'in_attesa'

// Giorni di silenzio dopo i quali un invio senza esito va sollecitato
export const FOLLOW_UP_DAYS = 21

export const todayISO = () => new Date().toISOString().slice(0, 10)

export function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function daysSince(iso) {
  if (!iso) return null
  const then = new Date(`${iso}T00:00:00`)
  if (isNaN(then)) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((today - then) / 86400000)
}

export const addDaysISO = (iso, days) => {
  const base = iso ? new Date(`${iso}T00:00:00`) : new Date()
  if (isNaN(base)) return ''
  base.setDate(base.getDate() + days)
  return base.toISOString().slice(0, 10)
}

// ─── Pezzi e valore ──────────────────────────────────────────────

export const samplePieces = (sh) =>
  (sh.items || []).reduce((n, it) => n + (parseInt(it.quantity) || 0), 0)

export const itemValue = (it) =>
  (parseInt(it.quantity) || 0) * (parseFloat(it.unit_value) || 0)

export const sampleGoodsValue = (sh) =>
  (sh.items || []).reduce((v, it) => v + itemValue(it), 0)

export const sampleShipping = (sh) => parseFloat(sh.shipping_cost) || 0

// Valore complessivo movimentato: merce + spedizione.
export const sampleTotalValue = (sh) => sampleGoodsValue(sh) + sampleShipping(sh)

// Investimento effettivo sul cliente: la spedizione è sempre un costo,
// la merce pesa finché non rientra. Un campione a fondo perduto non
// rientra mai, quindi resta a carico per intero.
export const sampleInvested = (sh) =>
  sampleShipping(sh) + (sh.items || []).reduce((v, it) => v + (it.returned ? 0 : itemValue(it)), 0)

// Merce prestata e non ancora tornata indietro
export const sampleOutstanding = (sh) =>
  sh.return_required
    ? (sh.items || []).reduce((v, it) => v + (it.returned ? 0 : itemValue(it)), 0)
    : 0

export const allItemsReturned = (sh) =>
  (sh.items || []).length > 0 && (sh.items || []).every(it => it.returned)

// ─── Alert ───────────────────────────────────────────────────────

// Nessuna risposta dopo FOLLOW_UP_DAYS (o dopo la data di follow-up
// impostata a mano, se presente).
export function needsFollowUp(sh) {
  if (!isOpenOutcome(sh)) return false
  if (sh.follow_up_date) return sh.follow_up_date <= todayISO()
  const days = daysSince(sh.shipped_date)
  return days !== null && days >= FOLLOW_UP_DAYS
}

// Reso atteso e scaduto
export function returnOverdue(sh) {
  if (!sh.return_required || sh.returned_date || allItemsReturned(sh)) return false
  if (!sh.return_due_date) return false
  return sh.return_due_date < todayISO()
}

// Reso ancora aperto, scaduto o no
export function returnPending(sh) {
  return !!sh.return_required && !sh.returned_date && !allItemsReturned(sh)
}

// ─── Aggregati ───────────────────────────────────────────────────

export function sampleStats(shipments) {
  const list      = shipments || []
  const converted = list.filter(sh => sh.outcome === 'ordine')
  const closed    = list.filter(sh => !isOpenOutcome(sh))
  return {
    count:       list.length,
    pieces:      list.reduce((n, sh) => n + samplePieces(sh), 0),
    invested:    list.reduce((v, sh) => v + sampleInvested(sh), 0),
    outstanding: list.reduce((v, sh) => v + sampleOutstanding(sh), 0),
    open:        list.filter(isOpenOutcome).length,
    toFollowUp:  list.filter(needsFollowUp).length,
    toReturn:    list.filter(returnPending).length,
    overdue:     list.filter(returnOverdue).length,
    converted:   converted.length,
    // Sul totale degli invii con esito noto: gli invii ancora in attesa
    // non hanno ancora vinto né perso e falserebbero la percentuale.
    conversion:  closed.length > 0 ? (converted.length / closed.length) * 100 : null,
  }
}

// Etichetta destinatario, con fallback sullo snapshot salvato all'invio
export function recipientLabel(sh, clients = [], prospects = []) {
  if (sh.client_id) {
    const c = clients.find(x => x.id === sh.client_id)
    if (c) return c.name
  }
  if (sh.prospect_id) {
    const p = prospects.find(x => x.id === sh.prospect_id)
    if (p) return p.name
  }
  return sh.recipient_name || '—'
}

export const euro = (v, decimals = 0) =>
  `€ ${(v || 0).toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
