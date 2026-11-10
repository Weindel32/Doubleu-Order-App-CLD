import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eur2 } from '../src/mobile/format.js'

test('eur2: importi in formato italiano', () => {
  assert.equal(eur2(1552), '€1.552,00')
  assert.equal(eur2(1893.444), '€1.893,44')
  assert.equal(eur2(1234567.5), '€1.234.567,50')
  assert.equal(eur2(0), '€0,00')
  assert.equal(eur2('x'), '€0,00')
  assert.equal(eur2(-93.4), '−€93,40')
})

import { intlPhone } from '../src/lib/phone.js'
test('intlPhone: numeri per WhatsApp', () => {
  assert.equal(intlPhone('333 123 4567'), '393331234567')
  assert.equal(intlPhone('+39 333 1234567'), '393331234567')
  assert.equal(intlPhone('0041 79 123 45 67'), '41791234567')
  assert.equal(intlPhone(''), '')
})
