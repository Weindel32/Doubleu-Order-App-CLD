import { supabase, authHeader } from './supabase.js'
import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { artPieceCount } from '../utils/helpers.js'

// Modulo taglie per il cliente.
//
// Il cliente riceve un link /taglie/<token> e compila solo le taglie degli
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

// Dominio dei link al cliente: VITE_FORM_ORIGIN (es. https://ordini.doubleutennis.com,
// impostato su Vercel solo per Production) invece dell'indirizzo tecnico
// *.vercel.app. Senza, si usa il dominio da cui si sta usando l'app: e' il
// caso delle preview, dove il link deve puntare alla preview stessa.
const FORM_ORIGIN = (import.meta.env.VITE_FORM_ORIGIN || '').replace(/\/+$/, '')
export const formUrl = (token) => `${FORM_ORIGIN || window.location.origin}/taglie/${token}`

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

// Differenze di una riga tra due versioni delle taglie: "M +2 · L −1 · 8 anni +3".
// Vuoto se non cambia nulla.
export function lineDiff(line, base, cur) {
  const b = base?.[line.key] || {}, c = cur?.[line.key] || {}
  const parts = []
  const push = (label, before, after) => {
    const d = (parseInt(after) || 0) - (parseInt(before) || 0)
    if (d) parts.push(`${label} ${d > 0 ? '+' : '−'}${Math.abs(d)}`)
  }
  if (line.grids.includes('adult')) for (const sz of ADULT_SIZES) push(sz, b.adult?.[sz], c.adult?.[sz])
  if (line.grids.includes('kids'))  for (const sz of KIDS_SIZES)  push(`${sz} anni`, b.kids?.[sz], c.kids?.[sz])
  if (line.grids.includes('uni'))   push('TU', b.uni, c.uni)
  return parts.join(' · ')
}

// Stati ordine in cui il modulo e' bloccato (stessa regola del database,
// order_form_is_locked): da li' in poi il cliente puo' solo chiedere.
export const LOCKING_STATUSES = ['IN PRODUZIONE', 'CONSEGNA PARZIALE', 'CONSEGNATO', 'ANNULLATO']
export const formLocked = (form, order) => !!form?.locked || LOCKING_STATUSES.includes(order?.status)

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

// Prima di passare un ordine a uno stato che blocca il modulo (produzione,
// consegna): se il cliente ha taglie in sospeso, l'app lo dice e chiede
// conferma. Restituisce le opzioni per askConfirm (ConfirmDialog), o null
// se non c'e' nulla in sospeso. Un errore di lettura non blocca il cambio di stato.
export async function pendingFormWarning(orderId, newStatus, oldStatus) {
  const blocking = ['IN PRODUZIONE', 'CONSEGNA PARZIALE', 'CONSEGNATO']
  if (!blocking.includes(newStatus) || LOCKING_STATUSES.includes(oldStatus)) return null
  const form = await fetchOrderFormFor(orderId)
  if (!form) return null
  let what = null
  if (form.status === 'inviato') {
    what = `Il cliente ha inviato taglie (${formPieces(form.lines, form.sizes)} pezzi) non ancora applicate all'ordine.`
  } else if (form.status === 'aperto' && (form.submit_count > 0 || form.applied_at)) {
    what = 'Il cliente ha riaperto il modulo per correggere le taglie e non ha ancora reinviato.'
  } else if (form.status === 'aperto') {
    what = 'Il cliente non ha ancora compilato il modulo taglie.'
  }
  if (!what) return null
  return {
    title: { 'IN PRODUZIONE': 'Mandare in produzione?', 'CONSEGNA PARZIALE': 'Segnare come consegna parziale?', 'CONSEGNATO': 'Segnare come consegnato?' }[newStatus],
    body: [what, `Il modulo del cliente si blocca e in produzione vanno le taglie attuali dell'ordine.`],
    warning: form.status === 'inviato' ? 'Conviene prima aprire Taglie e premere «Applica all\'ordine».' : null,
    confirmLabel: 'Procedi comunque', tone: 'danger',
  }
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

export async function setOrderFormStatus(token, status, extra = {}) {
  const patch = { status, updated_at: new Date().toISOString(), ...extra }
  if (status === 'applicato') patch.applied_at = patch.updated_at
  return patchOrderForm(token, patch)
}

export async function patchOrderForm(token, patch) {
  const { data, error } = await supabase.from('order_forms')
    .update({ updated_at: new Date().toISOString(), ...patch }).eq('token', token).select().single()
  if (error) { console.error('patchOrderForm:', error); return null }
  return data
}

// Richiesta di modifica gestita: chiude il suo task Todoist.
export async function notifyRequestDone(orderId) {
  try {
    await fetch('/api/order-form-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ action: 'request_done', orderId }),
    })
  } catch (e) { console.error('notifyRequestDone:', e) }
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

const notify = (action, token) => fetch('/api/order-form-notify', {
  method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action, token }),
}).catch(() => {})

export async function reopenPublicForm(token) {
  const { data, error } = await supabase.rpc('order_form_reopen', { p_token: token })
  if (error) return { error: error.message || 'errore' }
  return { form: data }
}

export async function requestPublicChange(token, text) {
  const { data, error } = await supabase.rpc('order_form_request_change', { p_token: token, p_text: text })
  if (error) return { error: error.message || 'errore' }
  notify('change_request', token)
  return { form: data }
}

export async function savePublicForm(token, { sizes, contact, note, submit = false }) {
  const { data, error } = await supabase.rpc('order_form_save', {
    p_token: token, p_sizes: sizes, p_contact: contact || '', p_note: note || '', p_submit: submit,
  })
  if (error) return { error: error.message || 'errore' }
  // Invio riuscito: avviso su Todoist. keepalive perche' parta anche se il
  // cliente chiude subito la pagina; un errore qui non riguarda il cliente.
  if (submit) notify('submitted', token)
  return { form: data }
}
