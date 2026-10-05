// Quando una richiesta arrivata dal form del sito diventa un prospect in
// Order App, il club potrebbe essere gia' in lavorazione su Prospect Finder,
// dentro una sequenza di email a freddo. Senza questo passaggio la sequenza
// continuerebbe a proporre follow-up di presentazione a chi ci ha appena
// scritto lui: un errore che si vede e che costa in percezione del marchio.
//
// Qui, lato server (la service key di Prospect Finder non arriva mai al
// browser), si cerca il club per email del referente e, solo se l'email non
// basta, per nome. Se c'e':
//   · passa a 'risposto' (esce dalla tab Follow-up, entra in Trattative),
//     se era freddo, mai contattato, in stand-by o perso;
//   · la richiesta entra nella sua cronologia come email ricevuta;
//   · il promemoria Todoist del prossimo follow-up viene chiuso;
//   · si contano le email gia' programmate su Resend, che vanno annullate
//     dal Calendario di Prospect Finder (questa funzione non ha la chiave
//     Resend di quell'app e non le tocca).
// Se il club non c'e', non si crea nulla: un lead arrivato dal sito vive in
// Order App, non nella lista di chi va contattato a freddo.

import { requireUser } from './_auth.js'

const PROSPECT_FINDER_URL = 'https://bliljqmgzzxshvhyzzos.supabase.co'
const TODOIST_API = 'https://api.todoist.com/api/v1'

// Stati da cui un club passa a 'risposto' quando ci scrive dal sito. Gli
// stati gia' caldi (risposto, call, meeting, proposta, trattativa, cliente)
// restano come sono: la relazione e' gia' avviata e retrocederla sarebbe
// sbagliato.
const DA_RISVEGLIARE = [
  'nuovo', 'analizzato', 'email_pronta',
  'contattato', 'followup_inviato',
  'ibernato', 'perso', 'non_rilevante',
]

async function pf(path, options = {}, key) {
  return fetch(`${PROSPECT_FINDER_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

// ilike senza caratteri jolly: '_' e '%' in un'email o in un nome vanno
// presi alla lettera, non come "qualsiasi carattere".
const literal = (v) => encodeURIComponent(v.replace(/[\\%_]/g, c => '\\' + c))

async function findClub(key, email, club) {
  const select = 'id,nome_club,stato,todoist_task_id'
  if (email) {
    const e = literal(email)
    const r = await pf(`prospects?contatto_email=ilike.${e}&select=${select}`, {}, key)
    const rows = r.ok ? await r.json() : []
    if (rows.length === 1) return rows[0]
    // I referenti secondari stanno in una tabella a parte.
    if (!rows.length) {
      const rr = await pf(`prospect_referenti?email=ilike.${e}&select=prospect_id`, {}, key)
      const refs = rr.ok ? await rr.json() : []
      const ids = [...new Set(refs.map(x => x.prospect_id))]
      if (ids.length === 1) {
        const r2 = await pf(`prospects?id=eq.${ids[0]}&select=${select}`, {}, key)
        const one = r2.ok ? await r2.json() : []
        if (one.length === 1) return one[0]
      }
    }
  }
  // Per nome solo se univoco: meglio non trovare niente che fermare la
  // sequenza del club sbagliato.
  if (club) {
    const r = await pf(`prospects?nome_club=ilike.${literal(club)}&select=${select}`, {}, key)
    const rows = r.ok ? await r.json() : []
    if (rows.length === 1) return rows[0]
  }
  return null
}

async function closeTodoistTask(taskId) {
  const token = process.env.TODOIST_API_TOKEN
  if (!token || !taskId) return false
  try {
    const r = await fetch(`${TODOIST_API}/tasks/${encodeURIComponent(taskId)}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    // 404: il task e' gia' stato chiuso o cancellato, il risultato e' lo stesso.
    return r.ok || r.status === 404
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const user = await requireUser(req, res)
  if (!user) return

  const key = process.env.PROSPECT_FINDER_SERVICE_KEY
  if (!key) {
    console.error('web-lead-sync: PROSPECT_FINDER_SERVICE_KEY mancante')
    return res.status(500).json({ error: 'Configurazione mancante lato server' })
  }

  const { email, club, message, received_at } = req.body || {}
  const mail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const nome = typeof club === 'string' ? club.trim() : ''
  if (!mail && !nome) return res.status(400).json({ error: 'Email o club mancanti' })

  try {
    const p = await findClub(key, mail, nome)
    if (!p) return res.status(200).json({ found: false })

    const result = { found: true, nome_club: p.nome_club, stato_prima: p.stato, stato_dopo: p.stato }
    const now = new Date().toISOString()

    if (DA_RISVEGLIARE.includes(p.stato)) {
      const up = await pf(`prospects?id=eq.${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          stato: 'risposto',
          last_contacted_at: received_at || now,
          // Fuori dallo stand-by: niente piu' data di risveglio ne' motivo.
          next_action_at: null,
          standby_motivo: null,
          aggiornato_il: now,
        }),
      }, key)
      if (!up.ok) {
        console.error('web-lead-sync: update fallito', up.status, await up.text())
        return res.status(502).json({ error: 'Aggiornamento su Prospect Finder fallito' })
      }
      result.stato_dopo = 'risposto'
      // Storico delle fasi: best-effort, come in Prospect Finder.
      await pf('prospect_stage_history', {
        method: 'POST',
        body: JSON.stringify({ prospect_id: p.id, from_stato: p.stato, to_stato: 'risposto' }),
      }, key).catch(() => {})
    }

    // La richiesta nella cronologia del club, datata quando e' arrivata.
    // Saltata se c'e' gia' (stesso istante): convertire due volte non duplica.
    const when = received_at || now
    const ex = await pf(`prospect_activities?prospect_id=eq.${p.id}&data=eq.${encodeURIComponent(when)}&select=id`, {}, key)
    const already = ex.ok ? (await ex.json()).length > 0 : false
    if (!already) {
      const testo = String(message || '').trim()
      await pf('prospect_activities', {
        method: 'POST',
        body: JSON.stringify({
          prospect_id: p.id,
          tipo: 'email',
          direzione: 'ricevuta',
          nota: `[Sito] Richiesta dal form contatti di doubleutennis.com${testo ? ' — ' + testo.slice(0, 1500) : ''}`,
          data: when,
          completata: true,
        }),
      }, key).catch(() => {})
    }

    if (p.todoist_task_id && await closeTodoistTask(p.todoist_task_id)) {
      await pf(`prospects?id=eq.${p.id}`, {
        method: 'PATCH', body: JSON.stringify({ todoist_task_id: null }),
      }, key).catch(() => {})
      result.todoist_chiuso = true
    }

    const sc = await pf(`prospect_contacts?prospect_id=eq.${p.id}&delivery_status=eq.scheduled&select=id`, {}, key)
    result.email_programmate = sc.ok ? (await sc.json()).length : 0

    return res.status(200).json(result)
  } catch (err) {
    console.error('web-lead-sync: errore imprevisto', err)
    return res.status(500).json({ error: 'Errore imprevisto' })
  }
}
