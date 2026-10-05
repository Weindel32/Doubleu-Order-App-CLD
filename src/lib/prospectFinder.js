// Invia un prospect di Order App a Prospect Finder come "ibernato" —
// l'app dove vive davvero la gestione della relazione con i club non
// ancora clienti. Passa dalla funzione serverless api/hibernate-prospect.js,
// che tiene la chiave di servizio di Prospect Finder lato server.

import { authHeader } from './supabase.js'

export const STANDBY_REASONS = [
  { value: 'pausa',            label: 'Pausa — richiamare più avanti' },
  { value: 'risposta_negativa', label: 'Risposta negativa' },
  { value: 'escluso',          label: 'Escluso' },
]

export function sendResultMessage(data) {
  const base = data.action === 'updated'
    ? 'Aggiornato su Prospect Finder (esisteva già).'
    : 'Inviato a Prospect Finder come ibernato.'
  const n = data.activities_synced || 0
  if (!n) return base
  return `${base} ${n} ${n === 1 ? 'attività copiata' : 'attività copiate'}.`
}

export async function sendToProspectFinder(prospect, standbyMotivo) {
  const res = await fetch('/api/hibernate-prospect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({
      name: prospect.name,
      city: prospect.city || null,
      province: prospect.province || null,
      country: prospect.country || null,
      contact_name: prospect.contact_name || null,
      contact_email: prospect.contact_email || null,
      contact_phone: prospect.contact_phone || null,
      notes: prospect.notes || null,
      standby_motivo: standbyMotivo,
      activities: (prospect.prospect_activities || []).map(a => ({
        type: a.type,
        content: a.content || null,
        created_at: a.created_at,
      })),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Invio a Prospect Finder fallito')
  return data
}

// Una richiesta dal sito appena convertita: se il club e' gia' su Prospect
// Finder dentro una sequenza a freddo, la ferma (vedi api/web-lead-sync.js).
// Non bloccante: se fallisce, il prospect in Order App resta comunque creato.
export async function syncWebLeadToProspectFinder(request) {
  const res = await fetch('/api/web-lead-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({
      email: request.email || null,
      club: request.club || null,
      message: request.message || null,
      received_at: request.created_at || null,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Controllo su Prospect Finder fallito')
  return data
}

export function webLeadSyncMessage(data) {
  if (!data?.found) return null
  const parts = []
  if (data.stato_prima !== data.stato_dopo) {
    parts.push(`"${data.nome_club}" era su Prospect Finder (${data.stato_prima}): sequenza fermata, ora e' tra chi ha risposto.`)
  } else {
    parts.push(`"${data.nome_club}" e' su Prospect Finder (${data.stato_prima}): richiesta aggiunta alla sua cronologia.`)
  }
  if (data.todoist_chiuso) parts.push('Promemoria Todoist del follow-up chiuso.')
  if (data.email_programmate > 0) {
    parts.push(`Attenzione: ${data.email_programmate} ${data.email_programmate === 1 ? "email programmata e' ancora" : 'email programmate sono ancora'} in partenza, annullale dal Calendario di Prospect Finder.`)
  }
  return parts.join(' ')
}
