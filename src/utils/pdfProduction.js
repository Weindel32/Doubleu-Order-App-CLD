import { getAllArticles, artPieceCount } from '../utils/helpers.js'
import { newPdf, C, pdfName, sizeGrids, sizeGridsCount } from '../lib/pdfKit.js'

// Scheda produzione per il laboratorio (uso interno) come PDF vero:
// niente link e data aggiunti dalla stampa del browser.
//
//   const blob = await buildProductionPdf(order)
//   await shareOrDownload(blob, productionPdfName(order))

export const productionPdfName = (order) => pdfName('Scheda produzione', order?.id, order?.client)

// Fasi da spuntare a mano in laboratorio
const PHASES = ['CRTM', 'TESS', 'TAGLIO', 'RIC/ST', 'CONF', 'PRONTO']

export async function buildProductionPdf(order) {
  const k = await newPdf(productionPdfName(order).replace(/\.pdf$/, ''))
  const { doc, M, R, W } = k
  const articles = getAllArticles(order)
  const totalPieces = articles.reduce((s, a) => s + artPieceCount(a), 0)

  k.header('ORDINE PRODUZIONE · USO INTERNO', order.id)

  // ── Club, data, pezzi e note di produzione ──
  k.sans().size(9)
  const notes = order.productionNotes ? k.wrap(order.productionNotes, R - M - 12) : []
  const bandH = 22 + (notes.length ? 12 + notes.length * 4.3 : 0)
  doc.setFillColor(C.BEIGE); doc.rect(0, 30, W, bandH, 'F')
  k.rule(30 + bandH, C.BORDER, 0.5, 0, W)
  k.fields([
    { label: 'CLUB', value: order.client || '', style: 'serif', min: 56 },
    { label: 'DATA', value: order.date || '' },
    { label: 'TOTALE PEZZI', value: String(totalPieces), style: 'big', min: 30 },
    { label: 'ARTICOLI', value: String(articles.length) },
  ], 38)
  if (notes.length) {
    const y = 52, h = 9 + notes.length * 4.3
    doc.setFillColor(C.WARM); doc.rect(M, y, R - M, h, 'F')
    doc.setFillColor(C.CLAY); doc.rect(M, y, 1, h, 'F')
    k.sans('bold').size(6.5).color(C.CLAY).spaced('NOTE PRODUZIONE', M + 5, y + 5, {}, 0.8)
    k.sans().size(9).color(C.NAVY); doc.text(notes, M + 5, y + 10, { lineHeightFactor: 1.4 })
  }
  k.y = 30 + bandH + 8

  // ── Articoli: taglie e fasi di lavorazione ──
  k.sans().size(6.5).color(C.MUTED).spaced('DETTAGLIO ARTICOLI E TAGLIE', M, k.y, {}, 1.2)
  k.rule(k.y + 3, C.RULE, 0.5); k.y += 8
  for (const art of articles) {
    const uni = art.sizes?.uni || 0
    const h = 14 + sizeGridsCount(art) * 13 + (uni > 0 ? 7 : 0) + 14
    k.ensure(h)
    let y = k.y + 5
    // Codice modello in evidenza, poi descrizione, categoria e linea, colore a destra
    k.sans('bold').size(7.5)
    const spW = Math.max(18, k.spacedWidth(art.sp || '—', 0.8) + 6)
    doc.setFillColor(C.NAVY); doc.rect(M, y - 4.2, spW, 6.5, 'F')
    k.color(C.CREAM).spaced(art.sp || '—', M + spW / 2, y, { align: 'center' }, 0.8)
    const x = M + spW + 5
    k.serif().size(14).color(C.NAVY).text(art.description || '—', x, y)
    k.sans().size(7).color(C.MUTED).spaced([art.category, art.line ? `Linea ${art.line}` : ''].filter(Boolean).join(' · '), x, y + 4.5, {}, 0.4)
    k.sans().size(6.2).color(C.MUTED).spaced('COLORE / PANTONE', R, y - 2.5, { align: 'right' }, 0.7)
    k.sans('bold').size(9.5).color(C.CLAY).text(art.color || '—', R, y + 2.5, { align: 'right' })
    y = sizeGrids(k, M, y + 8, art)
    if (uni > 0) { y += 1; k.sans().size(6.5).color('#4a9e6e').spaced('TAGLIA UNICA', M, y + 3.5, {}, 0.6); k.sans('bold').size(9).color(C.NAVY).text(String(uni), M + 22, y + 3.6); y += 6 }
    // Caselle delle fasi e totale pezzi dell'articolo
    y += 3
    let px = M
    doc.setLineWidth(0.25)
    for (const ph of PHASES) {
      k.sans().size(6.2)
      const w = k.spacedWidth(ph, 0.4) + 9
      doc.setDrawColor('#c8d0dd'); doc.roundedRect(px, y, w, 6, 0.8, 0.8)
      doc.setDrawColor(C.MUTED); doc.rect(px + 1.8, y + 1.6, 2.8, 2.8)
      k.color(C.NAVY).spaced(ph, px + 6, y + 4.2, {}, 0.4)
      px += w + 1.8
    }
    const tot = String(artPieceCount(art))
    k.sans('bold').size(10).color(C.NAVY).text(tot, R, y + 4.4, { align: 'right' })
    k.sans().size(7.5).color(C.MUTED).text('Totale pezzi articolo: ', R - doc.getTextWidth(tot) - 1, y + 4.4, { align: 'right' })
    k.y = y + 10
    k.rule(k.y - 2, '#f0ece4')
    k.y += 2
  }

  // ── Riepilogo finale: una riga per articolo e il totale ──
  const rowH = 7
  k.ensure(12 + Math.min(articles.length, 5) * rowH + 10)
  let top = k.y, y = top + 12
  const closeBox = () => { doc.setDrawColor(C.BORDER); doc.setLineWidth(0.3); doc.roundedRect(M, top, R - M, y - top, 2, 2) }
  doc.setFillColor(C.BEIGE); doc.rect(M, top, R - M, 12, 'F')
  k.sans().size(6.5).color(C.MUTED).spaced('RIEPILOGO FINALE', M + 6, top + 8, {}, 1.2)
  for (const a of articles) {
    if (y + rowH > k.BOTTOM) { closeBox(); doc.addPage(); top = k.M; y = top + 4 }
    doc.setFillColor(C.BEIGE); doc.rect(M, y - 1, R - M, rowH, 'F')
    k.sans().size(7).color(C.MUTED).spaced(a.sp || '—', M + 6, y + 3.5, {}, 0.5)
    k.sans().size(9).color(C.NAVY).text(a.description || '', M + 30, y + 3.5)
    const dw = doc.getTextWidth(a.description || '')
    k.sans().size(8).color(C.CLAY).text(a.color || '', M + 34 + dw, y + 3.5)
    k.serif().size(12).color(C.CLAY).text(`${artPieceCount(a)} pz`, R - 6, y + 4, { align: 'right' })
    y += rowH
  }
  if (y + 10 > k.BOTTOM) { closeBox(); doc.addPage(); top = k.M; y = top + 2 }
  doc.setFillColor(C.NAVY); doc.rect(M, y, R - M, 9, 'F')
  k.sans().size(6.5).color(C.GOLD).spaced('TOTALE ORDINE', M + 6, y + 6, {}, 1)
  k.serif().size(15).color(C.CREAM).text(`${totalPieces} pz`, R - 6, y + 6.5, { align: 'right' })
  y += 9
  closeBox()
  k.y = y + 4

  // Uso interno: niente sito, solo il promemoria
  k.footer('DOUBLEU · DOCUMENTO AD USO INTERNO', `${order.id || ''} · ${new Date().toLocaleDateString('it-IT')}`)
  return k.blob()
}
