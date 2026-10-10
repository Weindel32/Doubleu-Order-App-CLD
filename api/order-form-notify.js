// Avviso su Todoist per il modulo taglie del cliente: progetto "Ordini",
// sezione "Taglie ricevute".
//
//   · action 'submitted' — la chiama la pagina pubblica del cliente subito
//     dopo l'invio, quindi senza sessione. Non si fida di niente di quello
//     che riceve tranne il token: rilegge il modulo da Supabase e crea il
//     task solo se risulta davvero inviato negli ultimi minuti. Un token
//     rubato o un invio vecchio non producono task.
//     Titolo secondo il caso: "Taglie ricevute" al primo invio, "Taglie
//     aggiornate" se il cliente corregge prima che tu applichi, "Modifica
//     taglie" se corregge dopo; in descrizione le variazioni (M +2, L −1).
//   · action 'change_request' — richiesta di modifica a testo dal cliente
//     (ordine gia' in produzione, o articoli da aggiungere): task a parte.
//   · action 'applied' / 'request_done' — le chiama l'app (sessione
//     obbligatoria): taglie applicate o richiesta gestita, il task si chiude.
//
// Il task si ritrova col marcatore order-form:<id ordine> nel link della
// descrizione, come per le campionature: nessuna colonna in piu' nel
// database, e un secondo invio dello stesso ordine aggiorna il task aperto
// invece di crearne un altro.

import { createClient } from '@supabase/supabase-js'
import { requireUser } from './_auth.js'
import { APP_URL, todoistFetch, todoistList, findOrCreateProject, findOrCreateSection } from './_todoist.js'

const SUPABASE_URL = 'https://bixayovstdptbgauvsgm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_pKpjPbw4a0HSEIWbf2ZXvA_svT70I3v'

const PROJECT_NAME = 'Ordini'
const SECTION_NAME = 'Taglie ricevute'
const FRESH_MS = 30 * 60 * 1000

const marker = (orderId) => `order-form:${orderId}`
const reqMarker = (orderId) => `order-form-req:${orderId}`

const ADULT = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const KIDS  = ['4', '6', '8', '10', '12', '14', '16']

// Variazioni rispetto alla versione precedente (o a quella applicata):
// "Hoodie Navy: M +2, L −1; Cap: TU +5". Solo le righe che cambiano.
function formDiff(lines, base, cur) {
  const out = []
  for (const l of lines) {
    const b = base?.[l.key] || {}, c = cur?.[l.key] || {}
    const parts = []
    const push = (label, x, y) => { const d = (y || 0) - (x || 0); if (d) parts.push(`${label} ${d > 0 ? '+' : '−'}${Math.abs(d)}`) }
    if ((l.grids || []).includes('adult')) for (const sz of ADULT) push(sz, b.adult?.[sz], c.adult?.[sz])
    if ((l.grids || []).includes('kids'))  for (const sz of KIDS)  push(`${sz}a`, b.kids?.[sz], c.kids?.[sz])
    if ((l.grids || []).includes('uni'))   push('TU', b.uni, c.uni)
    if (parts.length) out.push(`${plain(l.description || l.category)}${l.color ? ' ' + plain(l.color) : ''}: ${parts.join(', ')}`)
  }
  return out.join('; ')
}

// Somma di tutti i numeri nel modulo: { l0: { adult: { M: 3 } }, l1: { uni: 2 } } → 5
const sumPieces = (v) => typeof v === 'number' ? v
  : v && typeof v === 'object' ? Object.values(v).reduce((t, x) => t + sumPieces(x), 0) : 0

// Il testo della descrizione e' Markdown: nome, nota e marcatore restano
// leggibili ma non possono spezzare il link.
const plain = (s) => String(s || '').replace(/[\[\]()\n\r]/g, ' ').replace(/\s+/g, ' ').trim()

