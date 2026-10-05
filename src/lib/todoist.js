// Sincronizza il follow-up di un invio campioni con un task su Todoist
// (progetto "Campionature" → sezione "Follow up"). Passa dalla funzione
// serverless api/sync-todoist-followup.js, che tiene il token Todoist
// lato server. Sincronizzazione best-effort: chi chiama deve gestire
// l'eventuale fallimento senza bloccare il salvataggio in Order App.

import { isItemOpen, addDaysISO, FOLLOW_UP_DAYS, PURPOSE_LABELS, followUpBaseDate } from '../utils/samples.js'
import { authHeader } from './supabase.js'

export async function syncFollowUpToTodoist(shipment, clubName) {
  const open = (shipment.items || []).some(isItemOpen)
  const dueDate = open ? (shipment.follow_up_date || addDaysISO(followUpBaseDate(shipment), FOLLOW_UP_DAYS)) : null

  const res = await fetch('/api/sync-todoist-followup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({
      shipmentId: shipment.id,
      clubName,
      open,
      dueDate,
      purpose: PURPOSE_LABELS[shipment.purpose] || shipment.purpose || null,
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const parts = [data.error || 'Sincronizzazione Todoist fallita', data.detail].filter(Boolean)
    throw new Error(parts.join(' — '))
  }
}

// Promemoria del prossimo passo di un prospect (progetto "Prospect
// Follow Up" → sezione "Order App"), via api/sync-todoist-prospect.js.
// 'upsert' restituisce l'id del task da salvare sull'attività; 'close'
// lo chiude quando il passo è fatto o sostituito.
export async function syncProspectStep(action, { taskId, activityId, prospectName, content, dueDate } = {}) {
  const res = await fetch('/api/sync-todoist-prospect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ action, taskId: taskId || null, activityId, prospectName, content, dueDate: dueDate || null }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const parts = [data.error || 'Sincronizzazione Todoist fallita', data.detail].filter(Boolean)
    throw new Error(parts.join(' — '))
  }
  return data
}
