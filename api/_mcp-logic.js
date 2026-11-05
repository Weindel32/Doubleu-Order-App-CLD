// Logica pura del connettore MCP per gli invii campioni: ricerca
// destinatari e articoli, lettura delle righe scritte in chat, anteprima e
// codice di conferma. Nessun accesso al database qui: i dati arrivano da
// fuori, così tutto è verificabile nei test senza Supabase.
//
// Le regole dell'invio sono quelle dell'app e si importano da lì
// (motivi, set misure che rientrano sempre, follow-up, taglie, catalogo):
// non vanno ricopiate.

import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import { PRODUCT_CATALOG } from '../src/data/productCatalog.js'
import { ADULT_SIZES, KIDS_SIZES, CATEGORIES } from '../src/tokens.js'
import {
  PURPOSES, PURPOSE_LABELS, OUTCOME_LABELS, alwaysReturned, addDaysISO, fmtDate,
  FOLLOW_UP_DAYS, followUpBaseDate, euro,
} from '../src/utils/samples.js'

// Errore da mostrare così com'è a chi scrive in chat: dice cosa manca o
// cosa è ambiguo. Gli altri errori sono guasti e vanno nei log.
export class UserError extends Error {}

export const TOKEN_TTL_MS = 15 * 60 * 1000
export const MAX_ROWS = 50
export const MAX_QTY = 500

// ─── Testo ───────────────────────────────────────────────────────

export const normalize = (s) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const compact = (s) => normalize(s).replace(/ /g, '')

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

// 1 = identico, 0 = niente in comune. Regge refusi ("vilage"), parole
// mancanti ("eco village" per "TENNIS ECO VILLAGE") e maiuscole/accenti.
export function matchScore(query, name) {
  const q = normalize(query)
  const n = normalize(name)
  if (!q || !n) return 0
  if (q === n) return 1
  if (n.includes(q) || q.includes(n)) return 0.9
  const nt = n.split(' ')
  const qt = q.split(' ')
  const hit = (t) => nt.some(x => x === t
    || (t.length >= 3 && x.startsWith(t))
    || (t.length >= 4 && x.length >= 4 && levenshtein(t, x) <= 1))
  const tokens = qt.filter(hit).length / qt.length
  const whole = 1 - levenshtein(q, n) / Math.max(q.length, n.length)
  return Math.max(tokens * 0.85, whole)
}

export const MATCH_THRESHOLD = 0.6

// ─── Destinatari ─────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v.trim())

// Clienti e prospect insieme: i campioni vanno spesso a club non ancora
// clienti. Con più candidati si restituiscono tutti: sceglie chi scrive.
export function searchRecipients(query, { clients = [], prospects = [] }) {
  if (!normalize(query)) throw new UserError('Scrivi almeno una parte del nome del club da cercare.')
  const clientName = new Map(clients.map(c => [c.id, c.name]))
  const out = []
  for (const c of clients) {
    const score = matchScore(query, c.name)
    if (score >= MATCH_THRESHOLD) out.push({
      tipo: 'cliente', id: c.id, nome: c.name,
      citta: c.city || null, provincia: c.province || null, paese: c.country || null, score,
    })
  }
  for (const p of prospects) {
    const score = matchScore(query, p.name)
    if (score >= MATCH_THRESHOLD) out.push({
      tipo: 'prospect', id: p.id, nome: p.name,
      citta: p.city || null, provincia: p.province || null, paese: p.country || null,
      stato: p.hibernated_at ? 'ibernato' : (p.stage || null),
      cliente_collegato: p.client_id ? (clientName.get(p.client_id) || p.client_id) : null,
      score,
    })
  }
  // A parità di somiglianza prima i clienti: sono la scelta più comune.
  return out
    .sort((a, b) => b.score - a.score || (a.tipo === 'cliente' ? -1 : 1) || a.nome.localeCompare(b.nome, 'it'))
    .slice(0, 15)
    .map(({ score, ...r }) => ({ ...r, somiglianza: Math.round(score * 100) / 100 }))
}

// ─── Taglie ──────────────────────────────────────────────────────

export const SIZE_ORDER = [...KIDS_SIZES, ...ADULT_SIZES, 'UNI']

export function normalizeSize(raw) {
  let s = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, ' ')
  s = s.replace(/^(\d+)\s*(ANNI|ANNO|AA|A|Y|YRS|YEARS)\.?$/, '$1')
  if (/^(TU|UNI|UNICA|UNICO|TAGLIA UNICA|ONE SIZE|OS)$/.test(s)) return 'UNI'
  if (s === '2XL') return 'XXL'
  return SIZE_ORDER.includes(s) ? s : null
}

