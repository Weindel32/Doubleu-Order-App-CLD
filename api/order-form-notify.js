// Avviso su Todoist per il modulo taglie del cliente: progetto "Ordini",
// sezione "Taglie ricevute".
//
//   · action 'submitted' — la chiama la pagina pubblica del cliente subito
//     dopo l'invio, quindi senza sessione. Non si fida di niente di quello
//     che riceve tranne il token: rilegge il modulo da Supabase e crea il
//     task solo se risulta davvero inviato negli ultimi minuti. Un token
//     rubato o un invio vecchio non producono task.
//   · action 'applied' — la chiama l'app (sessione obbligatoria) quando le
//     taglie vengono applicate all'ordine: il task si chiude da solo.
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
  if (action === 'applied') {
    const user = await requireUser(req, res)
    if (!user) return
  }

  const token = process.env.TODOIST_API_TOKEN
  if (!token) {
    console.error('order-form-notify: TODOIST_API_TOKEN mancante')
    return res.status(500).json({ error: 'Configurazione mancante lato server' })
  }

  try {
    if (action === 'applied') {
      if (!orderId) return res.status(400).json({ error: 'orderId mancante' })
      const { tasks } = await sectionTasks(token)
      const open = tasks.filter(t => (t.description || '').includes(`${marker(orderId)})`))
      for (const t of open) await todoistFetch(token, `/tasks/${t.id}/close`, { method: 'POST' })
      return res.status(200).json({ action: open.length ? 'closed' : 'noop' })
    }

    if (action !== 'submitted') return res.status(400).json({ error: 'Azione non valida' })
    if (typeof formToken !== 'string' || !/^[A-Za-z0-9]{20,64}$/.test(formToken)) {
      return res.status(400).json({ error: 'Token non valido' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    const { data: form, error } = await supabase.rpc('order_form_get', { p_token: formToken })
    if (error) throw new Error(`Supabase: ${error.message}`)
    const submittedAt = form?.submitted_at ? new Date(form.submitted_at).getTime() : 0
    if (!form || form.status !== 'inviato' || Date.now() - submittedAt > FRESH_MS) {
      return res.status(200).json({ action: 'noop' })
    }

    const pieces = sumPieces(form.sizes)
    const who = form.contact_name ? ` · da ${plain(form.contact_name)}` : ''
    const note = form.client_note ? ` · nota: ${plain(form.client_note).slice(0, 200)}` : ''
    const content = `Taglie ricevute · ${plain(form.client_name) || form.order_id}`
    const description = `[${form.order_id} · ${pieces} pezzi${who}${note} — da applicare](${APP_URL}/#${marker(form.order_id)})`

    const { project, section, tasks } = await sectionTasks(token)
    const existing = tasks.find(t => (t.description || '').includes(`${marker(form.order_id)})`))
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
