import { getAllArticles, artPieceCount } from '../utils/helpers.js'
import { newPdf, C, pdfName, sizeGrids, sizeGridsCount } from '../lib/pdfKit.js'

// Bolla di consegna (anche parziale: solo gli articoli scelti) come PDF vero:
// niente link e data aggiunti dalla stampa del browser.
//
//   const blob = await buildDeliveryPdf(order, articoliSpediti)
//   await shareOrDownload(blob, deliveryPdfName(order))

export const deliveryPdfName = (order) => pdfName('Bolla di consegna', order?.id, order?.client)

export async function buildDeliveryPdf(order, selectedArticles = null) {
  const k = await newPdf(deliveryPdfName(order).replace(/\.pdf$/, ''))
  const { doc, M, R, W } = k
  const articles = selectedArticles ?? getAllArticles(order)
  const totalPieces = articles.reduce((s, a) => s + artPieceCount(a), 0)

  k.header('BOLLA DI CONSEGNA', order.id)

  // ── Destinatario, data, colli ──
  const city = order.clientCity ? order.clientCity + (order.clientCountry ? ', ' + order.clientCountry : '') : ''
  const bandH = city ? 26 : 22
  doc.setFillColor(C.BEIGE); doc.rect(0, 30, W, bandH, 'F')
  k.rule(30 + bandH, C.BORDER, 0.5, 0, W)
  k.fields([
    { label: 'DESTINATARIO', value: order.client || '', style: 'serif', min: 56 },
    { label: 'DATA CONSEGNA', value: order.deliveryDate || new Date().toLocaleDateString('it-IT') },
    { label: 'TOTALE COLLI', value: `${totalPieces} pz`, style: 'big', min: 34 },
    { label: 'ARTICOLI', value: String(articles.length) },
  ], 38)
  if (city) k.sans().size(8).color('#666666').text(city, M, 49.5)
  k.y = 30 + bandH + 8

  // ── Dettaglio merce: un riquadro per articolo, mai spezzato tra due pagine ──
  k.sans().size(6.5).color(C.MUTED).spaced('DETTAGLIO MERCE', M, k.y, {}, 1.2)
  k.rule(k.y + 3, C.BORDER, 0.3); k.y += 8
  for (const art of articles) {
    const uni = art.sizes?.uni || 0
    k.sans().size(8)
    const notes = art.notes ? k.wrap(art.notes, R - M - 60) : []
    const grids = sizeGridsCount(art)
    const h = 18 + notes.length * 3.8 + grids * 13 + (uni > 0 ? 7 : 0) + 5
    k.ensure(h + 4)
    const top = k.y
    doc.setDrawColor('#e0e0e0'); doc.setLineWidth(0.3); doc.roundedRect(M, top, R - M, h, 1.5, 1.5)
    const x = M + 5, xr = R - 5
    k.serif().size(14).color(C.NAVY).text(art.description || '—', x, top + 7)
    k.sans().size(7).color('#888888').spaced(art.category || '', x, top + 11.5, {}, 0.4)
    if (notes.length) { k.sans().size(8).color(C.TEXT); doc.text(notes, x, top + 15.5, { lineHeightFactor: 1.3 }) }
    k.sans().size(6.2).color('#888888').spaced('COLORE', xr, top + 5, { align: 'right' }, 0.7)
    k.sans('bold').size(9).color(C.CLAY).text(art.color || '—', xr, top + 9.5, { align: 'right' })
    k.serif().size(16).color(C.NAVY).text(`${artPieceCount(art)} pz`, xr, top + 16, { align: 'right' })
    let y = sizeGrids(k, x, top + 18 + notes.length * 3.8, art)
    if (uni > 0) { y += 1; k.sans().size(6.5).color('#4a9e6e').spaced('TAGLIA UNICA', x, y + 3.5, {}, 0.6); k.sans('bold').size(9).color(C.NAVY).text(String(uni), x + 22, y + 3.6) }
    k.y = top + h + 4
  }

  // ── Riepilogo: una riga per articolo e il totale ──
  const rowH = 7
  const boxH = 12 + articles.length * rowH + 10
  k.ensure(Math.min(boxH, 60) + 4)
  let top = k.y, y = top + 12
  const closeBox = () => { doc.setDrawColor(C.BORDER); doc.setLineWidth(0.3); doc.roundedRect(M, top, R - M, y - top + 2, 2, 2) }
  doc.setFillColor(C.BEIGE); doc.rect(M, top, R - M, 12, 'F')
  k.sans().size(6.5).color(C.MUTED).spaced('RIEPILOGO', M + 6, top + 8, {}, 1.2)
  for (const a of articles) {
    if (y + rowH > k.BOTTOM) { closeBox(); doc.addPage(); top = k.M; y = top + 4 }
    doc.setFillColor(C.BEIGE); doc.rect(M, y - 1, R - M, rowH, 'F')
    k.sans().size(9).color(C.NAVY).text(a.description || '', M + 6, y + 3.5)
    const dw = doc.getTextWidth(a.description || '')
    k.sans().size(8).color(C.CLAY).text(a.color || '', M + 10 + dw, y + 3.5)
    k.serif().size(12).color(C.NAVY).text(`${artPieceCount(a)} pz`, R - 6, y + 4, { align: 'right' })
    y += rowH
  }
  if (y + 10 > k.BOTTOM) { closeBox(); doc.addPage(); top = k.M; y = top + 2 }
  doc.setFillColor(C.NAVY); doc.rect(M, y, R - M, 9, 'F')
  k.sans().size(6.5).color(C.GOLD).spaced('TOTALE', M + 6, y + 6, {}, 1)
  k.serif().size(15).color(C.CREAM).text(`${totalPieces} pz`, R - 6, y + 6.5, { align: 'right' })
  y += 9
  doc.setDrawColor(C.BORDER); doc.setLineWidth(0.3); doc.roundedRect(M, top, R - M, y - top, 2, 2)
  k.y = y + 6

  // ── Ricevuta merce ──
  const signH = 28
  k.ensure(signH)
  doc.setDrawColor(C.BORDER); doc.setLineWidth(0.3); doc.roundedRect(M, k.y, R - M, signH, 2, 2)
  k.sans().size(6.5).color(C.MUTED).spaced('RICEVUTA MERCE', M + 6, k.y + 8, {}, 1.2)
  const colW = (R - M - 12 - 2 * 10) / 3
  ;['DATA RICEZIONE', 'NOME E COGNOME', 'FIRMA'].forEach((lab, i) => {
    const x = M + 6 + i * (colW + 10)
    k.sans().size(6.2).color(C.MUTED).spaced(lab, x, k.y + 15, {}, 0.6)
    k.rule(k.y + 23, '#aaaaaa', 0.3, x, x + colW)
  })
  k.y += signH + 4

  k.footer('DOUBLEU · MADE IN ITALY · DOUBLEUTENNIS.COM', `${order.id || ''} · ${new Date().toLocaleDateString('it-IT')}`)
  return k.blob()
}
