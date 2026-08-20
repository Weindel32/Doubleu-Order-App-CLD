import { GOLD, MUTED, CLAY, GREEN } from '../tokens.js'

// ─── Registro campionature ───────────────────────────────────────
// Un invio di campioni (sample_shipments) è il contenitore logistico
// (data, destinatario, corriere). Ogni riga articolo (sample_items)
// porta il proprio esito: articoli diversi nello stesso invio possono
// avere feedback diversi, quindi l'esito non vive sull'invio.
// Le date sono in formato ISO (yyyy-mm-dd): si ordinano e confrontano
// come stringhe. fmtDate() le mostra all'italiana.

// Il motivo dice perché i campioni sono partiti; se poi la merce sia
// regalata è un fatto separato (vedi isGift): un invio in valutazione,
// fatto per arrivare a un ordine, può essere anche un omaggio.
export const PURPOSES = ['valutazione', 'misurazione', 'fiera', 'promozione']

export const PURPOSE_LABELS = {
  valutazione: 'Valutazione',
  misurazione: 'Set misure',
  fiera:       'Fiera / Evento',
  promozione:  'Promozione',
}

// Colori badge per motivo invio, a colpo d'occhio nelle liste.
export const PURPOSE_CFG = {
  valutazione: { color: '#7aaee8', border: 'rgba(90,130,184,0.35)',  bg: 'rgba(90,130,184,0.15)'  },
  misurazione: { color: MUTED,     border: 'rgba(138,154,181,0.3)', bg: 'rgba(138,154,181,0.12)' },
  fiera:       { color: '#e8c96e', border: 'rgba(180,140,50,0.4)',  bg: 'rgba(180,140,50,0.18)'  },
  promozione:  { color: '#b98ad4', border: 'rgba(150,110,190,0.4)', bg: 'rgba(150,110,190,0.15)' },
}

// Merce regalata: non rientra e non verrà fatturata. Indipendente dal
// motivo, così resta lo storico di quanto è stato dato via.
export const isGift = (sh) => !!(sh && sh.omaggio)

export const GIFT_CFG = { color: CLAY, border: 'rgba(196,98,58,0.4)', bg: 'rgba(196,98,58,0.15)' }

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

// Colori a colpo d'occhio: verde/rosso per il feedback (buono/cattivo),
// separati dall'esito commerciale (blu = preventivo in corso, oro =
// ordine acquisito, come il resto dei valori economici nell'app). Un
// feedback positivo non implica un ordine: sono stati indipendenti.
export const OUTCOME_CFG = {
  in_attesa:  { color: MUTED,     border: 'rgba(138,154,181,0.3)',  bg: 'rgba(138,154,181,0.12)' },
  positivo:   { color: GREEN,     border: 'rgba(74,158,110,0.35)',  bg: 'rgba(74,158,110,0.15)'  },
  negativo:   { color: CLAY,      border: 'rgba(196,98,58,0.3)',    bg: 'rgba(196,98,58,0.12)'   },
  preventivo: { color: '#7aaee8', border: 'rgba(90,130,184,0.35)',  bg: 'rgba(90,130,184,0.15)'  },
  ordine:     { color: GOLD,      border: 'rgba(184,150,90,0.35)',  bg: 'rgba(184,150,90,0.15)'  },
}

// Un articolo è "aperto" finché non ha ricevuto un esito.
export const itemOutcome   = (it) => it.outcome || 'in_attesa'
export const isItemOpen    = (it) => itemOutcome(it) === 'in_attesa'
export const isItemClosed  = (it) => !isItemOpen(it)

// Indipendente dall'esito: un feedback positivo (o negativo) può
// comunque portare con sé una richiesta di modifica tecnica al capo.
export const itemNeedsRevision = (it) => !!it.revision_requested
export const shipmentNeedsRevision = (sh) => (sh.items || []).some(itemNeedsRevision)

// Giorni di silenzio dopo i quali un invio senza esito va sollecitato
export const FOLLOW_UP_DAYS = 10

// Le date qui sono giorni di calendario, non istanti: vanno lette nel
// fuso di chi usa l'app. Passare da toISOString() le convertirebbe in
// UTC, e a est di Greenwich la mezzanotte locale cade nel giorno prima:
// il risultato uscirebbe indietro di un giorno.
const localISO = (d) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const todayISO = () => localISO(new Date())

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
  return localISO(base)
}

// ─── Pezzi e valore ──────────────────────────────────────────────
// unit_cost  = prezzo di costo: base dell'esposizione economica reale.
// unit_price = prezzo al club/listino: riferimento per un eventuale
//              addebito, non entra nel calcolo dell'investito.

export const samplePieces = (sh) =>
  (sh.items || []).reduce((n, it) => n + (parseInt(it.quantity) || 0), 0)

