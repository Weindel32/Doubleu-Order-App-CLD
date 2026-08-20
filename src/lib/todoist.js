// Sincronizza il follow-up di un invio campioni con un task su Todoist
// (progetto "Campionature" → sezione "Follow up"). Passa dalla funzione
// serverless api/sync-todoist-followup.js, che tiene il token Todoist
// lato server. Sincronizzazione best-effort: chi chiama deve gestire
// l'eventuale fallimento senza bloccare il salvataggio in Order App.

import { isItemOpen, addDaysISO, FOLLOW_UP_DAYS, PURPOSE_LABELS } from '../utils/samples.js'

export async function syncFollowUpToTodoist(shipment, clubName) {
  const open = (shipment.items || []).some(isItemOpen)
  const dueDate = open ? (shipment.follow_up_date || addDaysISO(shipment.shipped_date, FOLLOW_UP_DAYS)) : null

  const res = await fetch('/api/sync-todoist-followup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    throw new Error(data.error || 'Sincronizzazione Todoist fallita')
  }
}
