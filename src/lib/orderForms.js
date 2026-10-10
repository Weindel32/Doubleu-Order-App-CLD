import { supabase, authHeader } from './supabase.js'
import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { artPieceCount } from '../utils/helpers.js'

// Modulo taglie per il cliente.
//
// Il cliente riceve un link /m/<token> e compila solo le taglie degli
// articoli dell'ordine. Il modulo conserva una fotografia delle righe al
// momento della creazione (lines): il cliente vede sempre quella, anche se
// nel frattempo l'ordine viene modificato. Le taglie inviate restano nel
// modulo finche' non le applichi all'ordine: niente arriva in produzione
// senza un tuo controllo.
//
// Il cliente non ha sessione: legge e scrive solo tramite le funzioni
// order_form_get / order_form_save (vedi SEED_DATA.sql), che lavorano sul
// singolo token e scartano righe o taglie non previste.

export const GRID_LABEL = { adult: 'Adulto', kids: 'Bambino', uni: 'Taglia unica' }
export const GRIDS = ['adult', 'kids', 'uni']

export const FORM_STATUS_LABEL = {
  aperto: 'In compilazione', inviato: 'Taglie ricevute', applicato: 'Applicato', revocato: 'Revocato',
}

// 24 caratteri base62 da crypto: ~143 bit, non si indovina e non si
// ricava dal codice ordine.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
export function newToken(len = 24) {
  const out = []
  while (out.length < len) {
    const bytes = crypto.getRandomValues(new Uint8Array(len * 2))
    // 248 = 62*4: si scartano i byte oltre, per non sbilanciare i caratteri.
    for (const b of bytes) if (b < 248 && out.length < len) out.push(ALPHABET[b % 62])
  }
  return out.join('')
}

export const formUrl = (token) => `${window.location.origin}/m/${token}`

const hasAny = (obj) => Object.values(obj || {}).some(v => (parseInt(v) || 0) > 0)

// Griglie proposte per un articolo: quelle gia' usate, altrimenti taglia
// unica per i cappellini e adulto per tutto il resto. Si cambiano nel
// modulo di creazione.
export function defaultGrids(art) {
  const g = []
  if (hasAny(art.sizes?.adult)) g.push('adult')
  if (hasAny(art.sizes?.kids)) g.push('kids')
  if ((art.sizes?.uni || 0) > 0) g.push('uni')
  if (g.length) return g
  return /^cap/i.test(art.category || '') ? ['uni'] : ['adult']
}

// Pezzi attesi per riga, se l'ordine li dice: in un ordine a kit ogni
// articolo va per il numero di kit; altrimenti la quantita' stimata.
function expectedPieces(order, kit, art) {
  if (order.pricingMode === 'kit') return parseInt(kit.quantity) || parseInt(order.kitQuantity) || null
  return parseInt(art.estimatedQty) || null
}

const emptyGrid = (sizes) => Object.fromEntries(sizes.map(sz => [sz, 0]))

export function sizesForGrids(grids, from) {
  const out = {}
  if (grids.includes('adult')) out.adult = { ...emptyGrid(ADULT_SIZES), ...pickSizes(from?.adult, ADULT_SIZES) }
  if (grids.includes('kids'))  out.kids  = { ...emptyGrid(KIDS_SIZES),  ...pickSizes(from?.kids,  KIDS_SIZES) }
  if (grids.includes('uni'))   out.uni   = parseInt(from?.uni) || 0
  return out
}

function pickSizes(obj, sizes) {
  const out = {}
  for (const sz of sizes) if (obj && obj[sz] != null) out[sz] = parseInt(obj[sz]) || 0
  return out
}

// Righe del modulo dall'ordine. choices: { [key]: ['adult', ...] }.
export function buildFormLines(order, choices = {}) {
  const lines = []
  ;(order.kits || []).forEach((kit, kitIndex) => {
    (kit.articles || []).forEach((art, articleIndex) => {
      const key = `l${lines.length}`
      lines.push({
        key, kitIndex, articleIndex,
        kit: order.pricingMode === 'kit' ? (kit.name || '') : '',
        sp: art.sp || '', description: art.description || '', color: art.color || '',
        category: art.category || '',
        grids: choices[key] || defaultGrids(art),
        expected: expectedPieces(order, kit, art),
      })
    })
  })
  return lines
}

export function linePieces(line, sizes) {
  const s = sizes?.[line.key] || {}
  let n = 0
  if (line.grids.includes('adult')) n += ADULT_SIZES.reduce((t, sz) => t + (parseInt(s.adult?.[sz]) || 0), 0)
  if (line.grids.includes('kids'))  n += KIDS_SIZES.reduce((t, sz)  => t + (parseInt(s.kids?.[sz])  || 0), 0)
  if (line.grids.includes('uni'))   n += parseInt(s.uni) || 0
  return n
}

export const formPieces = (lines, sizes) => lines.reduce((t, l) => t + linePieces(l, sizes), 0)

// ── Lato app (sessione autenticata) ─────────────────────────────────

export async function fetchOrderForms() {
  const { data, error } = await supabase
    .from('order_forms').select('*').neq('status', 'revocato').order('created_at', { ascending: false })
  if (error) { console.error('fetchOrderForms:', error); return null }
  return data
}

