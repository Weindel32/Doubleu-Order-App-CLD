// Test del connettore MCP invii campioni: node --test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseSizes, normalizeSize, inferCategory, searchRecipients, searchArticles,
  buildShipment, signToken, verifyToken, tokenHash, UserError, TOKEN_TTL_MS,
} from '../api/_mcp-logic.js'
import { createTools, handleBody, TOOLS } from '../api/_mcp-server.js'
import { authenticate, parseAccessKeys } from '../api/mcp.js'

const TEV = { id: 'f3c594d8-857f-43e4-a487-ae0e81f9ec88', name: 'TENNIS ECO VILLAGE', city: "Cava de'Tirreni" }
const CHIA_C = { id: '29370907-dcdf-4e7a-91bf-9914efbc8d6f', name: 'CHIAPPETTA SPORT VILLAGE', city: 'Rende' }
const CHIA_P = { id: 'd2ae5f9d-e893-48dd-ba32-3f5a54aadecc', name: 'CHIAPPETTA SPORT VILLAGE', city: 'Rende', stage: 'negoziazione', client_id: CHIA_C.id }
const PROS = { id: '11111111-2222-4333-8444-555555555555', name: 'Circolo Padel Nord', city: 'Milano', stage: 'contatto', contact_name: 'Luca' }
const KEY = Buffer.from('chiave-di-test-per-firmare-i-codici')
const T0 = Date.UTC(2026, 10, 5, 10, 0, 0)

// La lista di Marco, così come la scriverebbe in chat.
const LISTA = [
  { descrizione: 'Felpa con cappuccio', taglie: ['10 anni', '12 anni', '14 anni', 'M', 'L'], quantita: 5 },
  { descrizione: 'T-shirt', taglie: '8, 12, 16 anni, S, M, L, XL, XXL', quantita: 8 },
  { descrizione: 'Pantaloncini', taglie: ['8', '10', '12', '14', 'M'] },
]

function fakeRepo(over = {}) {
  const calls = { created: [], audit: [] }
  const recipients = { [TEV.id]: { kind: 'cliente', ...TEV }, [PROS.id]: { kind: 'prospect', ...PROS } }
  const store = {}
  return {
    calls,
    async listRecipients() { return { clients: [TEV, CHIA_C], prospects: [CHIA_P, PROS] } },
    async findRecipient(id) { return recipients[id] || null },
    async priceHistory() { return [{ sp: null, description: 'Felpa con cappuccio', unit_cost: 18, unit_price: 45, shipped_date: '2026-10-01' }] },
    async createShipment(sh, items, hash) {
      calls.created.push({ sh, items, hash })
      const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
      store[id] = { id, ...sh, source: 'claude-mcp', items: items.map(it => ({ ...it, outcome: 'in_attesa' })) }
      return id
    },
    async readShipment(id) { return store[id] || null },
    async audit(e) { calls.audit.push(e) },
    _recipients: recipients,
    ...over,
  }
}

function deps(repo, extra = {}) {
  let clock = T0
  const todo = []
  return {
    repo, signingKey: KEY, now: () => clock, today: () => '2026-11-05', connector: 'claude',
    syncFollowUp: async (a) => { todo.push(a) },
    _todo: todo, _advance: (ms) => { clock += ms },
    ...extra,
  }
}

const textOf = (r) => r.content[0].text
const tokenOf = (r) => JSON.parse(textOf(r).split('\n\nDati: ')[1]).confirmation_token

// ─── Lettura della lista ─────────────────────────────────────────

test('taglie: anni, maiuscole, doppioni e ordine dell\'app', () => {
  assert.deepEqual(parseSizes('8, 12, 16 anni, S, M, L, XL, XXL').sizes, ['8', '12', '16', 'S', 'M', 'L', 'XL', 'XXL'])
  assert.deepEqual(parseSizes(['l', 'M', '10 anni', 'm']).sizes, ['10', 'M', 'L'])
  assert.equal(normalizeSize('2XL'), 'XXL')
  assert.equal(normalizeSize('taglia unica'), 'UNI')
  assert.deepEqual(parseSizes(['M', '9 anni', 'XXXL']).invalid, ['9', 'XXXL'])
})

test('categoria dedotta dalla descrizione, t-shirt resta vuota', () => {
  assert.equal(inferCategory('Felpa con cappuccio'), 'Hoodie')
  assert.equal(inferCategory('felpa zip'), 'Zip Hoodie')
  assert.equal(inferCategory('Pantaloncini'), 'Short')
  assert.equal(inferCategory('pantaloni tuta'), 'Sweatpants')
  assert.equal(inferCategory('T-shirt'), null)
})

