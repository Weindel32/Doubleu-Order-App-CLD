// Promemoria Todoist dei prossimi passi sui prospect: ogni attività "da
// fare" di Order App ha il suo task nel progetto "Prospect Follow Up",
// sezione "Order App" — separata dalle sezioni della sequenza a freddo
// di Prospect Finder, che vive nello stesso progetto.
//
// A differenza dei follow-up campionature, qui l'id del task è salvato
// sull'attività (prospect_activities.todoist_task_id): il browser lo
// manda indietro per aggiornare o chiudere il task giusto.
//
//   action 'upsert' → crea il task, o aggiorna titolo e scadenza
//   action 'close'  → chiude il task (passo fatto o sostituito)

import { requireUser } from './_auth.js'
import { APP_URL, todoistFetch, findOrCreateProject, findOrCreateSection } from './_todoist.js'

const PROJECT_NAME = 'Prospect Follow Up'
const SECTION_NAME = 'Order App'

const buildDescription = (activityId, prospectName) =>
  `[${prospectName || 'Prospect'} — apri Order App](${APP_URL}/#order-app-activity:${activityId})`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const user = await requireUser(req, res)
  if (!user) return

  const token = process.env.TODOIST_API_TOKEN
  if (!token) {
    console.error('sync-todoist-prospect: TODOIST_API_TOKEN mancante')
    return res.status(500).json({ error: 'Configurazione mancante lato server' })
  }

  const { action, taskId, activityId, prospectName, content, dueDate } = req.body || {}
  if (!['upsert', 'close'].includes(action)) return res.status(400).json({ error: 'Azione non valida' })

  try {
    if (action === 'close') {
      if (!taskId) return res.status(200).json({ action: 'noop' })
      try {
        await todoistFetch(token, `/tasks/${encodeURIComponent(taskId)}/close`, { method: 'POST' })
      } catch (err) {
        // Task già cancellato a mano su Todoist: non c'è più niente da chiudere.
        if (err.status === 404) return res.status(200).json({ action: 'noop' })
        throw err
      }
      return res.status(200).json({ action: 'closed' })
    }

    if (!activityId || !content) return res.status(400).json({ error: 'activityId o titolo mancanti' })
    const body = {
      content: String(content).slice(0, 500),
      description: buildDescription(activityId, prospectName),
      ...(dueDate ? { due_date: dueDate } : {}),
    }

    if (taskId) {
      try {
        await todoistFetch(token, `/tasks/${encodeURIComponent(taskId)}`, { method: 'POST', body: JSON.stringify(body) })
        return res.status(200).json({ action: 'updated', taskId })
      } catch (err) {
        // Cancellato a mano su Todoist: se ne crea uno nuovo qui sotto.
        if (err.status !== 404) throw err
      }
    }

    const project = await findOrCreateProject(token, PROJECT_NAME)
    const section = await findOrCreateSection(token, project.id, SECTION_NAME)
    const created = await todoistFetch(token, '/tasks', {
      method: 'POST',
      body: JSON.stringify({ project_id: project.id, section_id: section.id, ...body }),
    })
    return res.status(200).json({ action: 'created', taskId: created.id })
  } catch (err) {
    console.error('sync-todoist-prospect: errore imprevisto', err)
    // Il dettaglio torna al browser per poterlo diagnosticare: il token
    // sta negli header, mai nel messaggio.
    return res.status(500).json({
      error: 'Errore imprevisto nella sincronizzazione Todoist',
      detail: String(err && err.message || err).slice(0, 300),
    })
  }
}
