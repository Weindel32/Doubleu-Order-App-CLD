import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { getAllArticles, artPieceCount } from '../data/mockData.js'

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

    // Article header
    rows.push([`${art.sp}`, art.description, art.color, art.category, art.line, '', '', '', '', '', '', '', '', '', ''])
    
    // Adult sizes header
    rows.push(['', 'ADULTO', ...ADULT_SIZES, 'TOT ADULTO', '', 'BAMBINO', ...KIDS_SIZES, 'TOT BAMBINO', 'TOTALE'])
    
    // Values row
    const adultVals = ADULT_SIZES.map(sz => art.sizes.adult?.[sz] ?? 0)
    const kidsVals  = KIDS_SIZES.map(sz  => art.sizes.kids?.[sz]  ?? 0)
    rows.push(['', 'pz', ...adultVals, adultTotal, '', 'pz', ...kidsVals, kidsTotal, adultTotal + kidsTotal])
    
    rows.push([]) // spacer
  })

  // Summary
  rows.push(['RIEPILOGO', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
  rows.push(['Articolo', 'SP', 'Colore', 'Tot Adulto', 'Tot Bambino', 'Totale'])
  articles.forEach(art => {
    const adultTotal = ADULT_SIZES.reduce((s, sz) => s + (art.sizes.adult?.[sz] || 0), 0)
    const kidsTotal  = KIDS_SIZES.reduce((s, sz)  => s + (art.sizes.kids?.[sz]  || 0), 0)
    rows.push([art.description, art.sp, art.color, adultTotal, kidsTotal, adultTotal + kidsTotal])
  })
  rows.push(['', '', 'TOTALE ORDINE', '', '', order.pieces])

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
