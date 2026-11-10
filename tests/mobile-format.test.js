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