// Accetta ["10", "12 anni", "M"] oppure "10, 12, 14 anni / M L".
// Restituisce le taglie valide, senza doppioni e nell'ordine dell'app
// (bambino crescente, poi adulto), e quelle non riconosciute.
export function parseSizes(input) {
  if (input === undefined || input === null || input === '') return { sizes: [], invalid: [] }
  const text = (Array.isArray(input) ? input.join(',') : String(input))
    .replace(/taglia\s+unica/gi, 'UNI')
    .replace(/\b(anni|anno)\b/gi, ' ')
  const parts = text.split(/[\s,;/|+]+/).map(x => x.trim()).filter(Boolean)
  const sizes = new Set()
  const invalid = []
  for (const part of parts) {
    const n = normalizeSize(part)
    if (n) sizes.add(n)
    else invalid.push(part)
  }
  return { sizes: SIZE_ORDER.filter(x => sizes.has(x)), invalid }
}

// ─── Articoli ────────────────────────────────────────────────────

// Dal nome del capo alla categoria dell'app. L'ordine conta: "felpa zip"
// è Zip Hoodie prima che Hoodie, "pantaloncini" è Short prima che
// Sweatpants. "T-shirt" resta senza categoria: in app ne esistono quattro.
const CATEGORY_HINTS = [
  [/\bzip\b|full ?zip|zippata/, 'Zip Hoodie'],
  [/cappuccio|hoodie/, 'Hoodie'],
  [/felpa|sweatshirt|girocollo/, 'Sweatshirt'],
  [/pantaloncin|short|bermuda/, 'Short'],
  [/pantalon|sweatpant|jogger|\btuta\b/, 'Sweatpants'],
  [/gonn|skirt/, 'Skirt'],
  [/vestit|dress|abitin/, 'Dress'],
  [/\bpolo\b/, 'Polo'],
  [/giacc|piumin|giubbin|jacket|smanicat/, 'Giacca'],
]

export function inferCategory(description) {
  const d = normalize(description)
  if (!d) return null
  const hit = CATEGORY_HINTS.find(([re]) => re.test(d))
  return hit ? hit[1] : null
}

export function findCatalogByCode(code) {
  const c = compact(code)
  if (!c) return null
  return PRODUCT_CATALOG.find(p => compact(p.code) === c) || null
}

export function searchArticles(query) {
  const q = normalize(query)
  if (!q) throw new UserError('Scrivi il codice (es. DUSP 139) o il nome del capo (es. polo, felpa con cappuccio).')
  const cat = inferCategory(query)
  const cq = compact(query)
  return PRODUCT_CATALOG
    .map(p => {
      let score = Math.max(matchScore(query, p.description), matchScore(query, p.category))
      if (cq.length >= 2 && compact(p.code).includes(cq)) score = Math.max(score, compact(p.code) === cq ? 1 : 0.95)
      if (cat && p.category === cat) score = Math.max(score, 0.8)
      return { p, score }
    })
    .filter(x => x.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.p.code.localeCompare(b.p.code, 'it'))
    .slice(0, 25)
    .map(({ p }) => ({ codice: p.code, descrizione: p.description, categoria: p.category }))
}

// ─── Date e motivo ───────────────────────────────────────────────

