// Connettore MCP di Order App per creare invii campioni dalla chat
// (Claude, ChatGPT). Indirizzo: /api/mcp/<codice di accesso>, oppure
// /api/mcp con "Authorization: Bearer <codice>". Senza codice valido: 401.
//
// Variabili d'ambiente (Vercel):
//   SUPABASE_SERVICE_ROLE_KEY  chiave di servizio Supabase, solo lato server
//   MCP_ACCESS_KEYS            codici di accesso, uno per app: "claude:xxxx,chatgpt:yyyy"
//   TODOIST_API_TOKEN          già presente: per il task di follow-up
//
// La chiave di servizio salta le regole di accesso del database: per
// questo qui si usano solo letture mirate e la funzione
// create_sample_shipment, mai scritture libere.

import { createClient } from '@supabase/supabase-js'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { handleBody } from './_mcp-server.js'
import { syncSampleFollowUp } from './_todoist.js'
import { italianDay } from '../src/lib/production.js'

const SUPABASE_URL = 'https://bixayovstdptbgauvsgm.supabase.co'

// "claude:xxxx,chatgpt:yyyy" → [{ label, key }]. Un codice senza nome vale "connettore".
export function parseAccessKeys(raw) {
  return String(raw || '').split(',').map(x => x.trim()).filter(Boolean).map(entry => {
    const i = entry.indexOf(':')
    return i > 0 ? { label: entry.slice(0, i).trim(), key: entry.slice(i + 1).trim() } : { label: 'connettore', key: entry }
  }).filter(k => k.key.length >= 24)
}

const digest = (s) => createHash('sha256').update(String(s)).digest()

// Quale app sta chiamando (nome del codice), oppure null.
export function authenticate(req, keys) {
  const header = req.headers?.authorization || ''
  const given = (req.query?.key || (header.startsWith('Bearer ') ? header.slice(7) : '')).trim()
  if (!given) return null
  const g = digest(given)
  const match = keys.find(k => timingSafeEqual(digest(k.key), g))
  return match ? match.label : null
}

function supabaseRepo(db) {
  const check = (label, { data, error }) => {
    if (error) throw new Error(`${label}: ${error.message}`)
    return data
  }
  return {
    async listRecipients() {
      const [c, p] = await Promise.all([
        db.from('clients').select('id, name, city, province, country'),
        db.from('prospects').select('id, name, city, province, country, stage, client_id, contact_name, hibernated_at'),
      ])
      return { clients: check('clienti', c) || [], prospects: check('prospect', p) || [] }
    },
    async findRecipient(id) {
      const c = check('cliente', await db.from('clients').select('id, name, city').eq('id', id).maybeSingle())
      if (c) return { kind: 'cliente', id: c.id, name: c.name, city: c.city || null }
      const p = check('prospect', await db.from('prospects').select('id, name, city, contact_name').eq('id', id).maybeSingle())
      if (p) return { kind: 'prospect', id: p.id, name: p.name, city: p.city || null, contact_name: p.contact_name || null }
      return null
    },
    async priceHistory() {
      const rows = check('storico costi', await db.from('sample_items')
        .select('sp, description, unit_cost, unit_price, sample_shipments(shipped_date, created_at)')) || []
      return rows
        .map(r => ({ ...r, shipped_date: r.sample_shipments?.shipped_date || '', created_at: r.sample_shipments?.created_at || '' }))
        .sort((a, b) => (b.shipped_date + b.created_at).localeCompare(a.shipped_date + a.created_at))
    },
    async createShipment(shipment, items, hash) {
      const id = check('creazione invio', await db.rpc('create_sample_shipment', { p_shipment: shipment, p_items: items, p_token_hash: hash }))
      if (!id) throw new Error('creazione invio: nessun id restituito')
      return id
    },
    async readShipment(id) {
      const sh = check('lettura invio', await db.from('sample_shipments').select('*, sample_items(*)').eq('id', id).maybeSingle())
      if (!sh) return null
      const { sample_items, ...rest } = sh
      return { ...rest, items: [...(sample_items || [])].sort((a, b) => (a.position || 0) - (b.position || 0)) }
    },
    async audit(entry) {
      check('registro', await db.from('mcp_audit_log').insert({
        tool: entry.tool, outcome: entry.outcome, detail: entry.detail || null,
        shipment_id: entry.shipment_id || null, payload: entry.payload || null,
      }))
    },
  }
}

export default async function handler(req, res) {
  const connector = authenticate(req, parseAccessKeys(process.env.MCP_ACCESS_KEYS))
  if (!connector) return res.status(401).json({ error: 'Accesso negato: codice di accesso mancante o non valido.' })

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Usa POST: il connettore funziona solo come MCP Streamable HTTP.' })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('mcp: SUPABASE_SERVICE_ROLE_KEY mancante')
    return res.status(500).json({ error: 'Configurazione mancante lato server.' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON non valido' } }) }
  }

  const db = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const todoistToken = process.env.TODOIST_API_TOKEN
  const out = await handleBody(body, {
    repo: supabaseRepo(db),
    // Chiave dei codici di conferma, ricavata dalla chiave di servizio:
    // nessuna variabile in più, e cambiarla invalida i codici in giro.
    signingKey: createHmac('sha256', serviceKey).update('order-app-mcp-confirm-v1').digest(),
    today: () => italianDay(new Date()),
    connector,
    syncFollowUp: todoistToken ? (args) => syncSampleFollowUp(todoistToken, args) : null,
  })
  if (out === null) return res.status(202).end()
  return res.status(200).json(out)
}
