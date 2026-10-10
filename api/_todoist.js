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