test('ricerca destinatari: refusi, nome parziale, più candidati', () => {
  const data = { clients: [TEV, CHIA_C], prospects: [CHIA_P, PROS] }
  assert.equal(searchRecipients('tennis eco vilage', data)[0].id, TEV.id)
  assert.equal(searchRecipients('eco village', data)[0].id, TEV.id)
  const chia = searchRecipients('chiappetta', data)
  assert.equal(chia.length, 2)
  assert.deepEqual(chia.map(r => r.tipo), ['cliente', 'prospect'])
  assert.equal(chia[1].cliente_collegato, CHIA_C.name)
  assert.equal(searchRecipients('roma padel arena', data).length, 0)
  assert.throws(() => searchRecipients('  ', data), UserError)
})

test('ricerca articoli per codice e per nome', () => {
  assert.equal(searchArticles('dusp139')[0].codice, 'DUSP 139')
  assert.ok(searchArticles('pantaloncini').every(p => p.categoria === 'Short'))
  assert.ok(searchArticles('polo').some(p => p.codice === 'DUSP 139'))
})

// ─── Anteprima ───────────────────────────────────────────────────

test('set misure: 3 righe, taglie in elenco, reso a 30 giorni, costo dallo storico', () => {
  const history = [{ description: 'felpa con CAPPUCCIO', unit_cost: 18, unit_price: 45, shipped_date: '2026-10-01' }]
  const r = buildShipment({ tipo: 'misurazione', righe: LISTA }, { recipient: { kind: 'cliente', ...TEV }, today: '2026-11-05', history })
  assert.equal(r.items.length, 3)
  assert.deepEqual(r.items.map(i => [i.description, i.category, i.size, i.quantity]), [
    ['Felpa con cappuccio', 'Hoodie', '10, 12, 14, M, L', 5],
    ['T-shirt', null, '8, 12, 16, S, M, L, XL, XXL', 8],
    ['Pantaloncini', 'Short', '8, 10, 12, 14, M', 5],
  ])
  assert.equal(r.items[0].unit_cost, 18)
  assert.equal(r.items[1].unit_cost, 0)
  assert.equal(r.shipment.client_id, TEV.id)
  assert.equal(r.shipment.prospect_id, null)
  assert.equal(r.shipment.return_required, true)
  assert.equal(r.shipment.return_due_date, '2026-12-05')
  assert.ok(r.warnings.some(w => w.includes('Pantaloncini') && w.includes('1 pezzo per taglia')))
})

test('anteprima rifiuta quantità che non torna con le taglie, salvo conferma', () => {
  const recipient = { kind: 'cliente', ...TEV }
  const righe = [{ descrizione: 'Polo', taglie: ['M', 'L'], quantita: 3 }]
  assert.throws(() => buildShipment({ tipo: 'misurazione', righe }, { recipient, today: '2026-11-05' }), /3 pezzi ma 2 taglie/)
  const ok = buildShipment({ tipo: 'misurazione', righe: [{ ...righe[0], quantita_confermata: true }] }, { recipient, today: '2026-11-05' })
  assert.equal(ok.items[0].quantity, 3)
})

test('anteprima elenca tutti i problemi insieme, in italiano', () => {
  const err = (() => {
    try { buildShipment({ righe: [{ taglie: ['M', 'ZZ'] }, { descrizione: 'Polo', quantita: 0 }] }, { recipient: { kind: 'cliente', ...TEV }, today: '2026-11-05' }) }
    catch (e) { return e }
  })()
  assert.ok(err instanceof UserError)
  assert.match(err.message, /Manca il tipo di invio/)
  assert.match(err.message, /Riga 1: manca la descrizione/)
  assert.match(err.message, /taglie non riconosciute "ZZ"/)
  assert.match(err.message, /quantità "0" non valida/)
})

test('omaggio: niente reso; omaggio + reso richiesto = errore', () => {
  const recipient = { kind: 'cliente', ...TEV }
  const righe = [{ descrizione: 'Polo', quantita: 1 }]
  const g = buildShipment({ tipo: 'misurazione', omaggio: true, righe }, { recipient, today: '2026-11-05' })
  assert.equal(g.shipment.return_required, false)
  assert.equal(g.shipment.return_due_date, null)
  assert.throws(() => buildShipment({ tipo: 'valutazione', omaggio: true, reso_richiesto: true, righe }, { recipient, today: '2026-11-05' }), /si escludono/)
})

test('prospect: referente proposto dall\'anagrafica', () => {
  const r = buildShipment({ tipo: 'valutazione', righe: [{ descrizione: 'Polo', quantita: 2 }] }, { recipient: { kind: 'prospect', ...PROS }, today: '2026-11-05' })
  assert.equal(r.shipment.prospect_id, PROS.id)
  assert.equal(r.shipment.client_id, null)
  assert.equal(r.shipment.contact_name, 'Luca')
  assert.equal(r.shipment.return_required, false)
})

