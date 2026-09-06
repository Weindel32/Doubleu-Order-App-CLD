// Verifica che la richiesta arrivi da un utente autenticato di Order App
// (sessione Supabase valida), prima di eseguire operazioni che usano
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
  return data.user
}
