// Tiene allineato un task su Todoist con lo stato di follow-up di un
// invio campioni di Order App. Funzione serverless separata dal resto
// dell'app: il token Todoist resta solo qui, lato server, mai esposto al
// browser. La logica del task sta in _todoist.js (syncSampleFollowUp),
// condivisa con il connettore MCP.

import { requireUser } from './_auth.js'
import { syncSampleFollowUp } from './_todoist.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const user = await requireUser(req, res)
  if (!user) return

  const token = process.env.TODOIST_API_TOKEN
  if (!token) {
    console.error('sync-todoist-followup: TODOIST_API_TOKEN mancante')
    return res.status(500).json({ error: 'Configurazione mancante lato server' })
  }

  const { shipmentId, clubName, open, dueDate, purpose } = req.body || {}
  if (!shipmentId) return res.status(400).json({ error: 'shipmentId mancante' })

  try {
    const result = await syncSampleFollowUp(token, { shipmentId, clubName, open, dueDate, purpose })
    return res.status(200).json(result)
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
