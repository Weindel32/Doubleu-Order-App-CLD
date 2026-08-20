// Tiene allineato un task su Todoist con lo stato di follow-up di un
// invio campioni di Order App: progetto "Campionature", sezione
// "Follow up". Funzione serverless separata dal resto dell'app: il
// token Todoist resta solo qui, lato server, mai esposto al browser.
//
// Il task viene ritrovato tramite un marcatore [order-app:<id>] scritto
// nella sua descrizione, non tramite un id esterno salvato nel database
// di Order App: nessuna modifica di schema, sincronizzazione opportunista.
// Nota: GET /tasks di Todoist restituisce solo i task attivi, quindi se
// un follow-up viene chiuso e poi torna aperto (esito rimesso "in
// attesa") viene creato un nuovo task invece di riaprire quello vecchio.

// API unificata v1: le REST v2 rispondono 410 (dismesse).
const TODOIST_API = 'https://api.todoist.com/api/v1'
const PROJECT_NAME = 'Campionature'
const SECTION_NAME = 'Follow up'

const marker = (shipmentId) => `[order-app:${shipmentId}]`

async function todoistFetch(token, path, options = {}) {
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
    throw new Error(`Todoist ${options.method || 'GET'} ${path} → ${res.status} ${detail}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// Le liste di v1 sono paginate e arrivano come { results, next_cursor }:
// fermarsi alla prima pagina significherebbe non trovare un progetto (o
// un task) più in là nell'elenco e ricrearlo a ogni salvataggio. Il caso
// dell'array nudo resta gestito per non dipendere dalla forma esatta
// della risposta.
async function todoistList(token, path) {
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

async function findOrCreateProject(token) {
  const projects = await todoistList(token, '/projects')
  const existing = projects.find(p => p.name === PROJECT_NAME)
  if (existing) return existing
  return todoistFetch(token, '/projects', { method: 'POST', body: JSON.stringify({ name: PROJECT_NAME }) })
}

async function findOrCreateSection(token, projectId) {
  const sections = await todoistList(token, `/sections?project_id=${projectId}`)
  const existing = sections.find(s => s.name === SECTION_NAME)
  if (existing) return existing
  return todoistFetch(token, '/sections', { method: 'POST', body: JSON.stringify({ project_id: projectId, name: SECTION_NAME }) })
}

async function findTask(token, sectionId, shipmentId) {
  const tasks = await todoistList(token, `/tasks?section_id=${sectionId}`)
  const tag = marker(shipmentId)
  return tasks.find(t => (t.description || '').includes(tag)) || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const token = process.env.TODOIST_API_TOKEN
  if (!token) {
    console.error('sync-todoist-followup: TODOIST_API_TOKEN mancante')
    return res.status(500).json({ error: 'Configurazione mancante lato server' })
  }

  const { shipmentId, clubName, open, dueDate, purpose } = req.body || {}
  if (!shipmentId) return res.status(400).json({ error: 'shipmentId mancante' })

  try {
    const project = await findOrCreateProject(token)
    const section = await findOrCreateSection(token, project.id)
    const existing = await findTask(token, section.id, shipmentId)

    if (!open) {
      if (existing) {
        await todoistFetch(token, `/tasks/${existing.id}/close`, { method: 'POST' })
        return res.status(200).json({ action: 'closed' })
      }
      return res.status(200).json({ action: 'noop' })
    }

    const content = (clubName || 'Campionatura').trim() || 'Campionatura'
    const description = `${marker(shipmentId)}${purpose ? ' · ' + purpose : ''}`
    const body = { content, description, ...(dueDate ? { due_date: dueDate } : {}) }

    if (existing) {
      await todoistFetch(token, `/tasks/${existing.id}`, { method: 'POST', body: JSON.stringify(body) })
      return res.status(200).json({ action: 'updated', taskId: existing.id })
    }

    const created = await todoistFetch(token, '/tasks', {
      method: 'POST',
      body: JSON.stringify({ project_id: project.id, section_id: section.id, ...body }),
    })
    return res.status(200).json({ action: 'created', taskId: created.id })
  } catch (err) {
    console.error('sync-todoist-followup: errore imprevisto', err)
    // Il dettaglio (metodo, path e risposta di Todoist) torna anche al
    // browser: senza, una sincronizzazione che fallisce è diagnosticabile
    // solo dai log del server. Il token sta negli header, mai nel
    // messaggio, quindi non esce nulla di riservato.
    return res.status(500).json({
      error: 'Errore imprevisto nella sincronizzazione Todoist',
      detail: String(err && err.message || err).slice(0, 300),
    })
  }
}
