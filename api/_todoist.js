// Chiamate a Todoist condivise dalle funzioni serverless (follow-up
// campionature, prossimi passi dei prospect). Il token arriva sempre da
// TODOIST_API_TOKEN lato server, mai dal browser.

// API unificata v1: le REST v2 rispondono 410 (dismesse).
const TODOIST_API = 'https://api.todoist.com/api/v1'

// Indirizzo dell'app, usato come contenitore dei marcatori nei task.
export const APP_URL = 'https://ordini.doubleutennis.com'

export async function todoistFetch(token, path, options = {}) {
  const res = await fetch(`${TODOIST_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const err = new Error(`Todoist ${options.method || 'GET'} ${path} → ${res.status} ${detail}`)
    err.status = res.status
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

// Le liste di v1 sono paginate e arrivano come { results, next_cursor }:
// fermarsi alla prima pagina significherebbe non trovare un progetto (o
// un task) più in là nell'elenco e ricrearlo a ogni salvataggio. Il caso
// dell'array nudo resta gestito per non dipendere dalla forma esatta
// della risposta.
export async function todoistList(token, path) {
  const out = []
  let cursor = null
  for (let page = 0; page < 20; page++) {
    const sep = path.includes('?') ? '&' : '?'
    const data = await todoistFetch(token, cursor ? `${path}${sep}cursor=${encodeURIComponent(cursor)}` : path)
    if (Array.isArray(data)) return data
    out.push(...((data && data.results) || []))
    cursor = (data && data.next_cursor) || null
    if (!cursor) break
  }
  return out
}

export async function findOrCreateProject(token, name) {
  const projects = await todoistList(token, '/projects')
  const existing = projects.find(p => p.name === name)
  if (existing) return existing
  return todoistFetch(token, '/projects', { method: 'POST', body: JSON.stringify({ name }) })
}

export async function findOrCreateSection(token, projectId, name) {
  const sections = await todoistList(token, `/sections?project_id=${projectId}`)
  const existing = sections.find(s => s.name === name)
  if (existing) return existing
  return todoistFetch(token, '/sections', { method: 'POST', body: JSON.stringify({ project_id: projectId, name }) })
}

// ─── Follow-up campionature ──────────────────────────────────────
// Un task su Todoist (progetto "Campionature", sezione "Follow up") per
// ogni invio campioni con articoli ancora senza esito. Lo usano sia
// l'app (api/sync-todoist-followup.js) sia il connettore MCP (api/mcp.js),
// così le regole restano una sola.
//
// Il task viene ritrovato tramite un marcatore order-app:<id> scritto
// nella sua descrizione, non tramite un id esterno salvato nel database
// di Order App: nessuna modifica di schema, sincronizzazione opportunista.
// Nota: GET /tasks di Todoist restituisce solo i task attivi, quindi se
// un follow-up viene chiuso e poi torna aperto (esito rimesso "in
// attesa") viene creato un nuovo task invece di riaprire quello vecchio.

const FOLLOWUP_PROJECT = 'Campionature'
const FOLLOWUP_SECTION = 'Follow up'

// Il marcatore non è più racchiuso tra parentesi quadre: così può stare
// dentro un link Markdown senza confondere la sintassi. I task creati
// prima, che scrivevano [order-app:<id>], restano ritrovabili perché la
// ricerca è per sottostringa.
const followUpMarker = (shipmentId) => `order-app:${shipmentId}`

// Todoist rende il Markdown della descrizione: chi legge vede solo il
// motivo dell'invio, mentre l'id — che serve a ritrovare il task ed
// evitare doppioni — resta nell'indirizzo del link.
const followUpDescription = (shipmentId, purpose) =>
  `[${purpose || 'Campionatura'}](${APP_URL}/#${followUpMarker(shipmentId)})`

export async function syncSampleFollowUp(token, { shipmentId, clubName, open, dueDate, purpose }) {
  const project = await findOrCreateProject(token, FOLLOWUP_PROJECT)
  const section = await findOrCreateSection(token, project.id, FOLLOWUP_SECTION)
  const tasks = await todoistList(token, `/tasks?section_id=${section.id}`)
  const existing = tasks.find(t => (t.description || '').includes(followUpMarker(shipmentId))) || null

  if (!open) {
    if (!existing) return { action: 'noop' }
    await todoistFetch(token, `/tasks/${existing.id}/close`, { method: 'POST' })
    return { action: 'closed' }
  }

  const content = (clubName || 'Campionatura').trim() || 'Campionatura'
  const description = followUpDescription(shipmentId, purpose)
  const body = { content, description, ...(dueDate ? { due_date: dueDate } : {}) }

  if (existing) {
    await todoistFetch(token, `/tasks/${existing.id}`, { method: 'POST', body: JSON.stringify(body) })
    return { action: 'updated', taskId: existing.id }
  }

  const created = await todoistFetch(token, '/tasks', {
    method: 'POST',
    body: JSON.stringify({ project_id: project.id, section_id: section.id, ...body }),
  })
  return { action: 'created', taskId: created.id }
}