async function sectionTasks(token) {
  const project = await findOrCreateProject(token, PROJECT_NAME)
  const section = await findOrCreateSection(token, project.id, SECTION_NAME)
  const tasks = await todoistList(token, `/tasks?section_id=${section.id}`)
  return { project, section, tasks }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const { action, token: formToken, orderId } = req.body || {}
  if (action === 'applied' || action === 'request_done') {
    const user = await requireUser(req, res)
    if (!user) return
  }

  const token = process.env.TODOIST_API_TOKEN
  if (!token) {
    console.error('order-form-notify: TODOIST_API_TOKEN mancante')
    return res.status(500).json({ error: 'Configurazione mancante lato server' })
  }

  try {
    // Chiusure dall'app: taglie applicate, oppure richiesta gestita.
    if (action === 'applied' || action === 'request_done') {
      if (!orderId) return res.status(400).json({ error: 'orderId mancante' })
      const tag = action === 'applied' ? marker(orderId) : reqMarker(orderId)
      const { tasks } = await sectionTasks(token)
      const open = tasks.filter(t => (t.description || '').includes(`${tag})`))
      for (const t of open) await todoistFetch(token, `/tasks/${t.id}/close`, { method: 'POST' })
      return res.status(200).json({ action: open.length ? 'closed' : 'noop' })
    }

    if (action !== 'submitted' && action !== 'change_request') return res.status(400).json({ error: 'Azione non valida' })
    if (typeof formToken !== 'string' || !/^[A-Za-z0-9]{20,64}$/.test(formToken)) {
      return res.status(400).json({ error: 'Token non valido' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    const { data: form, error } = await supabase.rpc('order_form_get', { p_token: formToken })
    if (error) throw new Error(`Supabase: ${error.message}`)
    if (!form) return res.status(200).json({ action: 'noop' })
    const club = plain(form.client_name) || form.order_id

    let tag, content, description
    if (action === 'change_request') {
      const at = form.change_requested_at ? new Date(form.change_requested_at).getTime() : 0
      if (!form.change_request || Date.now() - at > FRESH_MS) return res.status(200).json({ action: 'noop' })
      tag = reqMarker(form.order_id)
      content = `Richiesta modifica${form.locked ? ' (in produzione)' : ''} · ${club}`
      description = `[${form.order_id} — ${plain(form.change_request).slice(0, 400)}](${APP_URL}/#${tag})`
    } else {
      const submittedAt = form.submitted_at ? new Date(form.submitted_at).getTime() : 0
      if (form.status !== 'inviato' || Date.now() - submittedAt > FRESH_MS) return res.status(200).json({ action: 'noop' })
      tag = marker(form.order_id)
      const kind = form.applied ? 'Modifica taglie' : form.submit_count > 1 ? 'Taglie aggiornate' : 'Taglie ricevute'
      content = `${kind} · ${club}`
      const pieces = sumPieces(form.sizes)
      const who = form.contact_name ? ` · da ${plain(form.contact_name)}` : ''
      const changes = form.baseline_sizes ? formDiff(form.lines || [], form.baseline_sizes, form.sizes) : ''
      const note = form.client_note ? ` · nota: ${plain(form.client_note).slice(0, 200)}` : ''
      const what = changes ? ` · variazioni: ${changes}` : ''
      description = `[${form.order_id} · ${pieces} pezzi${who}${what}${note} — da applicare](${APP_URL}/#${tag})`.slice(0, 1500)
    }

    const { project, section, tasks } = await sectionTasks(token)
    const existing = tasks.find(t => (t.description || '').includes(`${tag})`))
    const body = { content, description, due_string: 'today', priority: 4 }

    if (existing) {
      await todoistFetch(token, `/tasks/${existing.id}`, { method: 'POST', body: JSON.stringify(body) })
      return res.status(200).json({ action: 'updated' })
    }
    await todoistFetch(token, '/tasks', {
      method: 'POST',
      body: JSON.stringify({ project_id: project.id, section_id: section.id, ...body }),
    })
    return res.status(200).json({ action: 'created' })
  } catch (err) {
    console.error('order-form-notify: errore imprevisto', err)
    return res.status(500).json({
      error: 'Errore imprevisto nella notifica Todoist',
      detail: String(err && err.message || err).slice(0, 300),
    })
  }
}
