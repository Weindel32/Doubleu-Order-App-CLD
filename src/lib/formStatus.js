import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'

// Stato del modulo taglie letto in parole, e pezzi inseriti: funzioni pure,
// senza Supabase né browser, condivise tra l'app (via orderForms.js) e il
// connettore MCP (api/), così le due letture non possono divergere.

export const FORM_STATUS_LABEL = {
  aperto: 'In compilazione', inviato: 'Taglie ricevute', applicato: 'Applicato', revocato: 'Revocato',
}

const fmtShort = (iso) => new Date(iso).toLocaleString('it-IT', {
  timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
})

// Ultimo invio del link al cliente, per esteso: "WhatsApp il 19/10, 16:38".
export function lastSendText(form) {
  const e = form?.sent_log?.[form.sent_log.length - 1]
  if (!e) return ''
  const via = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'email', posta: 'email', condivisione: 'condivisione' }[e.channel] || e.channel
  return `${via} il ${fmtShort(e.at)}`
}

// Le aperture del link si registrano dal 21/10/2026: prima di allora
// «mai aperto» non si puo' sapere.
const OPEN_TRACKING_SINCE = '2026-10-21T00:00:00Z'
const FORM_STALE_DAYS = 3

const daysAgo = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
const whenText = (iso) => {
  const d = daysAgo(iso)
  const hm = new Date(iso).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' })
  return d === 0 ? `oggi alle ${hm}` : d === 1 ? `ieri alle ${hm}` : `il ${fmtShort(iso).split(',')[0]}`
}

// Cosa sta facendo il cliente con un modulo mandato e non ancora inviato:
// mai aperto, aperto senza scrivere, in compilazione, fermo.
//   kind: unknown | unopened | opened | filling | stale
export function formActivity(form) {
  if (!form || form.status !== 'aperto') return null
  const pieces = formPieces(form.lines || [], form.sizes || {})
  const expected = (form.lines || []).reduce((t, l) => t + (l.expected || 0), 0)
  const of = expected ? ` su ${expected} previsti` : ''
  const edited = form.updated_at && new Date(form.updated_at) - new Date(form.created_at) > 2000
  if (edited) {
    const d = daysAgo(form.updated_at)
    return d >= FORM_STALE_DAYS
      ? { kind: 'stale', pieces, expected, text: `Fermo da ${d} giorni · ${pieces} pezzi inseriti${of}`, when: `ultima modifica ${whenText(form.updated_at)}` }
      : { kind: 'filling', pieces, expected, text: `In compilazione · ${pieces} pezzi inseriti${of}`, when: `ultima modifica ${whenText(form.updated_at)}` }
  }
  if (form.last_opened_at) {
    return { kind: 'opened', pieces, expected, text: 'Aperto, nessuna modifica ancora',
      when: `${form.open_count > 1 ? `${form.open_count} aperture · ultima` : 'aperto'} ${whenText(form.last_opened_at)}` }
  }
  const sent = form.sent_log?.[form.sent_log.length - 1]?.at || form.created_at
  if (sent < OPEN_TRACKING_SINCE) return { kind: 'unknown', pieces, expected, text: 'Nessuna modifica del cliente', when: 'aperture registrate dal 21/10' }
  return { kind: 'unopened', pieces, expected, text: 'Non ancora aperto', when: `inviato ${whenText(sent)}` }
}

// A che punto e' il modulo taglie di un ordine, in parole: la stessa
// lettura per elenco ordini, finestra del modulo e telefono.
//   tone: muted | gold | green | blue | clay
export function formStage(form) {
  if (!form || form.status === 'revocato') {
    return { key: 'none', tone: 'muted', badge: 'Invia taglie', text: 'Manda al cliente il link per compilare le taglie' }
  }
  if (form.change_request) {
    const r = form.change_request
    return { key: 'request', tone: 'clay', badge: 'Richiesta cliente', strong: true,
      text: `Richiesta di modifica: “${r.slice(0, 80)}${r.length > 80 ? '…' : ''}”` }
  }
  const pieces = formPieces(form.lines || [], form.sizes || {})
  if (form.status === 'inviato') {
    return { key: 'received', tone: 'green', badge: 'Da applicare', strong: true,
      text: `${pieces} pezzi ${form.applied_at ? 'modificati' : 'ricevuti'}${form.contact_name ? ' da ' + form.contact_name : ''} · da applicare all'ordine` }
  }
  if (form.status === 'applicato') {
    return { key: 'applied', tone: 'blue', badge: 'Applicate ✓', text: `Taglie del cliente applicate all'ordine (${pieces} pezzi)` }
  }
  // aperto
  const sent = lastSendText(form)
  if (form.submitted_at) {
    return { key: 'editing', tone: 'gold', badge: 'In correzione', text: 'Il cliente ha riaperto il modulo per correggere le taglie' }
  }
  if (!sent) {
    return { key: 'created', tone: 'gold', badge: 'Link da inviare', text: 'Link creato, non ancora inviato al cliente' }
  }
  return { key: 'waiting', tone: 'gold', badge: 'Attesa cliente', text: `Inviato via ${sent} · il cliente non ha ancora inviato le taglie` }
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

