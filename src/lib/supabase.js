import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bixayovstdptbgauvsgm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_pKpjPbw4a0HSEIWbf2ZXvA_svT70I3v'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