test('codice catalogo: valido completa la riga, sconosciuto blocca', () => {
  const recipient = { kind: 'cliente', ...TEV }
  const r = buildShipment({ tipo: 'valutazione', righe: [{ codice: 'dusp 139', quantita: 1 }] }, { recipient, today: '2026-11-05' })
  assert.deepEqual([r.items[0].sp, r.items[0].description, r.items[0].category], ['DUSP 139', 'Polo senza bottoni', 'Polo'])
  assert.throws(() => buildShipment({ tipo: 'valutazione', righe: [{ codice: 'DUSP 9999', quantita: 1 }] }, { recipient, today: '2026-11-05' }), /non in catalogo/)
})

// ─── Codice di conferma ──────────────────────────────────────────

test('codice di conferma: valido, scaduto, alterato', () => {
  const payload = { v: 1, exp: T0 + TOKEN_TTL_MS, rcp: {}, shipment: { a: 1 }, items: [] }
  const t = signToken(payload, KEY)
  assert.deepEqual(verifyToken(t, KEY, T0).shipment, { a: 1 })
  assert.throws(() => verifyToken(t, KEY, T0 + TOKEN_TTL_MS + 1), /scaduto/)
  const [body, sig] = t.split('.')
  const forged = Buffer.from(JSON.stringify({ ...payload, items: [{ quantity: 99 }] })).toString('base64url')
  assert.throws(() => verifyToken(`${forged}.${sig}`, KEY, T0), /alterato/)
  assert.throws(() => verifyToken(`${body}.${sig}x`, KEY, T0), /alterato/)
  assert.throws(() => verifyToken(t, Buffer.from('altra-chiave'), T0), /alterato/)
  assert.throws(() => verifyToken('niente', KEY, T0), /non valido/)
  assert.equal(tokenHash(t), tokenHash(` ${t} `))
})

// ─── Tool, dall'anteprima alla creazione ─────────────────────────

