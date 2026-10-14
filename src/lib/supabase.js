import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bixayovstdptbgauvsgm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_pKpjPbw4a0HSEIWbf2ZXvA_svT70I3v'

// Link "Password dimenticata?" della mail: Supabase riporta qui con
// #...type=recovery nell'indirizzo e lo consuma appena il client parte,
// quindi va letto prima di crearlo. L'app chiede subito la nuova password.
export const openedFromRecoveryLink = typeof window !== 'undefined' && /type=recovery/.test(window.location.hash)

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Header da allegare alle chiamate verso le funzioni serverless in api/,
// che verificano la sessione prima di usare credenziali di servizio
// (Prospect Finder, Todoist). Vuoto se non c'è una sessione attiva: la
// funzione risponderà 401.
export async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