export async function createOrderForm(order, lines, { prefill = false, expiresAt = null } = {}) {
  const articles = (order.kits || []).map(k => k.articles || [])
  const sizes = Object.fromEntries(lines.map(l => [
    l.key, sizesForGrids(l.grids, prefill ? articles[l.kitIndex]?.[l.articleIndex]?.sizes : null),
  ]))
  const row = {
    token: newToken(), order_id: order.id, client_name: order.client || '',
    lines, sizes, expires_at: expiresAt,
  }
  const { data, error } = await supabase.from('order_forms').insert(row).select().single()
  if (error) { console.error('createOrderForm:', error); return null }
  return data
}

// Modulo piu' recente di un ordine (escluso il revocato), per il
// dettaglio ordine su mobile.
export async function fetchOrderFormFor(orderId) {
  const { data, error } = await supabase
    .from('order_forms').select('*').eq('order_id', orderId).neq('status', 'revocato')
    .order('created_at', { ascending: false }).limit(1)
  if (error) { console.error('fetchOrderFormFor:', error); return null }
  return data[0] || null
}

// Taglie applicate: chiude il task Todoist "Taglie ricevute" dell'ordine.
// Best-effort: un errore qui non deve toccare l'ordine gia' salvato.
export async function notifyFormApplied(orderId) {
  try {
    await fetch('/api/order-form-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ action: 'applied', orderId }),
    })
  } catch (e) { console.error('notifyFormApplied:', e) }
}

// Email impaginata DOUBLEU via Resend (api/order-form-email.js).
export async function sendFormEmail({ token, to, firstName, copyToMe }) {
  try {
    const res = await fetch('/api/order-form-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ token, to, firstName, copyToMe, url: formUrl(token) }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: [data.error || 'Invio non riuscito', data.detail].filter(Boolean).join(' — ') }
    return { ok: true }
  } catch {
    return { error: 'Invio non riuscito: controlla la connessione' }
  }
}

export async function setOrderFormStatus(token, status) {
  const patch = { status, updated_at: new Date().toISOString() }
  if (status === 'applicato') patch.applied_at = patch.updated_at
  if (status === 'aperto') patch.submitted_at = null
  const { data, error } = await supabase.from('order_forms').update(patch).eq('token', token).select().single()
  if (error) { console.error('setOrderFormStatus:', error); return null }
  return data
}

// Riporta le taglie del modulo sull'ordine. Ogni riga si ritrova per
// codice/descrizione/colore dentro lo stesso kit (gli articoli non hanno
// un id stabile: ogni salvataggio li riscrive), con la posizione come
// ripiego. Le righe che non si ritrovano non toccano nulla e si segnalano.
export function applyFormToOrder(order, form) {
  const fp = (a) => `${a.sp || ''}|${a.description || ''}|${a.color || ''}`.toLowerCase()
  const used = new Set()
  const unmatched = []
  const updates = {}

  for (const line of form.lines || []) {
    const arts = order.kits?.[line.kitIndex]?.articles || []
    let ai = arts.findIndex((a, i) => !used.has(`${line.kitIndex}:${i}`) && fp(a) === fp(line))
    if (ai < 0 && arts[line.articleIndex] && !used.has(`${line.kitIndex}:${line.articleIndex}`)
        && (arts[line.articleIndex].sp || '') === line.sp) ai = line.articleIndex
    if (ai < 0) { unmatched.push(line); continue }
    used.add(`${line.kitIndex}:${ai}`)
    updates[`${line.kitIndex}:${ai}`] = form.sizes?.[line.key] || {}
  }

  const kits = (order.kits || []).map((kit, ki) => ({
    ...kit,
    articles: (kit.articles || []).map((art, ai) => {
      const s = updates[`${ki}:${ai}`]
      if (!s) return art
      return {
        ...art,
        sizes: {
          adult: s.adult ? { ...emptyGrid(ADULT_SIZES), ...pickSizes(s.adult, ADULT_SIZES) } : (art.sizes?.adult || {}),
          kids:  s.kids  ? { ...emptyGrid(KIDS_SIZES),  ...pickSizes(s.kids,  KIDS_SIZES) }  : (art.sizes?.kids  || {}),
          uni:   s.uni != null ? (parseInt(s.uni) || 0) : (art.sizes?.uni || 0),
        },
      }
    }),
  }))
  const pieces = kits.flatMap(k => k.articles).reduce((t, a) => t + artPieceCount(a), 0)
  return { order: { ...order, kits, pieces }, unmatched }
}

// ── Lato cliente (nessuna sessione) ─────────────────────────────────

export async function getPublicForm(token) {
  const { data, error } = await supabase.rpc('order_form_get', { p_token: token })
  if (error) { console.error('getPublicForm:', error); return { error: true } }
  return { form: data }
}

export async function savePublicForm(token, { sizes, contact, note, submit = false }) {
  const { data, error } = await supabase.rpc('order_form_save', {
    p_token: token, p_sizes: sizes, p_contact: contact || '', p_note: note || '', p_submit: submit,
  })
  if (error) return { error: error.message || 'errore' }
  // Invio riuscito: avviso su Todoist. keepalive perche' parta anche se il
  // cliente chiude subito la pagina; un errore qui non riguarda il cliente.
  if (submit) {
    fetch('/api/order-form-notify', {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submitted', token }),
    }).catch(() => {})
  }
  return { form: data }
}
