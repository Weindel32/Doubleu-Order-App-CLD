// Server MCP (Streamable HTTP, senza sessione) per gli invii campioni.
// Qui ci sono il protocollo JSON-RPC e i cinque tool; database, Todoist e
// orologio arrivano da fuori (deps), così i test girano senza servizi.
//
// Cosa può fare il connettore, e niente di più: cercare destinatari e
// articoli, preparare un'anteprima, creare l'invio confermato, rileggerlo.
// Nessun SQL libero, nessuna cancellazione, nessuna modifica di record
// esistenti (ordini compresi).

import {
  UserError, TOKEN_TTL_MS, isUuid, searchRecipients, searchArticles, parseSizes,
  buildShipment, previewText, shipmentText, signToken, verifyToken, tokenHash, followUpDue, SIZE_ORDER,
} from './_mcp-logic.js'
import { PURPOSES, PURPOSE_LABELS } from '../src/utils/samples.js'

export const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']

const INSTRUCTIONS = `Connettore Order App DOUBLEU per registrare invii campioni.
Flusso obbligatorio:
1. cerca_cliente con il nome del club: se escono più candidati, chiedi all'utente quale, non scegliere tu.
2. anteprima_invio_campioni: una riga per capo, con le taglie in elenco. Nei set misure si manda un pezzo per taglia: il numero scritto dall'utente è il totale dei pezzi di quel capo. Il codice prodotto è facoltativo: basta la descrizione.
3. Mostra all'utente il riepilogo dell'anteprima e chiedi una conferma esplicita. Non mostrare il codice di conferma.
4. Solo dopo un sì esplicito chiama crea_invio_campioni con il codice di conferma ricevuto.
Se un tool restituisce un errore, riportalo all'utente e chiedi ciò che manca.`

const ROW_SCHEMA = {
  type: 'object',
  properties: {
    descrizione: { type: 'string', description: 'Nome del capo come lo scrive l\'utente, es. "Felpa con cappuccio".' },
    taglie: {
      description: `Taglie del capo. Valide: ${SIZE_ORDER.join(', ')} ("10 anni" = "10").`,
      oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }],
    },
    quantita: { type: 'integer', minimum: 1, description: 'Pezzi totali del capo. Se manca, 1 per taglia.' },
    quantita_confermata: { type: 'boolean', description: 'true solo se l\'utente ha confermato una quantità diversa dal numero di taglie.' },
    codice: { type: 'string', description: 'Codice catalogo facoltativo, es. "DUSP 139".' },
    categoria: { type: 'string', description: 'Categoria app facoltativa; se manca si deduce dalla descrizione.' },
    colore: { type: 'string' },
    costo_unitario: { type: 'number', minimum: 0, description: 'Se manca: ultimo costo usato per lo stesso capo, altrimenti 0.' },
    prezzo_unitario: { type: 'number', minimum: 0, description: 'Prezzo al club, facoltativo.' },
  },
}

