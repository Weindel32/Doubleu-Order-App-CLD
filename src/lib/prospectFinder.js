// Invia un prospect di Order App a Prospect Finder come "ibernato" —
// l'app dove vive davvero la gestione della relazione con i club non
// ancora clienti. Passa dalla funzione serverless api/hibernate-prospect.js,
// che tiene la chiave di servizio di Prospect Finder lato server.

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
    headers: { 'Content-Type': 'application/json' },
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
