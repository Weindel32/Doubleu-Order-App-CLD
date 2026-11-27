import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyDeliveryUpdate } from '../src/utils/helpers.js'
import { assembleOrders } from '../src/lib/orderModel.js'

const order = {
  id: 'DU-1', status: 'CONSEGNA PARZIALE', shippedDate: null, deliveries: [],
  kits: [{ articles: [
    { id: 'a1', description: 'Polo', delivered: false, notes: 'non salvata' },
    { id: 'a2', description: 'Felpa', delivered: false },
    { id: 'tmp', description: 'Nuovo', delivered: false },
  ] }],
}

test('spedizione: segna spediti solo gli articoli registrati e tiene le modifiche locali', () => {
  const next = { id: 'DU-1', status: 'CONSEGNA PARZIALE', shippedDate: '26/11/2026',
    deliveries: [{ id: 'd1', date: '26/11/2026', articles: ['a1'] }],
    kits: [{ articles: [{ id: 'a1', delivered: true }, { id: 'a2', delivered: false }] }] }
  const out = applyDeliveryUpdate(order, next)
  const arts = out.kits[0].articles
  assert.deepEqual(arts.map(a => a.delivered), [true, false, false])
  assert.equal(arts[0].notes, 'non salvata')
  assert.equal(out.shippedDate, '26/11/2026')
  assert.equal(out.deliveries.length, 1)
})

test('spedizione: un altro ordine resta invariato', () => {
  const other = { ...order, id: 'DU-2' }
  assert.equal(applyDeliveryUpdate(other, { id: 'DU-1', kits: [] }), other)
})

test('spedizione: il registro arriva dal database, vuoto se assente', () => {
  const [o] = assembleOrders([{ id: 'DU-1', date: '01/01/2026' }], [], [], [])
  assert.deepEqual(o.deliveries, [])
  const [p] = assembleOrders([{ id: 'DU-1', date: '01/01/2026', deliveries: [{ id: 'd1', date: '26/11/2026', articles: [] }] }], [], [], [])
  assert.equal(p.deliveries[0].date, '26/11/2026')
})
