import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { getAllArticles, artPieceCount } from '../utils/helpers.js'
import {
  PURPOSE_LABELS, OUTCOME_LABELS, fmtDate, recipientLabel,
  samplePieces, sampleGoodsValue, sampleShipping, sampleInvested,
} from './samples.js'

// Scarica una matrice di righe come CSV (BOM per Excel in locale italiano)
function downloadCSV(rows, filename) {
  const csv = rows.map(row =>
    row.map(cell => {
      const str = String(cell ?? '')
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  ).join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename
  document.body.appendChild(link); link.click(); document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Generates a CSV file and triggers download
export function exportSizesCSV(order) {
  const articles = getAllArticles(order)

  const rows = []

  // Header row 1: order info
  rows.push([
    `DOUBLEU - Export Taglie - ${order.id}`,
    '', '', '', '', '', '', '', '', '', '', '', '', '', ''
  ])
  rows.push([`Club: ${order.client}`, `Data: ${order.date}`, `Stato: ${order.status}`, '', '', '', '', '', '', '', '', '', '', '', ''])
  rows.push([]) // blank

  // For each article: a block with adult + kids rows
  articles.forEach(art => {
    const adultTotal = ADULT_SIZES.reduce((s, sz) => s + (art.sizes.adult?.[sz] || 0), 0)
    const kidsTotal  = KIDS_SIZES.reduce((s, sz)  => s + (art.sizes.kids?.[sz]  || 0), 0)
    const uniTotal   = art.sizes.uni || 0

    // Article header
    rows.push([`${art.sp}`, art.description, art.color, art.category, art.line, '', '', '', '', '', '', '', '', '', ''])

    // Adult sizes header
    rows.push(['', 'ADULTO', ...ADULT_SIZES, 'TOT ADULTO', '', 'BAMBINO', ...KIDS_SIZES, 'TOT BAMBINO', 'TAGLIA UNICA', 'TOTALE'])

    // Values row
    const adultVals = ADULT_SIZES.map(sz => art.sizes.adult?.[sz] ?? 0)
    const kidsVals  = KIDS_SIZES.map(sz  => art.sizes.kids?.[sz]  ?? 0)
    rows.push(['', 'pz', ...adultVals, adultTotal, '', 'pz', ...kidsVals, kidsTotal, uniTotal, adultTotal + kidsTotal + uniTotal])
    
    rows.push([]) // spacer
  })

  // Summary
  rows.push(['RIEPILOGO', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
  rows.push(['Articolo', 'SP', 'Colore', 'Tot Adulto', 'Tot Bambino', 'Tot Taglia Unica', 'Totale'])
  articles.forEach(art => {
    const adultTotal = ADULT_SIZES.reduce((s, sz) => s + (art.sizes.adult?.[sz] || 0), 0)
    const kidsTotal  = KIDS_SIZES.reduce((s, sz)  => s + (art.sizes.kids?.[sz]  || 0), 0)
    const uniTotal   = art.sizes.uni || 0
    rows.push([art.description, art.sp, art.color, adultTotal, kidsTotal, uniTotal, adultTotal + kidsTotal + uniTotal])
  })
  rows.push(['', '', 'TOTALE ORDINE', '', '', '', order.pieces])

  // Convert to CSV string
  const csv = rows.map(row =>
    row.map(cell => {
      const str = String(cell ?? '')
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  ).join('\n')

  // BOM for Excel Italian locale
  const bom  = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `DOUBLEU_${order.id}_taglie.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Summary CSV across all orders
export function exportAllOrdersCSV(orders) {
  const rows = []
  rows.push(['DOUBLEU - Export Archivio Ordini', '', '', '', '', '', '', ''])
  rows.push(['Generato il', new Date().toLocaleDateString('it-IT'), '', '', '', '', '', ''])
  rows.push([])
  rows.push(['Codice', 'Cliente', 'Data', 'Consegna', 'Stato', 'Pezzi', 'Totale €', 'Pagato €', 'Sospeso €'])

  orders.forEach(o => {
    const paid    = (o.payments || []).filter(p => p.paid).reduce((s, p)  => s + p.amount, 0)
    const pending = (o.payments || []).filter(p => !p.paid).reduce((s, p) => s + p.amount, 0)
    rows.push([o.id, o.client, o.date, o.deliveryDate || '', o.status, o.pieces,
      o.total ?? '', paid.toFixed(2), pending.toFixed(2)])
  })

  const csv  = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = `DOUBLEU_Archivio_${new Date().toLocaleDateString('it-IT').replace(/\//g,'-')}.csv`
  document.body.appendChild(link); link.click(); document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Registro campionature: una riga per articolo inviato, cos\u00EC il file \u00E8
// filtrabile in Excel sia per cliente sia per codice DUSP.
export function exportSamplesCSV(shipments, clients = [], prospects = []) {
  const rows = []
  rows.push(['DOUBLEU - Registro Campionature'])
  rows.push(['Generato il', new Date().toLocaleDateString('it-IT')])
  rows.push([])
  rows.push([
    'Data invio', 'Destinatario', 'Tipo', 'Referente', 'Motivo',
    'Codice DUSP', 'Descrizione', 'Colore', 'Taglia', 'Q.t\u00E0',
    'Valore un. \u20AC', 'Valore riga \u20AC', 'Reso richiesto', 'Rientrato',
    'Corriere', 'Tracking', 'Esito', 'Ordine collegato', 'Note',
  ])

  const sorted = [...(shipments || [])].sort((a, b) => (b.shipped_date || '').localeCompare(a.shipped_date || ''))

  sorted.forEach(sh => {
    const base = [
      fmtDate(sh.shipped_date),
      recipientLabel(sh, clients, prospects),
      sh.prospect_id ? 'Prospect' : sh.client_id ? 'Cliente' : 'Altro',
      sh.contact_name || '',
      PURPOSE_LABELS[sh.purpose] || sh.purpose || '',
    ]
    const tail = [
      sh.return_required ? 'S\u00EC' : 'No',
      sh.returned_date ? fmtDate(sh.returned_date) : '',
      sh.carrier || '',
      sh.tracking || '',
      OUTCOME_LABELS[sh.outcome] || sh.outcome || '',
      sh.outcome_order_id || '',
      sh.notes || '',
    ]
    const items = (sh.items || [])
    if (items.length === 0) {
      rows.push([...base, '', '', '', '', 0, '', '', ...tail])
      return
    }
    items.forEach(it => {
      const qty  = parseInt(it.quantity) || 0
      const unit = parseFloat(it.unit_value) || 0
      rows.push([
        ...base,
        it.sp || '', it.description || '', it.color || '', it.size || '', qty,
        unit.toFixed(2), (qty * unit).toFixed(2),
        sh.return_required ? 'S\u00EC' : 'No',
        it.returned ? 'S\u00EC' : (sh.return_required ? 'No' : '\u2014'),
        ...tail.slice(2),
      ])
    })
  })

  // Riepilogo per destinatario
  rows.push([])
  rows.push(['RIEPILOGO PER DESTINATARIO'])
  rows.push(['Destinatario', 'Invii', 'Pezzi', 'Valore merce \u20AC', 'Spedizioni \u20AC', 'Investito \u20AC'])

  const byRecipient = {}
  sorted.forEach(sh => {
    const key = recipientLabel(sh, clients, prospects)
    if (!byRecipient[key]) byRecipient[key] = { count: 0, pieces: 0, goods: 0, shipping: 0, invested: 0 }
    const r = byRecipient[key]
    r.count    += 1
    r.pieces   += samplePieces(sh)
    r.goods    += sampleGoodsValue(sh)
    r.shipping += sampleShipping(sh)
    r.invested += sampleInvested(sh)
  })

  Object.entries(byRecipient)
    .sort((a, b) => b[1].invested - a[1].invested)
    .forEach(([name, r]) => rows.push([
      name, r.count, r.pieces, r.goods.toFixed(2), r.shipping.toFixed(2), r.invested.toFixed(2),
    ]))

  downloadCSV(rows, `DOUBLEU_Campionature_${new Date().toLocaleDateString('it-IT').replace(/\//g, '-')}.csv`)
}