export const TOOLS = [
  {
    name: 'cerca_cliente',
    title: 'Cerca cliente o prospect',
    description: 'Cerca un destinatario tra clienti e prospect di Order App, anche con nome incompleto o con refusi. Restituisce tutti i candidati con id, tipo, nome e città: se sono più di uno, chiedi all\'utente quale.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Nome o parte del nome del club.' } }, required: ['query'] },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'cerca_articolo',
    title: 'Cerca articolo in catalogo',
    description: 'Cerca nel catalogo DOUBLEU per codice o nome del capo. Facoltativo: per un invio campioni basta la descrizione.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Codice (es. DUSP 139) o nome (es. polo, pantaloncini).' },
        taglia: { type: 'string', description: 'Taglia da verificare, facoltativa.' },
        colore: { type: 'string', description: 'Colore, facoltativo (in catalogo non ci sono colori: è testo libero).' },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'anteprima_invio_campioni',
    title: 'Anteprima invio campioni',
    description: 'Valida un invio campioni e ne restituisce il riepilogo con un codice di conferma valido 15 minuti. Non scrive nulla.',
    inputSchema: {
      type: 'object',
      properties: {
        destinatario_id: { type: 'string', description: 'id restituito da cerca_cliente (cliente o prospect).' },
        tipo: { type: 'string', enum: PURPOSES, description: PURPOSES.map(p => `${p} = ${PURPOSE_LABELS[p]}`).join(', ') },
        righe: { type: 'array', minItems: 1, items: ROW_SCHEMA },
        note: { type: 'string' },
        data_invio: { type: 'string', description: 'gg/mm/aaaa, se manca oggi.' },
        data_consegna: { type: 'string' },
        data_follow_up: { type: 'string', description: 'Se manca: 10 giorni dopo consegna o invio.' },
        referente: { type: 'string' },
        omaggio: { type: 'boolean', description: 'Merce regalata, non rientra.' },
        reso_richiesto: { type: 'boolean', description: 'I set misure rientrano sempre comunque.' },
        scadenza_reso: { type: 'string', description: 'Se manca, per i set misure 30 giorni dall\'invio.' },
        corriere: { type: 'string' },
        tracking: { type: 'string' },
        costo_spedizione: { type: 'number', minimum: 0 },
      },
      required: ['destinatario_id', 'tipo', 'righe'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'crea_invio_campioni',
    title: 'Crea invio campioni',
    description: 'Crea l\'invio esattamente come nell\'anteprima confermata dall\'utente. Rifiuta codici scaduti o alterati. Ripetere la stessa conferma non crea doppioni.',
    inputSchema: { type: 'object', properties: { confirmation_token: { type: 'string' } }, required: ['confirmation_token'] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'leggi_invio_campioni',
    title: 'Leggi invio campioni',
    description: 'Rilegge un invio campioni dal database, per verificarlo dopo la creazione.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
]

const text = (t) => ({ content: [{ type: 'text', text: t }] })
const withData = (t, data) => text(`${t}\n\nDati: ${JSON.stringify(data)}`)

// deps: { repo, signingKey, now(), today(), connector, syncFollowUp? }
export function createTools(deps) {
  const { repo, signingKey } = deps
  const now = deps.now || (() => Date.now())

  async function recipientById(id) {
    if (!isUuid(id)) throw new UserError('destinatario_id non valido: usa l\'id restituito da cerca_cliente.')
    const r = await repo.findRecipient(id.trim())
    if (!r) throw new UserError('Destinatario non trovato in Order App: rifai cerca_cliente.')
    return r
  }

  const audit = (entry) => Promise.resolve()
    .then(() => repo.audit({ tool: 'crea_invio_campioni', ...entry, payload: { connettore: deps.connector || null, ...(entry.payload || {}) } }))
    .catch(err => console.error('mcp: registro non scritto', err))

  return {
    async cerca_cliente({ query }) {
      const found = searchRecipients(query, await repo.listRecipients())
      if (!found.length) return text(`Nessun cliente o prospect somiglia a "${query}". Prova con un'altra parte del nome.`)
      const head = found.length === 1
        ? 'Un candidato:'
        : `${found.length} candidati: chiedi all'utente quale.`
      const list = found.map(r => `- ${r.nome} (${r.tipo}${r.citta ? `, ${r.citta}` : ''}${r.stato ? `, stato ${r.stato}` : ''}${r.cliente_collegato ? `, collegato al cliente ${r.cliente_collegato}` : ''})`)
      return withData([head, ...list].join('\n'), found)
    },

    async cerca_articolo({ query, taglia, colore }) {
      const found = searchArticles(query)
      const lines = []
      if (taglia) {
        const { sizes, invalid } = parseSizes(taglia)
        lines.push(invalid.length ? `Taglia "${taglia}" non valida. Valide: ${SIZE_ORDER.join(', ')}.` : `Taglia ${sizes.join(', ')} valida.`)
      }
      if (colore) lines.push(`Colore "${colore}": in catalogo non ci sono colori, si scrive così sulla riga.`)
      if (!found.length) return text([`Nessun articolo in catalogo per "${query}". Puoi comunque usare la sola descrizione.`, ...lines].join('\n'))
      const out = found.map(p => ({ ...p, taglie_disponibili: SIZE_ORDER }))
      return withData([
        `${found.length} articoli (le taglie non dipendono dall'articolo: ${SIZE_ORDER.join(', ')}):`,
        ...found.map(p => `- ${p.codice} · ${p.descrizione} · ${p.categoria}`),
        ...lines,
      ].join('\n'), out)
    },

    async anteprima_invio_campioni(args) {
      const recipient = await recipientById(args?.destinatario_id)
      const history = await repo.priceHistory()
      const built = buildShipment(args, { recipient, today: deps.today(), history })
      const exp = now() + TOKEN_TTL_MS
      const token = signToken({
        v: 1, exp,
        rcp: { kind: recipient.kind, id: recipient.id, name: recipient.name },
        shipment: built.shipment, items: built.items,
      }, signingKey)
      return withData(
        `${previewText(built, recipient)}\n\nMostra questo riepilogo all'utente e chiedi conferma. Codice di conferma valido fino alle ${new Date(exp).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' })}.`,
        { confirmation_token: token, scadenza: new Date(exp).toISOString() },
      )
    },

    async crea_invio_campioni({ confirmation_token }) {
      let p
      try {
        p = verifyToken(confirmation_token, signingKey, now())
      } catch (err) {
        await audit({ outcome: 'rifiutato', detail: err.message })
        throw err
      }

      // Il destinatario dell'anteprima deve esistere ancora, uguale.
      const current = await repo.findRecipient(p.rcp.id)
      if (!current || current.kind !== p.rcp.kind || current.name !== p.rcp.name) {
        const msg = current
          ? `Il destinatario è cambiato dopo l'anteprima (ora "${current.name}"): rifai l'anteprima.`
          : "Il destinatario dell'anteprima non esiste più in Order App: rifai cerca_cliente."
        await audit({ outcome: 'rifiutato', detail: msg, payload: { shipment: p.shipment } })
        throw new UserError(msg)
      }

      let id
      try {
        id = await repo.createShipment({ ...p.shipment, connettore: deps.connector || null }, p.items, tokenHash(confirmation_token))
      } catch (err) {
        console.error('mcp: create_sample_shipment fallita', err)
        await audit({ outcome: 'errore', detail: String(err?.message || err).slice(0, 500), payload: { shipment: p.shipment } })
        throw new UserError(`Invio NON creato, nessun dato scritto: ${err?.message || err}`)
      }

      // Come nell'app: il task di follow-up segue l'invio, ma se Todoist
      // non risponde l'invio resta valido.
      let todo = 'Todoist non configurato: nessun task di follow-up.'
      if (deps.syncFollowUp) {
        try {
          await deps.syncFollowUp({
            shipmentId: id, clubName: p.shipment.recipient_name, open: true,
            dueDate: followUpDue(p.shipment), purpose: PURPOSE_LABELS[p.shipment.purpose] || p.shipment.purpose,
          })
          todo = `Follow-up su Todoist (Campionature → Follow up) per il ${followUpDue(p.shipment).split('-').reverse().join('/')}.`
        } catch (err) {
          console.error('mcp: follow-up Todoist non aggiornato', err)
          todo = "Attenzione: invio creato, ma il task Todoist non è stato aggiornato. Si riallinea al prossimo salvataggio dell'invio dall'app."
        }
      }

      const sh = await repo.readShipment(id)
      return withData(`Invio creato.\n${sh ? shipmentText(sh) : `id ${id}`}\n${todo}`, { id })
    },

    async leggi_invio_campioni({ id }) {
      if (!isUuid(id)) throw new UserError('id non valido: usa l\'id restituito da crea_invio_campioni.')
      const sh = await repo.readShipment(id.trim())
      if (!sh) throw new UserError('Invio campioni non trovato.')
      return withData(shipmentText(sh), { id: sh.id, origine: sh.source || 'app' })
    },
  }
}

// ─── JSON-RPC ────────────────────────────────────────────────────

const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result })

