import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { getAllArticles, artPieceCount } from '../utils/helpers.js'
import { italianDay } from '../lib/production.js'
import { loadFonts } from '../lib/sizesPdf.js'

// Riepilogo per il club: articoli, colori, taglie e quantita' da verificare e confermare prima
// della produzione. Niente prezzi, niente codici interni. PDF vero generato nel browser (jsPDF):
// non passa dalla stampa, quindi niente link, data e titolo aggiunti da Safari/Chrome.
//
//   const blob = await buildRecapPdf(order, sizesSubmittedAt)
//   await shareOrDownload(blob, recapPdfName(order))

const NAVY = '#1a2744', CREAM = '#f5f0e8', GOLD = '#b8965a', CLAY = '#c4623a'
const MUTED = '#8a9ab5', BEIGE = '#f8f5f0', BORDER = '#e0d8cc', RULE = '#eee6da'

export const recapPdfName = (order) =>
  ['Riepilogo ordine', order?.id, order?.client].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]/g, '') + '.pdf'

// Solo le taglie ordinate: piu' facile da controllare.
const usedSizes = (sizes, values) => sizes.filter(sz => (parseInt(values?.[sz]) || 0) > 0)

// La data dell'ordine per il club e' quella in cui ci ha mandato le taglie (submitted_at del modulo);
// senza modulo resta la data dell'ordine.
export async function buildRecapPdf(order, sizesSubmittedAt = null) {
  const [{ jsPDF }, fonts] = await Promise.all([import('jspdf'), loadFonts()])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  for (const f of fonts) { doc.addFileToVFS(f.file, f.data); doc.addFont(f.file, f.family, f.style) }
  doc.setProperties({ title: recapPdfName(order).replace(/\.pdf$/, ''), author: 'DOUBLEU' })

  const W = 210, H = 297, M = 16, R = W - M, BOTTOM = H - 16
  const sans = (style = 'normal') => doc.setFont('Josefin', style)
  const serif = () => doc.setFont('Cormorant', 'normal')
  const spaced = (txt, x, y, opts = {}, cs = 0.6) => { doc.setCharSpace(cs); doc.text(txt, x, y, opts); doc.setCharSpace(0) }

  const orderDate = sizesSubmittedAt ? italianDay(sizesSubmittedAt).split('-').reverse().join('/') : order.date
  const articles = getAllArticles(order)
  const totalPieces = articles.reduce((s, a) => s + artPieceCount(a), 0)
  const kits = (order.kits || []).filter(k => (k.articles || []).length)
  const showKits = kits.length > 1 || kits.some(k => k.name)

  // ── Intestazione ──
  doc.setFillColor(NAVY); doc.rect(0, 0, W, 30, 'F')
  serif(); doc.setFontSize(22); doc.setTextColor(CREAM); spaced('DOUBLEU', M, 15, {}, 2)
  sans(); doc.setFontSize(6.5); doc.setTextColor(GOLD); spaced('MADE IN ITALY · PREMIUM CLUBWEAR', M, 21.5)
  spaced('RIEPILOGO ORDINE · DA CONFERMARE', R, 12.5, { align: 'right' })
  serif(); doc.setFontSize(17); doc.setTextColor(CREAM); spaced(order.id || '', R, 21.5, { align: 'right' }, 0.8)

  // ── Club, data, totale e istruzioni ──
  sans(); doc.setFontSize(8.6)
  const intro = doc.splitTextToSize(
    "Vi chiediamo di verificare articoli, colori, taglie e quantità riportati qui sotto. Se è tutto corretto, confermate rispondendo al messaggio o firmando in fondo: la produzione parte dopo la vostra conferma. Eventuali correzioni vanno segnalate prima dell'avvio della produzione.",
    R - M)
  const note = order.orderNote ? doc.splitTextToSize(`Nota: ${order.orderNote}`, R - M) : []
  const bandH = 26 + intro.length * 4.2 + (note.length ? 2 + note.length * 4.2 : 0) + 5
  doc.setFillColor(BEIGE); doc.rect(0, 30, W, bandH, 'F')
  doc.setDrawColor(BORDER); doc.setLineWidth(0.5); doc.line(0, 30 + bandH, W, 30 + bandH)
  const label = (txt, x, y) => { sans(); doc.setFontSize(6.2); doc.setTextColor(MUTED); spaced(txt, x, y, {}, 0.7) }
  label('CLUB', M, 38); serif(); doc.setFontSize(15); doc.setTextColor(NAVY); doc.text(order.client || '', M, 45)
  const clubW = Math.max(60, doc.getTextWidth(order.client || '') + 12)
  label('DATA ORDINE', M + clubW, 38); sans('bold'); doc.setFontSize(10); doc.setTextColor(NAVY); doc.text(orderDate || '', M + clubW, 45)
  label('TOTALE CAPI', M + clubW + 40, 38); serif(); doc.setFontSize(20); doc.setTextColor(CLAY); doc.text(String(totalPieces), M + clubW + 40, 46)
  sans(); doc.setFontSize(8.6); doc.setTextColor(NAVY)
  doc.text(intro, M, 54, { lineHeightFactor: 1.45 })
  if (note.length) doc.text(note, M, 56 + intro.length * 4.2, { lineHeightFactor: 1.45 })

  let y = 30 + bandH + 8
  const newPage = () => { doc.addPage(); y = M }

  // ── Articoli ──
  const CELL = 13, LAB = 22, ROW = 10
  const gridsOf = (art) => [
    ['ADULTO', usedSizes(ADULT_SIZES, art.sizes?.adult), art.sizes?.adult, sz => sz],
    ['BAMBINO', usedSizes(KIDS_SIZES, art.sizes?.kids), art.sizes?.kids, sz => `${sz} ANNI`],
  ].filter(([, used]) => used.length)
  const articleH = (art) => {
    const g = gridsOf(art).length
    return 12 + (g ? g * ROW : 0) + ((art.sizes?.uni || 0) > 0 ? 5 : 0) + (!g && !(art.sizes?.uni > 0) ? 5 : 0) + 6
  }
  const KIT_H = 10

  const drawArticle = (art) => {
    const pieces = artPieceCount(art)
    serif(); doc.setFontSize(13); doc.setTextColor(NAVY); doc.text(art.description || art.category || '', M, y + 5)
    sans(); doc.setFontSize(7); doc.setTextColor(MUTED)
    const meta = [art.category, art.color ? `Colore ${art.color}` : null].filter(Boolean).join(' · ')
    doc.text(meta, M, y + 9.5)
    // "Totale 50 pz" allineato a destra
    doc.setFontSize(7.5); doc.text('pz', R, y + 5, { align: 'right' })
    const pzW = doc.getTextWidth('pz') + 1.2
    sans('bold'); doc.setFontSize(11); doc.setTextColor(NAVY); doc.text(String(pieces), R - pzW, y + 5, { align: 'right' })
    const numW = doc.getTextWidth(String(pieces)) + 1.5
    sans(); doc.setFontSize(7.5); doc.setTextColor(MUTED); doc.text('Totale', R - pzW - numW, y + 5, { align: 'right' })
    let gy = y + 12
    doc.setDrawColor(BORDER); doc.setLineWidth(0.2)
    for (const [name, used, values, sizeLabel] of gridsOf(art)) {
      doc.setFillColor(BEIGE); doc.rect(M, gy, LAB, ROW, 'FD')
      sans(); doc.setFontSize(6); doc.setTextColor(MUTED); spaced(name, M + 2.5, gy + 6, {}, 0.6)
      used.forEach((sz, i) => {
        const x = M + LAB + i * CELL
        doc.rect(x, gy, CELL, ROW)
        sans(); doc.setFontSize(5.6); doc.setTextColor(MUTED); doc.text(sizeLabel(sz), x + CELL / 2, gy + 3.6, { align: 'center' })
        sans('bold'); doc.setFontSize(10); doc.setTextColor(NAVY); doc.text(String(parseInt(values[sz]) || 0), x + CELL / 2, gy + 8.3, { align: 'center' })
      })
      const tx = M + LAB + used.length * CELL
      doc.setFillColor(BEIGE); doc.rect(tx, gy, CELL, ROW, 'FD')
      sans(); doc.setFontSize(5.6); doc.setTextColor(MUTED); doc.text('TOT', tx + CELL / 2, gy + 3.6, { align: 'center' })
      sans('bold'); doc.setFontSize(10); doc.setTextColor(CLAY)
      doc.text(String(used.reduce((s, sz) => s + (parseInt(values[sz]) || 0), 0)), tx + CELL / 2, gy + 8.3, { align: 'center' })
      gy += ROW
    }
    const uni = art.sizes?.uni || 0
    if (uni > 0) { sans(); doc.setFontSize(8); doc.setTextColor(NAVY); doc.text(`Taglia unica: ${uni}`, M, gy + 4); gy += 5 }
    if (!gridsOf(art).length && !uni) { sans(); doc.setFontSize(8); doc.setTextColor(CLAY); doc.text('Taglie da definire', M, gy + 4); gy += 5 }
    doc.setDrawColor(RULE); doc.setLineWidth(0.3); doc.line(M, gy + 3, R, gy + 3)
    y = gy + 6
  }

  kits.forEach((kit, k) => {
    kit.articles.forEach((art, i) => {
      const withKit = i === 0 && showKits
      // Nome e prospetto taglie (e il nome del kit col suo primo articolo) sempre sulla stessa pagina.
      const need = articleH(art) + (withKit ? KIT_H + (k ? 4 : 0) : 0)
      if (y + need > BOTTOM) newPage()
      if (withKit) {
        if (k && y > M) y += 4
        sans('bold'); doc.setFontSize(8); doc.setTextColor(NAVY); spaced((kit.name || 'Articoli').toUpperCase(), M, y + 4, {}, 1)
        sans(); doc.setFontSize(7.5); doc.setTextColor(MUTED)
        doc.text(`${kit.articles.reduce((s, a) => s + artPieceCount(a), 0)} pz`, R, y + 4, { align: 'right' })
        doc.setDrawColor(NAVY); doc.setLineWidth(0.5); doc.line(M, y + 6.5, R, y + 6.5)
        y += KIT_H
      }
      drawArticle(art)
    })
  })

  // ── Conferma del club ──
  const boxH = 36
  if (y + 6 + boxH > BOTTOM) newPage()
  y += 6
  doc.setDrawColor(NAVY); doc.setLineWidth(0.3); doc.roundedRect(M, y, R - M, boxH, 2, 2)
  sans('bold'); doc.setFontSize(7); doc.setTextColor(NAVY); spaced('CONFERMA DEL CLUB', M + 6, y + 8, {}, 1)
  sans(); doc.setFontSize(9); doc.text(`Confermo articoli, colori, taglie e quantità per un totale di ${totalPieces} capi.`, M + 6, y + 15)
  const fields = [['NOME E COGNOME', 70], ['DATA', 35], ['FIRMA', 0]]
  let fx = M + 6
  const fw = R - M - 12 - 20
  fields.forEach(([lab, w]) => {
    const width = w || (fw - 70 - 35)
    sans(); doc.setFontSize(6.5); doc.setTextColor(MUTED); spaced(lab, fx, y + 23, {}, 0.6)
    doc.setDrawColor(MUTED); doc.setLineWidth(0.2); doc.line(fx, y + 30, fx + width, y + 30)
    fx += width + 10
  })

  // ── Piede di ogni pagina ──
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    sans(); doc.setFontSize(6.5); doc.setTextColor(MUTED)
    spaced('DOUBLEU · RIEPILOGO SENZA PREZZI', M, H - 8, {}, 0.8)
    doc.text(`${order.id || ''} · pagina ${p} di ${pages}`, R, H - 8, { align: 'right' })
  }

  return doc.output('blob')
}
