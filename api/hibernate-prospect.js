// Invia un club "ibernato" (in pausa, non ora ma da ricontattare più
// avanti) da Order App a Prospect Finder — l'app dove vive davvero
// la gestione dello stato di relazione con i club non ancora clienti.
//
// Funzione serverless separata dal resto dell'app: la service role
// key di Prospect Finder (progetto Supabase "doubleu-kit") resta solo
// qui, lato server, mai esposta al browser. Tocca solo la tabella
// "prospects" di quel progetto — nessuna altra tabella, nessuna
// modifica di schema, nessuna cancellazione.

const PROSPECT_FINDER_URL = 'https://bliljqmgzzxshvhyzzos.supabase.co'
const STANDBY_REASONS = ['risposta_negativa', 'pausa', 'escluso']

// I tipi di attività di Order App non coincidono con quelli ammessi
// da Prospect Finder: qui li traduco, e tengo l'etichetta originale
// dentro la nota così l'informazione non si perde.
const ACT_TIPO = {
  email_sent: 'email', reply_received: 'email',
  call: 'call', note: 'nota', sample_shipped: 'altro',
}
const ACT_LABEL = {
  email_sent: 'Email inviata', reply_received: 'Risposta ricevuta',
  sample_shipped: 'Sample spedito', call: 'Chiamata', note: 'Nota',
}

// Copia le attività registrate in Order App sulla scheda di Prospect
// Finder. Salta quelle già presenti (confronto sul timestamp) così
// inviare due volte lo stesso club non duplica lo storico. Non è
// bloccante: se fallisce, l'ibernazione resta comunque valida.
async function syncActivities(prospectId, activities, headers) {
  const rows = (Array.isArray(activities) ? activities : []).filter(a => a && a.created_at)
  if (!rows.length) return 0

  const url = `${PROSPECT_FINDER_URL}/rest/v1/prospect_activities`
  const existingRes = await fetch(`${url}?prospect_id=eq.${prospectId}&select=data`, { headers })
  const existing = existingRes.ok ? await existingRes.json() : []
  const seen = new Set(existing.map(r => new Date(r.data).getTime()))

  const payload = rows
    .filter(a => !seen.has(new Date(a.created_at).getTime()))
    .map(a => {
      const label = ACT_LABEL[a.type] || a.type
      const text = (a.content || '').trim()
      return {
        prospect_id: prospectId,
        tipo: ACT_TIPO[a.type] || 'altro',
        nota: text ? `[Order App] ${label} — ${text}` : `[Order App] ${label}`,
        data: a.created_at,
        completata: true,
      }
    })
  if (!payload.length) return 0

  const insertRes = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
  if (!insertRes.ok) {
    console.error('hibernate-prospect: attività non sincronizzate', insertRes.status, await insertRes.text())
    return 0
  }
  return payload.length
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const serviceKey = process.env.PROSPECT_FINDER_SERVICE_KEY
  if (!serviceKey) {
    console.error('hibernate-prospect: PROSPECT_FINDER_SERVICE_KEY mancante')
    return res.status(500).json({ error: 'Configurazione mancante lato server' })
  }

  const {
    name, city, province, country,
    contact_name, contact_email, contact_phone,
    notes, standby_motivo, activities,
  } = req.body || {}

  const clubName = (name || '').trim()
  if (!clubName) return res.status(400).json({ error: 'Nome club mancante' })

  const motivo = STANDBY_REASONS.includes(standby_motivo) ? standby_motivo : 'pausa'

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }

  try {
    // Cerca un club con lo stesso nome (case-insensitive). Se il
    // riscontro non è univoco preferisco creare una riga nuova
    // piuttosto che rischiare di aggiornare il club sbagliato.
    const searchUrl = `${PROSPECT_FINDER_URL}/rest/v1/prospects`
      + `?nome_club=ilike.${encodeURIComponent(clubName)}&select=id,nome_club`
    const searchRes = await fetch(searchUrl, { headers })
    if (!searchRes.ok) {
      const detail = await searchRes.text()
      console.error('hibernate-prospect: ricerca fallita', searchRes.status, detail)
      return res.status(502).json({ error: 'Ricerca su Prospect Finder fallita' })
    }
    const matches = await searchRes.json()

    const noteText = notes ? String(notes).trim() : null

    if (matches.length === 1) {
      const id = matches[0].id
      const patchRes = await fetch(`${searchUrl.split('?')[0]}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          stato: 'ibernato',
          standby_motivo: motivo,
          ...(noteText ? { note: noteText } : {}),
          aggiornato_il: new Date().toISOString(),
        }),
      })
      if (!patchRes.ok) {
        const detail = await patchRes.text()
        console.error('hibernate-prospect: update fallito', patchRes.status, detail)
        return res.status(502).json({ error: 'Aggiornamento su Prospect Finder fallito' })
      }
      const [row] = await patchRes.json()
      const synced = await syncActivities(id, activities, headers)
      return res.status(200).json({ action: 'updated', prospect: row, activities_synced: synced })
    }

    // Nessun riscontro (o più di uno, ambiguo): crea una riga nuova.
    const insertRes = await fetch(searchUrl.split('?')[0], {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        nome_club: clubName,
        città: city || null,
        provincia: province || null,
        paese: country || 'Italia',
        contatto_nome: contact_name || null,
        contatto_email: contact_email || null,
        telefono: contact_phone || null,
        note: noteText,
        stato: 'ibernato',
        standby_motivo: motivo,
        fonte: 'manuale',
      }),
    })
    if (!insertRes.ok) {
      const detail = await insertRes.text()
      console.error('hibernate-prospect: insert fallito', insertRes.status, detail)
      return res.status(502).json({ error: 'Creazione su Prospect Finder fallita' })
    }
    const [row] = await insertRes.json()
    const synced = await syncActivities(row.id, activities, headers)
    return res.status(200).json({
      action: 'created',
      prospect: row,
      activities_synced: synced,
      ambiguous: matches.length > 1 ? matches.length : undefined,
    })
  } catch (err) {
    console.error('hibernate-prospect: errore imprevisto', err)
    return res.status(500).json({ error: 'Errore imprevisto' })
  }
}