export async function handleMessage(msg, deps) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return rpcError(msg?.id, -32600, 'Richiesta JSON-RPC non valida')
  }
  const isNotification = msg.id === undefined || msg.id === null
  if (isNotification) return null

  const { id, method, params } = msg
  switch (method) {
    case 'initialize': {
      const asked = params?.protocolVersion
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'doubleu-order-app', title: 'DOUBLEU Order App', version: deps.version || '1.0.0' },
        instructions: INSTRUCTIONS,
      })
    }
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS })
    case 'tools/call': {
      const name = params?.name
      const tools = createTools(deps)
      if (!Object.prototype.hasOwnProperty.call(tools, name)) return rpcError(id, -32602, `Tool sconosciuto: ${name}`)
      try {
        return rpcResult(id, await tools[name](params?.arguments || {}))
      } catch (err) {
        if (err instanceof UserError) return rpcResult(id, { ...text(err.message), isError: true })
        console.error(`mcp: errore in ${name}`, err)
        return rpcResult(id, { ...text('Errore interno del server: riprova tra poco. Nessun dato è stato modificato da questa chiamata.'), isError: true })
      }
    }
    default:
      return rpcError(id, -32601, `Metodo non supportato: ${method}`)
  }
}

// Corpo della richiesta HTTP → corpo della risposta, o null (= 202, solo notifiche).
export async function handleBody(body, deps) {
  if (Array.isArray(body)) {
    if (!body.length) return rpcError(null, -32600, 'Batch vuoto')
    const out = (await Promise.all(body.map(m => handleMessage(m, deps)))).filter(Boolean)
    return out.length ? out : null
  }
  return handleMessage(body, deps)
}