export const itemCostValue  = (it) => (parseInt(it.quantity) || 0) * (parseFloat(it.unit_cost)  || 0)
export const itemPriceValue = (it) => (parseInt(it.quantity) || 0) * (parseFloat(it.unit_price) || 0)

export const sampleCostValue = (sh) =>
  (sh.items || []).reduce((v, it) => v + itemCostValue(it), 0)

export const samplePriceValue = (sh) =>
  (sh.items || []).reduce((v, it) => v + itemPriceValue(it), 0)

export const sampleShipping = (sh) => parseFloat(sh.shipping_cost) || 0

// Investimento effettivo sul cliente: la spedizione è sempre un costo,
// la merce (al prezzo di costo) pesa finché non rientra. Un campione a
// fondo perduto non rientra mai, quindi resta a carico per intero.
export const sampleInvested = (sh) =>
  sampleShipping(sh) + (sh.items || []).reduce((v, it) => v + (it.returned ? 0 : itemCostValue(it)), 0)

// Merce (a prezzo di costo) prestata e non ancora tornata indietro
export const sampleOutstanding = (sh) =>
  sh.return_required
    ? (sh.items || []).reduce((v, it) => v + (it.returned ? 0 : itemCostValue(it)), 0)
    : 0

// Valore regalato: quanto è stato dato via, a prezzo di costo. Sulla
// merce soltanto — la spedizione è un costo commerciale, non un regalo
// che finisce nelle mani del club.
export const sampleGifted = (sh) => isGift(sh) ? sampleCostValue(sh) : 0

export const allItemsReturned = (sh) =>
  (sh.items || []).length > 0 && (sh.items || []).every(it => it.returned)

// ─── Esito per invio: riepilogo dei singoli articoli ─────────────
// Non collassiamo l'esito a un solo valore: un invio con feedback
// misto (una riga positiva, una negativa) resta misto in UI.

export function shipmentOutcomeSummary(sh) {
  const items = sh.items || []
  const counts = {}
  items.forEach(it => {
    const o = itemOutcome(it)
    counts[o] = (counts[o] || 0) + 1
  })
  const distinct = Object.keys(counts)
  return {
    counts,
    total:  items.length,
    open:   counts.in_attesa || 0,
    isOpen: (counts.in_attesa || 0) > 0,
    isMixed: distinct.filter(o => o !== 'in_attesa').length > 1,
    // Se tutte le righe condividono lo stesso esito, utile per un badge unico
    uniform: distinct.length === 1 ? distinct[0] : null,
  }
}

// ─── Alert ───────────────────────────────────────────────────────

// Almeno un articolo ancora senza risposta dopo FOLLOW_UP_DAYS (o
// dopo la data di follow-up impostata a mano, se presente).
export function needsFollowUp(sh) {
  const hasOpenItem = (sh.items || []).some(isItemOpen)
  if (!hasOpenItem) return false
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
  const list  = shipments || []
  const items = list.flatMap(sh => sh.items || [])
  const converted = items.filter(it => itemOutcome(it) === 'ordine')
  const closed    = items.filter(isItemClosed)
  return {
    count:       list.length,
    pieces:      list.reduce((n, sh) => n + samplePieces(sh), 0),
    invested:    list.reduce((v, sh) => v + sampleInvested(sh), 0),
    outstanding: list.reduce((v, sh) => v + sampleOutstanding(sh), 0),
    gifted:      list.reduce((v, sh) => v + sampleGifted(sh), 0),
    giftCount:   list.filter(isGift).length,
    open:        list.filter(sh => (sh.items || []).some(isItemOpen)).length,
    toFollowUp:  list.filter(needsFollowUp).length,
    toReturn:    list.filter(returnPending).length,
    overdue:     list.filter(returnOverdue).length,
    converted:   converted.length,
    // Sul totale degli articoli con esito noto: quelli ancora in attesa
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

// Paese del destinatario, preso dall'anagrafica: decide la lingua della
// bolla campioni. Vuoto per chi non è in archivio.
export function recipientCountry(sh, clients = [], prospects = []) {
  if (sh.client_id) {
    const c = clients.find(x => String(x.id) === String(sh.client_id))
    if (c) return c.country || ''
  }
  if (sh.prospect_id) {
    const p = prospects.find(x => String(x.id) === String(sh.prospect_id))
    if (p) return p.country || ''
  }
  return ''
}

// Come nelle schede cliente: l'Italia è il caso normale e non si scrive,
// così in elenco risalta solo chi è estero.
export function foreignCountryLabel(sh, clients = [], prospects = []) {
  const country = (recipientCountry(sh, clients, prospects) || '').trim()
  return country && !/^ital/i.test(country) ? country : ''
}

export const euro = (v, decimals = 0) =>
  `€ ${(v || 0).toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
