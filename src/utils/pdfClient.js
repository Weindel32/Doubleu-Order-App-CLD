import { getAllArticles, artPieceCount, orderSubtotal, orderIVA, orderShipping, orderDiscount, orderTotal,
         artDiscountApplied, kitDiscountApplied } from '../utils/helpers.js'
import { newPdf, C, eur, pdfName, clientBand, sizeGrids, sizeGridsCount, paragraphBox, priceBox, totals, totalsHeight } from '../lib/pdfKit.js'

// Conferma d'ordine per il club (PDF cliente) come PDF vero: niente link e data aggiunti dalla stampa.
//
//   const blob = await buildClientPdf(order)
//   await shareOrDownload(blob, clientPdfName(order))

export const clientPdfName = (order) => pdfName('Conferma ordine', order?.id, order?.client)

const CONDITIONS = [
  ['1. Oggetto', 'Le presenti condizioni regolano la vendita di prodotti personalizzati a marchio DOUBLEU. Tutti i prodotti sono realizzati su richiesta e personalizzati secondo le specifiche approvate dal cliente.'],
  ['2. Conferma dell\'Ordine', 'L\'ordine si considera confermato al verificarsi congiunto di: firma del presente documento, approvazione grafica definitiva, versamento dell\'acconto previsto.'],
  ['3. Produzione e Tempistiche', 'I tempi decorrono dalla data di conferma definitiva. Le tempistiche sono indicative e possono variare per cause di forza maggiore.'],
  ['4. Prodotti Personalizzati', 'Non è previsto diritto di recesso. Non è possibile annullare l\'ordine dopo l\'avvio della produzione. Non sono accettati resi per errori di taglia comunicati dal cliente.'],
  ['5. Pagamenti', 'Acconto al momento della conferma, saldo alla consegna, salvo accordi diversi.'],
  ['6. Foro Competente', 'Per ogni controversia è competente il Foro di Salerno.'],
]

