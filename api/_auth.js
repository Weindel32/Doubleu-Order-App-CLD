// Verifica che la richiesta arrivi da un utente autorizzato di Order App
// (sessione Supabase valida ed email in app_users), prima di eseguire operazioni che usano
// credenziali di servizio (Prospect Finder, Todoist). Senza questo
// controllo chiunque conoscesse l'URL della funzione potrebbe invocarla
// direttamente: il login dell'interfaccia da solo non protegge le API.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bixayovstdptbgauvsgm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_pKpjPbw4a0HSEIWbf2ZXvA_svT70I3v'

export async function requireUser(req, res) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'Autenticazione richiesta' })
    return null
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    res.status(401).json({ error: 'Sessione non valida o scaduta' })
    return null
  }

  // Essere autenticati non basta: l'email deve essere nell'elenco degli
  // utenti autorizzati (tabella app_users), come per le tabelle dell'app.
  const asUser = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: allowed, error: allowErr } = await asUser.rpc('is_app_user')
  if (allowErr || allowed !== true) {
    res.status(403).json({ error: 'Utente non autorizzato' })
    return null
  }
  return data.user
}
