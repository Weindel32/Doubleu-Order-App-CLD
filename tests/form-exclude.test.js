import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lineSizes, linePieces } from '../src/lib/formStatus.js'
import { catalogUnavailable } from '../src/data/productCatalog.js'

test('LS427: taglie non prodotte dal catalogo', () => {
  assert.deepEqual(catalogUnavailable('LS427'), { kids: ['6', '10', '14'], adult: ['XS'] })
  assert.deepEqual(catalogUnavailable(' ls 427 '), { kids: ['6', '10', '14'], adult: ['XS'] })
  assert.equal(catalogUnavailable('LS428'), null)
  assert.equal(catalogUnavailable(''), null)
})

test('lineSizes toglie le taglie escluse, linePieces non le conta', () => {
  const line = { key: 'l0', grids: ['kids', 'adult'], exclude: { kids: ['6', '10', '14'], adult: ['XS'] } }
  assert.deepEqual(lineSizes(line, 'kids'), ['4', '8', '12', '16'])
  assert.deepEqual(lineSizes(line, 'adult'), ['S', 'M', 'L', 'XL', 'XXL'])
  const sizes = { l0: { kids: { 4: 1, 6: 5 }, adult: { XS: 3, M: 2 } } }
  assert.equal(linePieces(line, sizes), 3)
  assert.deepEqual(lineSizes({ grids: ['kids'] }, 'kids'), ['4', '6', '8', '10', '12', '14', '16'])
})