export function parseDate(value, label, problems) {
  if (value === undefined || value === null || value === '') return null
  const s = String(value).trim()
  let y, m, d
  let mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (mt) [, y, m, d] = mt
  else if ((mt = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [, d, m, y] = mt
  if (y) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dt = new Date(`${iso}T00:00:00Z`)
    if (!isNaN(dt) && dt.toISOString().slice(0, 10) === iso) return iso
  }
  problems.push(`${label}: data "${s}" non valida, usa gg/mm/aaaa.`)
  return null
}

const PURPOSE_ALIASES = {
  valutazione: 'valutazione', prova: 'valutazione',
  misurazione: 'misurazione', misure: 'misurazione', 'set misure': 'misurazione', 'set taglie': 'misurazione', taglie: 'misurazione',
  fiera: 'fiera', evento: 'fiera', 'fiera evento': 'fiera',
  promozione: 'promozione', promo: 'promozione',
}

export function parsePurpose(value) {
  const n = normalize(value)
  return PURPOSE_ALIASES[n] || (PURPOSES.includes(n) ? n : null)
}

const toBool = (v) => v === true || v === 'true' || v === 1 || v === 'si' || v === 'sì'

const toMoney = (v, label, problems) => {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  if (!isFinite(n) || n < 0) { problems.push(`${label}: importo "${v}" non valido.`); return null }
  return Math.round(n * 100) / 100
}

// Ultimo costo/prezzo usato per lo stesso capo in un invio precedente
// (stesso codice, o stessa descrizione se il codice manca). history è
// già ordinata dal più recente.
export function lastKnown(history, row, field) {
  const sp = compact(row.sp)
  const desc = normalize(row.description)
  const h = (history || []).find(x => (parseFloat(x[field]) || 0) > 0
    && ((sp && compact(x.sp) === sp) || (!sp && desc && normalize(x.description) === desc)))
  return h ? { value: parseFloat(h[field]), date: h.shipped_date || null } : null
}

// ─── Anteprima ───────────────────────────────────────────────────

// args: quello che arriva dal tool. recipient: il destinatario già letto
// dal database. Restituisce l'invio e le righe pronti per
// create_sample_shipment, oppure lancia UserError con tutti i problemi
// trovati insieme (non uno alla volta).
export function buildShipment(args, { recipient, today, history = [] }) {
  const problems = []
  const warnings = []
  const a = args || {}

  const purpose = parsePurpose(a.tipo)
  if (!a.tipo) problems.push(`Manca il tipo di invio: ${PURPOSES.map(p => `${p} (${PURPOSE_LABELS[p]})`).join(', ')}.`)
  else if (!purpose) problems.push(`Tipo "${a.tipo}" non riconosciuto: usa ${PURPOSES.join(', ')}.`)

  const shipped = parseDate(a.data_invio, 'Data invio', problems) || today
  const delivery = parseDate(a.data_consegna, 'Data consegna', problems)
  const followUp = parseDate(a.data_follow_up, 'Data follow-up', problems)
  const dueGiven = parseDate(a.scadenza_reso, 'Scadenza reso', problems)

  const omaggio = toBool(a.omaggio)
  const askedReturn = toBool(a.reso_richiesto)
  if (omaggio && askedReturn) problems.push('Omaggio e reso richiesto si escludono: la merce regalata non rientra.')

  // Stesse regole del modulo dell'app (SampleModal): i set misure
  // rientrano sempre, entro 30 giorni se non indicato; l'omaggio mai.
  const returnRequired = !omaggio && (alwaysReturned(purpose) || askedReturn)
  const returnDue = returnRequired
    ? (dueGiven || (alwaysReturned(purpose) ? addDaysISO(shipped, 30) : null))
    : null
  if (!returnRequired && dueGiven) warnings.push('Scadenza reso ignorata: per questo invio il reso non è richiesto.')

  const rows = Array.isArray(a.righe) ? a.righe : []
  if (!rows.length) problems.push('Nessun articolo: indica almeno una riga con descrizione e taglie o quantità.')
  if (rows.length > MAX_ROWS) problems.push(`Troppe righe (${rows.length}): massimo ${MAX_ROWS} per invio.`)

  const items = rows.slice(0, MAX_ROWS).map((r, i) => {
    r = r || {}
    const where = `Riga ${i + 1}${r.descrizione ? ` (${r.descrizione})` : ''}`
    let description = String(r.descrizione || '').trim()
    let sp = null
    let category = null

    if (r.codice) {
      const p = findCatalogByCode(r.codice)
      if (!p) {
        let similar = []
        try { similar = searchArticles(r.codice).slice(0, 5).map(x => x.codice) } catch { /* codice illeggibile */ }
        problems.push(`${where}: codice "${r.codice}" non in catalogo${similar.length ? ` (simili: ${similar.join(', ')})` : ''}.`)
      } else {
        sp = p.code
        category = p.category
        if (!description) description = p.description
      }
    }
    if (!description && !r.codice) problems.push(`${where}: manca la descrizione del capo.`)

    if (r.categoria) {
      const c = CATEGORIES.find(x => normalize(x) === normalize(r.categoria))
      if (c) category = c
      else problems.push(`${where}: categoria "${r.categoria}" non esiste in app (${CATEGORIES.join(', ')}).`)
    }
    if (!category) category = inferCategory(description)

    const { sizes, invalid } = parseSizes(r.taglie)
    if (invalid.length) problems.push(`${where}: taglie non riconosciute ${invalid.map(x => `"${x}"`).join(', ')}. Valide: ${SIZE_ORDER.join(', ')}.`)

    // Nel set misure si manda un pezzo per taglia: il numero scritto in
    // chat è il totale e serve da controllo. Se non torna, si chiede.
    let quantity = null
    const qRaw = r.quantita
    if (qRaw === undefined || qRaw === null || qRaw === '') {
      if (sizes.length) {
        quantity = sizes.length
        warnings.push(`${where}: quantità non indicata, assunto 1 pezzo per taglia (${quantity}).`)
      } else if (!invalid.length) {
        problems.push(`${where}: indica le taglie o la quantità.`)
      }
    } else {
      const q = Number(qRaw)
      if (!Number.isInteger(q) || q <= 0) problems.push(`${where}: quantità "${qRaw}" non valida, deve essere un numero intero maggiore di zero.`)
      else if (q > MAX_QTY) problems.push(`${where}: quantità ${q} fuori scala (massimo ${MAX_QTY}).`)
      else if (sizes.length && q !== sizes.length && !toBool(r.quantita_confermata)) {
        problems.push(`${where}: ${q} pezzi ma ${sizes.length} taglie (${sizes.join(', ')}). Chiedi se è giusto; se sì, ripeti con quantita_confermata: true.`)
      } else quantity = q
    }

    const item = {
      sp,
      description: description || null,
      category,
      color: r.colore ? String(r.colore).trim() : null,
      size: sizes.length ? sizes.join(', ') : null,
      quantity,
      unit_cost: toMoney(r.costo_unitario, `${where}, costo`, problems),
      unit_price: toMoney(r.prezzo_unitario, `${where}, prezzo`, problems),
    }
    const notes = []
    if (item.unit_cost === null) {
      const k = lastKnown(history, item, 'unit_cost')
      item.unit_cost = k ? k.value : 0
      notes.push(k ? `costo dall'invio del ${fmtDate(k.date)}` : 'costo non noto (0)')
    }
    if (item.unit_price === null) {
      const k = lastKnown(history, item, 'unit_price')
      item.unit_price = k ? k.value : 0
    }
    return { item, notes }
  })

  if (problems.length) throw new UserError(`Anteprima non generata. Da sistemare:\n- ${problems.join('\n- ')}`)

  const isClient = recipient.kind === 'cliente'
  const shipment = {
    client_id: isClient ? recipient.id : null,
    prospect_id: isClient ? null : recipient.id,
    recipient_name: recipient.name,
    // Come nell'app: il referente del prospect si propone da solo.
    contact_name: (a.referente ? String(a.referente).trim() : '') || (!isClient && recipient.contact_name) || null,
    shipped_date: shipped,
    delivery_date: delivery,
    purpose,
    return_required: returnRequired,
    return_due_date: returnDue,
    carrier: a.corriere ? String(a.corriere).trim() : null,
    tracking: a.tracking ? String(a.tracking).trim() : null,
    shipping_cost: toMoney(a.costo_spedizione, 'Costo spedizione', problems) || 0,
    follow_up_date: followUp,
    notes: a.note ? String(a.note).trim() : null,
    omaggio,
  }
  if (problems.length) throw new UserError(`Anteprima non generata. Da sistemare:\n- ${problems.join('\n- ')}`)

  return { shipment, items: items.map(x => x.item), rowNotes: items.map(x => x.notes), warnings }
}

// Data del follow-up su Todoist: quella scritta, oppure 10 giorni dalla
// consegna (o dall'invio), come syncFollowUpToTodoist nell'app.
export const followUpDue = (sh) => sh.follow_up_date || addDaysISO(followUpBaseDate(sh), FOLLOW_UP_DAYS)

// ─── Testi per la chat ───────────────────────────────────────────

const money = (v) => euro(v, 2)
const pieces = (items) => items.reduce((n, it) => n + (parseInt(it.quantity) || 0), 0)
const costValue = (items) => items.reduce((v, it) => v + (parseInt(it.quantity) || 0) * (parseFloat(it.unit_cost) || 0), 0)

function returnLine(sh) {
  if (sh.omaggio) return 'nessuno (omaggio, la merce resta al destinatario)'
  if (!sh.return_required) return 'non richiesto (campioni a fondo perduto)'
  if (sh.returned_date) return `rientrato il ${fmtDate(sh.returned_date)}`
  return sh.return_due_date ? `obbligatorio entro il ${fmtDate(sh.return_due_date)}` : 'obbligatorio, senza scadenza'
}

function itemLine(it, i, extra = []) {
  const head = [it.description, it.sp ? `[${it.sp}]` : null].filter(Boolean).join(' ')
  const parts = [
    it.category || 'senza categoria',
    it.color ? `colore ${it.color}` : null,
    it.size ? `taglie ${it.size}` : null,
    `${it.quantity} pz`,
    `costo ${money(it.unit_cost)}/pz`,
    ...extra,
  ].filter(Boolean)
  return `${i + 1}. ${head} — ${parts.join(' · ')}`
}

export function previewText({ shipment, items, rowNotes = [], warnings = [] }, recipient) {
  const lines = [
    `ANTEPRIMA INVIO CAMPIONI (non ancora salvato)`,
    `Destinatario: ${shipment.recipient_name} (${recipient.kind}${recipient.city ? `, ${recipient.city}` : ''})${shipment.contact_name ? ` — referente ${shipment.contact_name}` : ''}`,
    `Motivo: ${PURPOSE_LABELS[shipment.purpose]}${shipment.omaggio ? ' · omaggio' : ''}`,
    `Data invio: ${fmtDate(shipment.shipped_date)}${shipment.delivery_date ? ` · consegna ${fmtDate(shipment.delivery_date)}` : ''}`,
    `Reso: ${returnLine(shipment)}`,
    `Follow-up: ${fmtDate(followUpDue(shipment))}${shipment.follow_up_date ? '' : ` (${FOLLOW_UP_DAYS} giorni dopo ${shipment.delivery_date ? 'la consegna' : "l'invio"})`}`,
  ]
  if (shipment.carrier || shipment.tracking) lines.push(`Spedizione: ${[shipment.carrier, shipment.tracking].filter(Boolean).join(' · ')}`)
  if (shipment.shipping_cost) lines.push(`Costo spedizione: ${money(shipment.shipping_cost)}`)
  lines.push('Articoli:')
  items.forEach((it, i) => lines.push(`  ${itemLine(it, i, rowNotes[i] || [])}`))
  lines.push(`Totale: ${pieces(items)} pezzi · valore a costo ${money(costValue(items))}`)
  if (shipment.notes) lines.push(`Note: ${shipment.notes}`)
  if (warnings.length) lines.push('Da far notare:', ...warnings.map(w => `  - ${w}`))
  return lines.join('\n')
}

export function shipmentText(sh) {
  const items = sh.items || []
  const kind = sh.client_id ? 'cliente' : sh.prospect_id ? 'prospect' : 'non in archivio'
  const lines = [
    `Invio campioni ${sh.id}`,
    `Destinatario: ${sh.recipient_name} (${kind})${sh.contact_name ? ` — referente ${sh.contact_name}` : ''}`,
    `Motivo: ${PURPOSE_LABELS[sh.purpose] || sh.purpose}${sh.omaggio ? ' · omaggio' : ''}`,
    `Data invio: ${fmtDate(sh.shipped_date)}${sh.delivery_date ? ` · consegna ${fmtDate(sh.delivery_date)}` : ''}`,
    `Reso: ${returnLine(sh)}`,
    `Origine: ${sh.source === 'claude-mcp' ? 'creato da chat (connettore)' : "inserito dall'app"}`,
    'Articoli:',
    ...items.map((it, i) => `  ${itemLine(it, i, [`esito ${OUTCOME_LABELS[it.outcome || 'in_attesa'] || it.outcome}`, it.returned ? 'rientrato' : null])}`),
    `Totale: ${pieces(items)} pezzi · valore a costo ${money(costValue(items))}`,
  ]
  if (sh.notes) lines.push(`Note: ${sh.notes}`)
  return lines.join('\n')
}

// ─── Codice di conferma ──────────────────────────────────────────
// Contiene l'invio esatto mostrato in anteprima, firmato: chi conferma
// non può cambiarne una virgola senza invalidarlo, e scade in 15 minuti.
// Non serve salvarlo da nessuna parte prima della conferma.

export function signToken(payload, key) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', key).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyToken(token, key, now = Date.now()) {
  const bad = new UserError("Codice di conferma non valido o alterato: rifai l'anteprima.")
  if (typeof token !== 'string') throw bad
  const parts = token.trim().split('.')
  if (parts.length !== 2) throw bad
  const [body, sig] = parts
  const expected = createHmac('sha256', key).update(body).digest()
  const given = Buffer.from(sig, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw bad
  let payload
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) } catch { throw bad }
  if (!payload || typeof payload.exp !== 'number' || !payload.shipment || !Array.isArray(payload.items)) throw bad
  if (now > payload.exp) throw new UserError("Codice di conferma scaduto (vale 15 minuti): rifai l'anteprima e conferma di nuovo.")
  return payload
}

export const tokenHash = (token) => createHash('sha256').update(String(token).trim()).digest('hex')