export async function buildClientPdf(order) {
  const k = await newPdf(clientPdfName(order).replace(/\.pdf$/, ''))
  const { doc, M, R } = k
  const articles = getAllArticles(order)
  const isKit = order.pricingMode === 'kit'
  const persone = (order.kits || []).reduce((s, kt) => s + (parseInt(kt.quantity) || parseInt(order.kitQuantity) || 0), 0)

  k.header('CONFERMA ORDINE', order.id)
  clientBand(k, order, [
    { label: 'CLUB', value: order.client || '', style: 'serif', min: 50 },
    { label: 'DATA ORDINE', value: order.date || '' },
    ...(order.invoiceNumber ? [{ label: 'RIF. FATTURA', value: order.invoiceNumber }] : []),
    { label: 'TOTALE PEZZI', value: String(order.pieces ?? articles.reduce((s, a) => s + artPieceCount(a), 0)), style: 'big', min: 26 },
    ...(isKit ? [{ label: 'TOTALE PERSONE', value: String(persone), style: 'big', min: 26 }] : []),
    { label: 'STATO', value: order.status || '', style: 'clay' },
  ], { noteTitle: 'NOTA ORDINE' })

  // ── Dettaglio articoli: taglie e quantità ──
  k.sans().size(6.5).color(C.MUTED).spaced('DETTAGLIO ARTICOLI', M, k.y, {}, 1.2)
  k.rule(k.y + 3, C.RULE, 0.5); k.y += 8
  for (const art of articles) {
    const uni = art.sizes?.uni || 0
    const h = 12 + sizeGridsCount(art) * 13 + (uni > 0 ? 7 : 0) + 10
    k.ensure(h)
    let y = k.y + 5
    k.serif().size(14).color(C.NAVY).text(art.description || '—', M, y)
    k.sans().size(6.2).color(C.MUTED).spaced('COLORE', R, y - 2.5, { align: 'right' }, 0.7)
    k.sans('bold').size(9).color(C.CLAY).text(art.color || '—', R, y + 2, { align: 'right' })
    y += 4.5; k.sans().size(7).color(C.MUTED).spaced(art.category || '', M, y, {}, 0.3)
    y = sizeGrids(k, M, y + 3, art)
    if (uni > 0) { y += 1; k.sans().size(6.5).color('#4a9e6e').spaced('TAGLIA UNICA', M, y + 3.5, {}, 0.6); k.sans('bold').size(9).color(C.NAVY).text(String(uni), M + 22, y + 3.6); y += 6 }
    y += 4.5
    const omTxt = (art.omaggio || 0) > 0 ? `di cui ${art.omaggio} pz in omaggio` : ''
    if (omTxt) k.sans('bold').size(7.5).color(C.CLAY).text(omTxt, R, y, { align: 'right' })
    const totTxt = String(artPieceCount(art))
    const off = omTxt ? doc.getTextWidth(omTxt) + 4 : 0
    k.sans('bold').size(8.5).color(C.NAVY).text(totTxt, R - off, y, { align: 'right' })
    k.sans().size(7.5).color(C.MUTED).text('Totale pezzi: ', R - off - doc.getTextWidth(totTxt) - 1, y, { align: 'right' })
    k.y = y + 3
    k.rule(k.y, '#f0ece4')
    k.y += 3
  }
  k.y += 2

  // ── Prezzi ──
  const inX = M + 7, inR = R - 7, leftW = inR - inX - 60
  const rows = []
  if (isKit) {
    for (const kit of order.kits || []) {
      const qty = parseInt(kit.quantity) || parseInt(order.kitQuantity) || 0
      const kitTotal = (parseFloat(kit.price) || 0) * qty
      const disc = kitDiscountApplied(order, kit)
      const om = (kit.articles || []).filter(a => (a.omaggio || 0) > 0).map(a => `${a.description} (${a.omaggio} pz)`).join(', ')
      k.sans().size(8)
      const subL = k.wrap((kit.articles || []).map(a => a.description).join(' + '), leftW)
      const omL = om ? k.wrap('In omaggio: ' + om, leftW) : []
      const staff = parseFloat(kit.omaggio) || 0
      const h = Math.max(8 + subL.length * 3.9 + omL.length * 3.6 + (staff > 0 ? 4 : 0), disc > 0 ? 22 : 18) + 4
      rows.push([h, (y) => {
        k.serif().size(15).color(C.NAVY).text(kit.name || 'Kit', inX, y + 5)
        let ly = y + 5
        if (subL.length) { ly += 4.6; k.sans().size(8).color(C.SOFT); doc.text(subL, inX, ly, { lineHeightFactor: 1.35 }); ly += (subL.length - 1) * 3.9 }
        if (omL.length) { ly += 4; k.sans().size(7.5).color(C.CLAY); doc.text(omL, inX, ly); ly += (omL.length - 1) * 3.6 }
        if (staff > 0) { ly += 4; k.sans().size(7.5).color(C.CLAY).text(`+ ${staff} kit in omaggio`, inX, ly) }
        k.sans().size(6.2).color(C.MUTED).spaced('PREZZO KIT × N° PERSONE', inR, y + 2.5, { align: 'right' }, 0.6)
        k.serif().size(14).color(C.CLAY).text(`${eur(kit.price)} × ${qty} pers.`, inR, y + 8, { align: 'right' })
        let ry = y + 8
        if (disc > 0) { ry += 4; k.sans().size(7).color(C.CLAY).text(`sconto${kit.discountType !== 'importo' ? ` ${parseFloat(kit.discountValue) || 0}%` : ''} − ${eur(disc)}`, inR, ry, { align: 'right' }) }
        ry += 4.5; k.sans('bold').size(8.5).color(C.NAVY).text(`= ${eur(kitTotal - disc)}`, inR, ry, { align: 'right' })
      }])
    }
  } else {
    for (const a of articles) {
      const pz = artPieceCount(a)
      const price = parseFloat(a.price) || 0
      const disc = artDiscountApplied(order, a)
      rows.push([disc > 0 ? 22 : 18, (y) => {
        k.serif().size(13).color(C.NAVY).text(a.description || '', inX, y + 5)
        k.sans().size(7).color(C.MUTED).text([a.category, a.color].filter(Boolean).join(' · '), inX, y + 9.5)
        if ((a.omaggio || 0) > 0) k.sans().size(7).color(C.CLAY).text(`${a.omaggio} pz in omaggio`, inX, y + 13.5)
        k.sans().size(6.2).color(C.MUTED).spaced('PREZZO UNITARIO', inR, y + 2.5, { align: 'right' }, 0.6)
        k.serif().size(14).color(C.CLAY).text(`${eur(price)} × ${pz} pz`, inR, y + 8, { align: 'right' })
        let ry = y + 8
        if (disc > 0) { ry += 4; k.sans().size(7).color(C.CLAY).text(`sconto${a.discountType !== 'importo' ? ` ${parseFloat(a.discountValue) || 0}%` : ''} − ${eur(disc)}`, inR, ry, { align: 'right' }) }
        ry += 4.5; k.sans('bold').size(8.5).color(C.NAVY).text(`= ${eur(price * pz - disc)}`, inR, ry, { align: 'right' })
      }])
    }
  }
  // Totali solo se l'ordine li vuole nel PDF del cliente
  const subtotal = orderSubtotal(order), discAmt = orderDiscount(order), ivaAmt = orderIVA(order), shipAmt = orderShipping(order)
  const totRows = order.showTotalInClientPDF ? [
    [discAmt > 0 ? 'SUBTOTALE' : 'IMPONIBILE', eur(subtotal)],
    ...(discAmt > 0 ? [
      [order.discountMode === 'articolo' ? 'SCONTO TOTALE' : 'SCONTO' + (order.discountType === 'percentuale' ? ` ${parseFloat(order.discountValue) || 0}%` : ''), '− ' + eur(discAmt), C.CLAY],
      ['IMPONIBILE', eur(subtotal - discAmt)],
    ] : []),
    ...(order.ivaEnabled ? [[`IVA ${order.ivaRate || 22}%`, eur(ivaAmt)]] : []),
    ...(shipAmt > 0 ? [['SPEDIZIONE', eur(shipAmt)]] : []),
  ] : []
  priceBox(k, isKit ? 'COMPOSIZIONE KIT E PREZZI' : 'PREZZI PER ARTICOLO', rows,
    totRows.length ? 6 + totalsHeight(totRows) : 0,
    (y) => totals(k, y + 4, totRows, 'TOTALE' + (order.ivaEnabled ? ' IVA INCL.' : ''), eur(orderTotal(order)), C.NAVY))

  // ── Condizioni e firma ──
  paragraphBox(k, 'CONDIZIONI GENERALI DI VENDITA', CONDITIONS)
  const signH = 36
  k.ensure(signH + 4); k.y += 4
  doc.setDrawColor(C.BORDER); doc.setLineWidth(0.3); doc.roundedRect(M, k.y, R - M, signH, 2, 2)
  k.sans().size(6.5).color(C.MUTED).spaced('FIRMA PER ACCETTAZIONE', M + 6, k.y + 8, {}, 1.2)
  const colW = (R - M - 12 - 14) / 2
  ;[['LUOGO E DATA', ''], ['FIRMA DEL CLIENTE', 'Per accettazione condizioni e ordine']].forEach(([lab, sub], i) => {
    const x = M + 6 + i * (colW + 14)
    k.sans().size(6.5).color(C.MUTED).spaced(lab, x, k.y + 16, {}, 0.6)
    k.rule(k.y + 27, '#aaaaaa', 0.3, x, x + colW)
    if (sub) k.sans().size(6.5).color('#aaaaaa').text(sub, x, k.y + 31)
  })
  k.y += signH + 4

  k.footer('DOUBLEU · MADE IN ITALY · DOUBLEUTENNIS.COM', `${order.id || ''} · ${new Date().toLocaleDateString('it-IT')}`)
  return k.blob()
}
