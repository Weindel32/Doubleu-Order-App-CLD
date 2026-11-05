// Test degli strumenti di lettura del connettore MCP: node --test
process.env.TZ = 'Europe/Rome'

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assembleOrders, assembleShipments } from '../src/lib/orderModel.js'
import { buildTodo } from '../src/lib/todo.js'
import { orderTotal } from '../src/utils/helpers.js'
import { createReadTools, READ_TOOLS } from '../api/_mcp-read.js'
import { handleBody } from '../api/_mcp-server.js'
import { UserError } from '../api/_mcp-logic.js'

// Date relative a oggi: le regole dell'app (consegne, scadenze) leggono
// l'orologio vero, quindi i dati di prova si spostano con lui.
const day = (offset) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offset); return d }
const it = (offset) => { const d = day(offset); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }
const iso = (offset) => { const d = day(offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const CLIENTS = [
  { id: 'c1', name: 'TENNIS ECO VILLAGE', city: "Cava de'Tirreni", country: 'Italia', email: 'info@tev.it' },
  { id: 'c2', name: 'PADEL ROMA', city: 'Roma', country: 'Italia' },
]
const order = (id, client, clientId, over = {}) => ({
  id, client, client_id: clientId, date: it(-20), delivery_date: it(10), status: 'CONFERMATO', pieces: 10,
  pricing_mode: 'singolo', iva_enabled: true, iva_rate: 22, shipping: 0, discount_mode: 'ordine', discount_value: 0,
  alert_days: 7, order_type: 'istituzionale', ...over,
})
const ROWS = {
  orders: [
    order('DU-2026-1001', 'TENNIS ECO VILLAGE', 'c1', { delivery_date: it(3), status: 'IN PRODUZIONE' }),
    order('DU-2026-1002', 'TENNIS ECO VILLAGE', 'c1', { date: it(-90), delivery_date: it(-60), status: 'CONSEGNATO', actual_delivery_date: it(-60) }),
    order('DU-2026-1003', 'PADEL ROMA', 'c2', { status: 'PREVENTIVO', date: it(-30), delivery_date: null }),
    order('DU-2026-1004', 'PADEL ROMA', 'c2', { status: 'PREVENTIVO', date: it(-40), lost: true }),
  ],
  kits: [
    { id: 'k1', order_id: 'DU-2026-1001', name: 'Kit Scuola', position: 0 },
    { id: 'k2', order_id: 'DU-2026-1002', name: 'Polo', position: 0 },
    { id: 'k3', order_id: 'DU-2026-1003', name: '', position: 0 },
  ],
  articles: [
    { id: 'a1', kit_id: 'k1', sp: 'DUSP 139', description: 'Polo', color: 'Blu', price: 20, sizes_adult: { M: 5, L: 5 }, sizes_kids: {} },
    { id: 'a2', kit_id: 'k1', sp: 'DUSP 33', description: 'Short', color: 'Bianco', price: 15, sizes_adult: {}, sizes_kids: {} },
    { id: 'a3', kit_id: 'k2', description: 'Polo', price: 25, sizes_adult: { S: 4 }, sizes_kids: { 10: 2 } },
    { id: 'a4', kit_id: 'k3', description: 'Felpa', price: 40, sizes_adult: { __qty: 30 }, sizes_kids: {} },
  ],
  payments: [
    { id: 'p1', order_id: 'DU-2026-1001', type: 'acconto', amount: 50, date: it(-5), paid: false, due_mode: 'fissa' },
    { id: 'p2', order_id: 'DU-2026-1001', type: 'saldo', amount: 100, date: it(6), paid: false, due_mode: 'fissa' },
    { id: 'p3', order_id: 'DU-2026-1002', type: 'saldo', amount: 183, date: it(-60), paid: true, paid_date: it(-58), due_mode: 'fissa' },
  ],
  shipments: [
    { id: 's1', client_id: 'c1', recipient_name: 'TENNIS ECO VILLAGE', shipped_date: iso(-20), purpose: 'misurazione', return_required: true, return_due_date: iso(-2), sample_items: [{ id: 'i1', description: 'Felpa', quantity: 5, outcome: 'in_attesa', position: 0 }] },
    { id: 's2', client_id: 'c2', recipient_name: 'PADEL ROMA', shipped_date: iso(-3), purpose: 'valutazione', sample_items: [{ id: 'i2', description: 'Polo', quantity: 1, outcome: 'positivo', position: 0 }] },
  ],
}

function snapshot() {
  return {
    orders: assembleOrders(ROWS.orders, ROWS.kits, ROWS.payments, ROWS.articles),
    forms: {},
    shipments: assembleShipments(ROWS.shipments),
    clients: CLIENTS,
    prospects: [{ id: 'p1', name: 'CIRCOLO NUOVO', city: 'Bari' }],
  }
}
const tools = createReadTools({ repo: { snapshot: async () => snapshot() } })
const out = (r) => r.content[0].text.split('\n\nDati:')[0]

test('modello ordini: totali come nell\'app (IVA, taglie, pezzi stimati)', () => {
  const { orders } = snapshot()
  const o1 = orders.find(o => o.id === 'DU-2026-1001')
  assert.equal(orderTotal(o1), 10 * 20 * 1.22)
  const q = orders.find(o => o.id === 'DU-2026-1003')
  assert.equal(orderTotal(q), 30 * 40 * 1.22)
  assert.equal(orders[0].id, 'DU-2026-1001')
})

test('lista da fare: credito scaduto, consegna vicina, taglie mancanti, preventivo fermo, reso scaduto', () => {
  const s = snapshot()
  const todo = buildTodo({ ...s, now: Date.now() })
  const kinds = todo.map(t => `${t.prio}:${t.kind}:${t.target.type}:${t.target.id}`)
  assert.deepEqual(kinds, [
    '1:Credito scaduto:order:DU-2026-1001',
    '2:Consegna:order:DU-2026-1001',
    '3:Taglie mancanti:order:DU-2026-1001',
    '3:Reso scaduto:sample:s1',
    '4:Preventivo fermo:quote:DU-2026-1003',
  ])
})

test('panoramica: conteggi e fatturato', async () => {
  const t = out(await tools.panoramica())
  assert.match(t, /Confermati: 2 ordini/)
  assert.match(t, /Preventivi: 2 come nel Dashboard \(contati anche i persi\) · aperti 1/)
  assert.match(t, /In produzione: 1/)
  assert.match(t, /Da fare: 5/)
})

test('scadenze: lista da fare + consegne, rate e resi in arrivo', async () => {
  const t = out(await tools.scadenze({ giorni: 14 }))
  assert.match(t, /\[URGENTE\] Credito scaduto: TENNIS ECO VILLAGE · DU-2026-1001/)
  assert.match(t, /CONSEGNE NEI PROSSIMI 14 GIORNI: 1/)
  assert.match(t, new RegExp(`RATE IN SCADENZA NEI PROSSIMI 14 GIORNI: 1\\n- ${it(6).replace(/\//g, '\\/')}`))
  assert.match(t, /RESI CAMPIONI ATTESI NEI PROSSIMI 14 GIORNI: 0/)
})

test('cerca_ordini: filtri cliente, stato, tipo; errori chiari', async () => {
  assert.match(out(await tools.cerca_ordini({})), /^2 ordini:/)
  assert.match(out(await tools.cerca_ordini({ cliente: 'eco vilage' })), /^2 ordini:/)
  assert.match(out(await tools.cerca_ordini({ stato: 'in produzione' })), /^1 ordine:\n- DU-2026-1001/)
  assert.match(out(await tools.cerca_ordini({ tipo: 'preventivi' })), /^2 preventivi:/)
  assert.match(out(await tools.cerca_ordini({ cliente: 'milano' })), /Nessun ordine/)
  await assert.rejects(tools.cerca_ordini({ stato: 'spedito' }), UserError)
})

test('leggi_ordine: per numero corto, taglie, rate scadute, taglie mancanti', async () => {
  const t = out(await tools.leggi_ordine({ numero: '1001' }))
  assert.match(t, /^Ordine DU-2026-1001 · TENNIS ECO VILLAGE · IN PRODUZIONE/)
  assert.match(t, /DUSP 139 · Polo · Blu · 10 pz · € 20,00\/pz · M:5 L:5/)
  assert.match(t, /Short · Bianco · 0 pz · € 15,00\/pz · TAGLIE MANCANTI/)
  assert.match(t, /acconto € 50,00 · scadenza .* · SCADUTA da 5 gg/)
  assert.match(t, /Taglie mancanti su: Short/)
  await assert.rejects(tools.leggi_ordine({ numero: '9999' }), /Nessun ordine/)
})

test('preventivi_aperti: esclude i persi', async () => {
  const t = out(await tools.preventivi_aperti({}))
  assert.match(t, /^1 preventivo aperto/)
  assert.match(t, /DU-2026-1003 · PADEL ROMA .* fermo da 30 gg/)
  assert.doesNotMatch(t, /1004/)
})

test('scheda_cliente: fatturato, profilo pagatore, prospect e ambiguità', async () => {
  const t = out(await tools.scheda_cliente({ cliente: 'tennis eco village' }))
  assert.match(t, /Ordini confermati: 2/)
  assert.match(t, /SCADUTO € 50,00/)
  assert.match(t, /Campionature: 1/)
  await assert.rejects(tools.scheda_cliente({ cliente: 'circolo nuovo' }), /c'è come prospect: CIRCOLO NUOVO/)
  await assert.rejects(tools.scheda_cliente({ cliente: 'milano tennis arena' }), /Nessun cliente/)
})

test('elenca_invii_campioni: filtri e cliente', async () => {
  assert.match(out(await tools.elenca_invii_campioni({})), /^2 invii/)
  const r = out(await tools.elenca_invii_campioni({ filtro: 'resi_scaduti' }))
  assert.match(r, /^1 invio/)
  assert.match(r, /RESO SCADUTO/)
  assert.match(out(await tools.elenca_invii_campioni({ cliente: 'padel' })), /PADEL ROMA · Valutazione/)
  await assert.rejects(tools.elenca_invii_campioni({ filtro: 'boh' }), UserError)
})

test('protocollo: i nuovi strumenti sono elencati e in sola lettura', async () => {
  assert.ok(READ_TOOLS.every(t => t.annotations.readOnlyHint === true))
  const deps = { repo: { snapshot: async () => snapshot() }, signingKey: Buffer.from('k'), today: () => iso(0) }
  const list = await handleBody({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, deps)
  const names = list.result.tools.map(t => t.name)
  for (const n of ['panoramica', 'scadenze', 'cerca_ordini', 'leggi_ordine', 'preventivi_aperti', 'scheda_cliente', 'elenca_invii_campioni']) assert.ok(names.includes(n), n)
  assert.ok(!names.some(n => /sql|elimina|modifica|aggiorna/.test(n)))
  const call = await handleBody({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'leggi_ordine', arguments: { numero: 'xx' } } }, deps)
  assert.equal(call.result.isError, true)
})