test('flusso completo: anteprima non scrive, conferma crea una volta e apre il follow-up', async () => {
  const repo = fakeRepo()
  const d = deps(repo)
  const tools = createTools(d)

  const prev = await tools.anteprima_invio_campioni({ destinatario_id: TEV.id, tipo: 'misurazione', righe: LISTA })
  assert.match(textOf(prev), /ANTEPRIMA/)
  assert.match(textOf(prev), /Totale: 18 pezzi/)
  assert.equal(repo.calls.created.length, 0)
  assert.equal(repo.calls.audit.length, 0)

  const token = tokenOf(prev)
  const out = await tools.crea_invio_campioni({ confirmation_token: token })
  assert.match(textOf(out), /Invio creato/)
  assert.match(textOf(out), /creato da chat/)
  assert.equal(repo.calls.created.length, 1)
  assert.equal(repo.calls.created[0].hash, tokenHash(token))
  assert.equal(repo.calls.created[0].sh.connettore, 'claude')
  assert.equal(repo.calls.created[0].items.length, 3)
  assert.deepEqual(d._todo[0], { shipmentId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', clubName: TEV.name, open: true, dueDate: '2026-11-15', purpose: 'Set misure' })
})

test('conferma scaduta: rifiutata, niente scritto, traccia nel registro', async () => {
  const repo = fakeRepo()
  const d = deps(repo)
  const tools = createTools(d)
  const token = tokenOf(await tools.anteprima_invio_campioni({ destinatario_id: TEV.id, tipo: 'misurazione', righe: LISTA }))
  d._advance(TOKEN_TTL_MS + 1000)
  await assert.rejects(tools.crea_invio_campioni({ confirmation_token: token }), /scaduto/)
  assert.equal(repo.calls.created.length, 0)
  assert.equal(repo.calls.audit[0].outcome, 'rifiutato')
})

test('contenuto alterato dopo l\'anteprima: rifiutato', async () => {
  const repo = fakeRepo()
  const tools = createTools(deps(repo))
  const token = tokenOf(await tools.anteprima_invio_campioni({ destinatario_id: TEV.id, tipo: 'misurazione', righe: LISTA }))
  const [body, sig] = token.split('.')
  const p = JSON.parse(Buffer.from(body, 'base64url').toString())
  p.items[0].quantity = 50
  const altered = `${Buffer.from(JSON.stringify(p)).toString('base64url')}.${sig}`
  await assert.rejects(tools.crea_invio_campioni({ confirmation_token: altered }), /alterato/)
  assert.equal(repo.calls.created.length, 0)
})

test('destinatario rinominato o sparito dopo l\'anteprima: rifiutato', async () => {
  const repo = fakeRepo()
  const tools = createTools(deps(repo))
  const token = tokenOf(await tools.anteprima_invio_campioni({ destinatario_id: TEV.id, tipo: 'misurazione', righe: LISTA }))
  repo._recipients[TEV.id] = { ...repo._recipients[TEV.id], name: 'TEV SRL' }
  await assert.rejects(tools.crea_invio_campioni({ confirmation_token: token }), /cambiato/)
  delete repo._recipients[TEV.id]
  await assert.rejects(tools.crea_invio_campioni({ confirmation_token: token }), /non esiste più/)
  assert.equal(repo.calls.created.length, 0)
})

test('scrittura fallita nel database: errore chiaro, niente follow-up, registro "errore"', async () => {
  const repo = fakeRepo({ async createShipment() { throw new Error('value "99999999999" is out of range for type integer') } })
  const d = deps(repo)
  const tools = createTools(d)
  const token = tokenOf(await tools.anteprima_invio_campioni({ destinatario_id: TEV.id, tipo: 'misurazione', righe: LISTA }))
  await assert.rejects(tools.crea_invio_campioni({ confirmation_token: token }), /NON creato, nessun dato scritto/)
  assert.equal(d._todo.length, 0)
  assert.equal(repo.calls.audit[0].outcome, 'errore')
})

test('Todoist giù: l\'invio resta creato, con avviso', async () => {
  const repo = fakeRepo()
  const tools = createTools(deps(repo, { syncFollowUp: async () => { throw new Error('503') } }))
  const token = tokenOf(await tools.anteprima_invio_campioni({ destinatario_id: TEV.id, tipo: 'misurazione', righe: LISTA }))
  const out = await tools.crea_invio_campioni({ confirmation_token: token })
  assert.match(textOf(out), /Invio creato/)
  assert.match(textOf(out), /task Todoist non è stato aggiornato/)
})

test('destinatario_id non valido o inesistente', async () => {
  const tools = createTools(deps(fakeRepo()))
  await assert.rejects(tools.anteprima_invio_campioni({ destinatario_id: 'TEV', tipo: 'misurazione', righe: LISTA }), /non valido/)
  await assert.rejects(tools.anteprima_invio_campioni({ destinatario_id: '00000000-0000-4000-8000-000000000000', tipo: 'misurazione', righe: LISTA }), /non trovato/)
})

// ─── Protocollo ──────────────────────────────────────────────────

test('JSON-RPC: initialize, tools/list, notifiche, errori come risultato', async () => {
  const d = deps(fakeRepo())
  const init = await handleBody({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } }, d)
  assert.equal(init.result.protocolVersion, '2025-03-26')
  assert.ok(init.result.capabilities.tools)
  assert.equal(await handleBody({ jsonrpc: '2.0', method: 'notifications/initialized' }, d), null)
  const list = await handleBody({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, d)
  assert.deepEqual(list.result.tools.map(t => t.name), ['cerca_cliente', 'cerca_articolo', 'anteprima_invio_campioni', 'crea_invio_campioni', 'leggi_invio_campioni'])
  assert.equal(TOOLS.length, 5)
  const bad = await handleBody({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'crea_invio_campioni', arguments: { confirmation_token: 'x' } } }, d)
  assert.equal(bad.result.isError, true)
  assert.match(bad.result.content[0].text, /non valido/)
  const unknown = await handleBody({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'esegui_sql' } }, d)
  assert.equal(unknown.error.code, -32602)
  assert.equal((await handleBody({ jsonrpc: '2.0', id: 5, method: 'resources/list' }, d)).error.code, -32601)
})

test('accesso: codice nel percorso o bearer; senza o sbagliato = negato', () => {
  const keys = parseAccessKeys('claude:AAAAAAAAAAAAAAAAAAAAAAAAAAAA, chatgpt:BBBBBBBBBBBBBBBBBBBBBBBBBBBB, corto:123')
  assert.equal(keys.length, 2)
  assert.equal(authenticate({ query: { key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAA' }, headers: {} }, keys), 'claude')
  assert.equal(authenticate({ query: {}, headers: { authorization: 'Bearer BBBBBBBBBBBBBBBBBBBBBBBBBBBB' } }, keys), 'chatgpt')
  assert.equal(authenticate({ query: {}, headers: {} }, keys), null)
  assert.equal(authenticate({ query: { key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAB' }, headers: {} }, keys), null)
  assert.equal(authenticate({ query: { key: '123' }, headers: {} }, keys), null)
  assert.equal(authenticate({ query: { key: 'x' }, headers: {} }, []), null)
})
