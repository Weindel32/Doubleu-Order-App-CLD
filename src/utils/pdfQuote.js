import { orderSubtotal, orderIVA, orderDiscount, orderTotal, artDiscountApplied, kitDiscountApplied, kitBillableQty, grossUnitPrice } from '../utils/helpers.js'
import { paymentTermsLines } from './negotiation.js'
import { newPdf, C, eur, pdfName } from '../lib/pdfKit.js'

// Preventivo per il club, come PDF vero (jsPDF): niente link e data aggiunti dalla stampa del browser.
//
//   const blob = await buildQuotePdf(order)
//   await shareOrDownload(blob, quotePdfName(order))

export const quotePdfName = (order) => pdfName('Preventivo', order?.id, order?.client)

// Articoli del kit su una riga: capi uguali raggruppati (Short ×2), colore
// tra parentesi quando c'è, così due capi uguali di colore diverso restano distinti.
function kitArticlesLine(kit) {
  const groups = []
  for (const a of kit.articles || []) {
    const desc = String(a.description || '').trim()
    if (!desc) continue
    const label = desc + (a.color ? ' (' + String(a.color).trim() + ')' : '')
    const g = groups.find(x => x.label === label)
    if (g) g.n++
    else groups.push({ label, n: 1 })
  }
  return groups.map(g => g.label + (g.n > 1 ? ' ×' + g.n : '')).join(' + ')
}

// Un blocco "kit" con un solo articolo è un articolo venduto da solo (es.
// la felpa per tutti): nel PDF va chiamato articolo, non kit.
const isSingleArticle = (kit) => (kit.articles || []).filter(a => String(a.description || '').trim()).length <= 1
const normTxt = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ')

const ADULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const KIDS_SIZES  = ['4', '6', '8', '10', '12', '14', '16']
const sumOf = (sizes, vals) => sizes.reduce((s, sz) => s + (parseInt(vals?.[sz]) || 0), 0)
const artSizeTotal = (art) => sumOf(ADULT_SIZES, art.sizes?.adult) + sumOf(KIDS_SIZES, art.sizes?.kids) + (art.sizes?.uni || 0)

export async function buildQuotePdf(order) {
  const k = await newPdf(quotePdfName(order).replace(/\.pdf$/, ''))
  const { doc, M, R } = k
  const kits = order.kits || []
  const articles = kits.flatMap(kt => kt.articles || [])
  const subtotal = orderSubtotal(order)
  const discAmt  = orderDiscount(order)
  const ivaAmt   = orderIVA(order)
  const total    = orderTotal(order)
  const anyHasSizes = articles.some(a => artSizeTotal(a) > 0)
  const isKit = order.pricingMode === 'kit'

  // A kit: quanti kit propone il preventivo (non il totale persone, che sarebbe una stima non confermata).
  const nSingle = isKit ? kits.filter(isSingleArticle).length : 0
  const allSingle = isKit && nSingle === kits.length
  const noSingle  = isKit && nSingle === 0

  k.header('PREVENTIVO', order.id)

  // ── Fascia club ──
  const details = [
    ['REFERENTE', order.clientContact], ['EMAIL', order.clientEmail], ['TELEFONO', order.clientPhone],
    ['CITTÀ', order.clientCity ? order.clientCity + (order.clientCountry ? ', ' + order.clientCountry : '') : ''],
  ].filter(([, v]) => v)
  k.sans().size(9)
  const noteLines = order.orderNote ? k.wrap(order.orderNote, R - M - 10) : []
  const notesLines = order.notes ? k.wrap(order.notes, R - M - 10) : []
  const bandH = 22 + (details.length ? 13 : 0) + (noteLines.length ? 10 + noteLines.length * 4.3 : 0) + (notesLines.length ? 8 + notesLines.length * 4.3 : 0)
  doc.setFillColor(C.WARM); doc.rect(0, 30, k.W, bandH, 'F')
  k.rule(30 + bandH, C.BORDER, 0.5, 0, k.W)
  k.fields([
    { label: 'CLUB', value: order.client || '', style: 'serif', min: 60 },
    { label: 'DATA PREVENTIVO', value: order.date || '' },
    { label: isKit ? (allSingle ? 'ARTICOLI PROPOSTI' : noSingle ? 'KIT PROPOSTI' : 'PROPOSTE') : 'N° ARTICOLI', value: String(isKit ? kits.length : articles.length), style: 'big', min: 36 },
    { label: 'STATO', value: 'PREVENTIVO', style: 'clay' },
  ], 38)
  let y = 52
  if (details.length) {
    let x = M
    for (const [lab, val] of details) {
      k.label(lab, x, y); k.sans().size(9).color(C.NAVY).text(val, x, y + 5)
      x += Math.max(32, doc.getTextWidth(val) + 10)
    }
    y += 13
  }
  if (noteLines.length) {
    const h = 8 + noteLines.length * 4.3
    doc.setFillColor('#ffffff'); doc.rect(M, y, R - M, h, 'F')
    doc.setFillColor(C.CLAY); doc.rect(M, y, 1, h, 'F')
    k.sans().size(6.2).color(C.CLAY).spaced('NOTA PREVENTIVO', M + 5, y + 4.5, {}, 0.7)
    k.sans().size(9).color(C.NAVY); doc.text(noteLines, M + 5, y + 9, { lineHeightFactor: 1.4 })
    y += h + 2
  }
  if (notesLines.length) {
    const h = 5 + notesLines.length * 4.3
    doc.setFillColor('#ffffff'); doc.setDrawColor(C.BORDER); doc.setLineWidth(0.2); doc.roundedRect(M, y, R - M, h, 1.5, 1.5, 'FD')
    k.sans().size(9).color(C.NAVY); doc.text(notesLines, M + 5, y + 5.5, { lineHeightFactor: 1.4 })
  }
  k.y = 30 + bandH + 8

  // ── Articoli (solo a prezzo singolo: a kit sono già elencati sotto ogni kit) ──
  if (!isKit) {
    k.sans().size(6.5).color(C.MUTED).spaced('ARTICOLI DEL PREVENTIVO', M, k.y, {}, 1.2)
    k.rule(k.y + 3, C.RULE, 0.5); k.y += 8
    if (!anyHasSizes) {
      k.sans().size(7.5)
      const banner = 'Le taglie specifiche verranno definite in fase di conferma ordine.'
      doc.setFillColor(C.WARM); doc.rect(M, k.y, R - M, 8, 'F'); doc.setFillColor(C.CLAY); doc.rect(M, k.y, 0.8, 8, 'F')
      k.color(C.GOLD).text(banner, M + 4, k.y + 5.2); k.y += 12
    }
    for (const art of articles) drawArticle(k, art)
  }

  // ── Prezzi ──
  drawPricing(k, order, { isKit, allSingle, noSingle, articles, subtotal, discAmt, ivaAmt, total })

  // ── Note e validità ──
  const paras = [
    ['Validità del preventivo', 'Il presente preventivo ha validità 30 giorni dalla data di emissione.'],
    ...(paymentTermsLines(order.negotiation).length ? [['Condizioni di pagamento', paymentTermsLines(order.negotiation).join(' · ') + '.']] : []),
    ['Conferma dell\'ordine', 'L\'ordine si considera confermato solo al ricevimento della conferma scritta, approvazione grafica definitiva e versamento dell\'acconto o saldo concordato.'],
    ...(anyHasSizes ? [] : [['Prodotti personalizzati', 'I prodotti sono realizzati su misura. Le taglie definitive saranno indicate in fase di conferma ordine.']]),
  ]
  k.sans().size(8)
  const paraLines = paras.map(([b, t]) => k.wrap(`${b} — ${t}`, R - M - 12))
  const boxH = 12 + paraLines.reduce((s, l) => s + l.length * 4.2 + 2, 0)
  k.ensure(boxH + 4); k.y += 4
  doc.setDrawColor(C.BORDER); doc.setLineWidth(0.3); doc.roundedRect(M, k.y, R - M, boxH, 2, 2)
  k.sans().size(6.5).color(C.MUTED).spaced('NOTE E VALIDITÀ', M + 6, k.y + 7, {}, 1.2)
  let py = k.y + 13
  paras.forEach(([bold], i) => {
    paraLines[i].forEach((line, j) => {
      if (j === 0) {
        // Prima riga: titolo in grassetto, poi il testo
        const head = bold + ' — '
        k.sans('bold').size(8).color(C.TEXT).text(head, M + 6, py)
        const w = doc.getTextWidth(head)
        k.sans().text(line.slice(head.length), M + 6 + w, py)
      } else k.sans().size(8).color(C.TEXT).text(line, M + 6, py)
      py += 4.2
    })
    py += 2
  })
  k.y += boxH + 4

  k.footer('DOUBLEU · MADE IN ITALY · DOUBLEUTENNIS.COM', `${order.id || ''} · ${new Date().toLocaleDateString('it-IT')}`)
  return k.blob()
}

// Articolo con codice, colore, note, omaggio e griglia taglie completa (zeri in grigio).
function drawArticle(k, art) {
  const { doc, M, R } = k
  const adult = art.sizes?.adult || {}, kids = art.sizes?.kids || {}, uni = art.sizes?.uni || 0
  const grids = [
    sumOf(ADULT_SIZES, adult) > 0 && ['ADULTO', ADULT_SIZES, adult],
    sumOf(KIDS_SIZES, kids) > 0 && ['BAMBINO', KIDS_SIZES, kids],
  ].filter(Boolean)
  const x = M + 26, w = R - x
  k.sans().size(7.5)
  const notes = art.notes ? k.wrap(art.notes, w) : []
  const tot = artSizeTotal(art)
  const h = 14 + (art.color ? 4.5 : 0) + notes.length * 3.8 + ((art.omaggio || 0) > 0 ? 7 : 0)
    + grids.length * 13 + (uni > 0 ? 7 : 0) + (tot > 0 ? 6 : 0) + 4
  k.ensure(h)
  let y = k.y + 5
  doc.setFillColor('#f0ece4'); doc.rect(M, y - 4, 22, 6.5, 'F')
  k.sans('bold').size(7).color(C.NAVY).spaced(art.sp || '—', M + 11, y, { align: 'center' }, 0.5)
  k.serif().size(13).color(C.NAVY).text(art.description || '—', x, y)
  y += 4.5; k.sans().size(7).color(C.MUTED).spaced(art.category || '', x, y, {}, 0.3)
  if (art.color) { y += 4.5; k.sans('bold').size(8).color(C.CLAY).text(art.color, x, y) }
  if (notes.length) { y += 4; k.sans().size(7.5).color(C.MUTED); doc.text(notes, x, y, { lineHeightFactor: 1.3 }); y += (notes.length - 1) * 3.8 }
  if ((art.omaggio || 0) > 0) {
    y += 3; doc.setDrawColor(C.CLAY); doc.setFillColor(C.WARM); doc.setLineWidth(0.2); doc.rect(x, y, 34, 5.5, 'FD')
    k.sans('bold').size(6.5).color(C.CLAY).spaced(`OMAGGIO: ${art.omaggio} PZ`, x + 2, y + 3.8, {}, 0.6); y += 5.5
  }
  y += 3
  const cw = 11, lw = 18
  for (const [name, sizes, vals] of grids) {
    const cells = [name, ...sizes, 'TOT']
    doc.setDrawColor(C.BORDER); doc.setLineWidth(0.2)
    cells.forEach((c, i) => {
      const cx = i === 0 ? x : x + lw + (i - 1) * cw, ww = i === 0 ? lw : cw, last = i === cells.length - 1
      doc.setFillColor(last ? C.WARM : '#f0ece4'); doc.rect(cx, y, ww, 6, 'FD')
      doc.setFillColor(last ? C.WARM : '#ffffff'); doc.rect(cx, y + 6, ww, 6.5, 'FD')
      k.sans(i === 0 ? 'bold' : 'normal').size(6).color(i === 0 ? C.NAVY : C.MUTED).text(c, cx + ww / 2, y + 4.1, { align: 'center' })
      if (i > 0) {
        const v = last ? sumOf(sizes, vals) : (parseInt(vals[c]) || 0)
        k.serif().size(11).color(last ? C.CLAY : v > 0 ? C.NAVY : C.DIM).text(String(v), cx + ww / 2, y + 11, { align: 'center' })
      }
    })
    y += 13
  }
  if (uni > 0) { y += 1; k.sans().size(6.5).color('#4a9e6e').spaced('TAGLIA UNICA', x, y + 3.5, {}, 0.6); k.sans('bold').size(9).color(C.NAVY).text(String(uni), x + 22, y + 3.6); y += 6 }
  if (tot > 0) { y += 2; k.sans().size(6.5).color(C.CLAY).spaced(`TOTALE PEZZI: ${tot}`, x, y + 2, {}, 0.6); y += 4 }
  k.y = y + 4
  k.rule(k.y - 2, '#f0ece4')
}

function drawPricing(k, order, { isKit, allSingle, noSingle, articles, subtotal, discAmt, ivaAmt, total }) {
  const { doc, M, R } = k
  const inX = M + 7, inR = R - 7, rightW = 48, leftW = inR - inX - rightW - 6
  const title = isKit ? (allSingle ? 'ARTICOLI E PREZZI' : noSingle ? 'COMPOSIZIONE KIT E PREZZI' : 'KIT, ARTICOLI E PREZZI') : 'PREZZI PER ARTICOLO'

  // Righe da disegnare: [altezza, funzione che disegna a partire da y]
  const rows = []
  if (isKit) {
    // Con IVA il prezzo al club è quello IVA inclusa: è il numero deciso nel Kit Builder.
    const ivaTxt = order.ivaEnabled ? 'IVA inclusa' : 'IVA esclusa'
    for (const kit of order.kits) {
      const list = parseFloat(kit.price) || 0
      const billable = kitBillableQty(order, kit)
      const staff = parseFloat(kit.omaggio) || 0
      const single = isSingleArticle(kit)
      let sub = kitArticlesLine(kit)
      // Articolo singolo: la sottoriga ripeterebbe il nome, si mostra solo se dice altro
      if (single && normTxt(kit.articles?.[0]?.description) === normTxt(kit.name)) sub = ''
      const kDisc = kitDiscountApplied(order, kit)
      const net = grossUnitPrice(order, kDisc > 0 && billable > 0 ? list - kDisc / billable : list)
      const omaggio = (kit.articles || []).filter(a => (a.omaggio || 0) > 0).map(a => a.description).join(', ')
      const qty = billable > 0 ? `Quantità stimata indicata dal club: ${billable}` + (staff > 0 ? ` · + ${staff}${single ? ' in omaggio allo staff' : ' kit staff in omaggio'}` : '') : ''
      k.sans().size(8)
      const subL = k.wrap(sub, leftW)
      const omL = omaggio ? k.wrap('In omaggio: ' + omaggio, leftW) : []
      const h = Math.max(8 + subL.length * 3.9 + omL.length * 3.6 + (qty ? 5 : 0), kDisc > 0 ? 20 : 16) + 6
      rows.push([h, (y) => {
        k.serif().size(15).color(C.NAVY).text(kit.name || 'Kit', inX, y + 5)
        let ly = y + 5
        if (subL.length) { ly += 4.6; k.sans().size(8).color(C.SOFT); doc.text(subL, inX, ly, { lineHeightFactor: 1.35 }); ly += (subL.length - 1) * 3.9 }
        if (omL.length) { ly += 4; k.sans().size(7.5).color(C.CLAY); doc.text(omL, inX, ly); ly += (omL.length - 1) * 3.6 }
        if (qty) { ly += 5; k.sans().size(7.2).color(C.MUTED).text(qty, inX, ly) }
        k.sans().size(6.2).color(C.MUTED).spaced(single ? 'PREZZO' : 'PREZZO KIT', inR, y + 2.5, { align: 'right' }, 0.7)
        k.serif().size(18).color(C.CLAY).text(eur(net), inR, y + 9, { align: 'right' })
        k.sans().size(7).color(C.MUTED).text(ivaTxt, inR, y + 13, { align: 'right' })
        if (kDisc > 0) {
          const old = eur(grossUnitPrice(order, list))
          const tail = kit.discountType !== 'importo' ? ` · sconto ${parseFloat(kit.discountValue) || 0}%` : ' · scontato'
          k.sans().size(7).color(C.MUTED).text(old + tail, inR, y + 17, { align: 'right' })
          const tw = doc.getTextWidth(tail), ow = doc.getTextWidth(old)
          doc.setDrawColor(C.MUTED); doc.setLineWidth(0.2); doc.line(inR - tw - ow, y + 16, inR - tw, y + 16)
        }
      }])
    }
  } else {
    for (const a of articles) {
      const sizesQty = artSizeTotal(a)
      const qty = sizesQty > 0 ? sizesQty : (parseInt(a.estimatedQty) || 0)
      const price = parseFloat(a.price) || 0
      const disc = artDiscountApplied(order, a)
      rows.push([qty ? (disc > 0 ? 22 : 18) : 14, (y) => {
        k.serif().size(13).color(C.NAVY).text(a.description || '', inX, y + 5)
        k.sans().size(7).color(C.MUTED).text([a.category, a.color].filter(Boolean).join(' · '), inX, y + 9.5)
        k.sans().size(6.2).color(C.MUTED).spaced(qty ? `PREZZO × ${sizesQty > 0 ? 'PEZZI DA TAGLIE' : 'QUANTITÀ STIMATA'}` : 'PREZZO UNITARIO', inR, y + 2.5, { align: 'right' }, 0.6)
        k.serif().size(14).color(C.CLAY).text(qty ? `${eur(price)} × ${qty} pz` : eur(price), inR, y + 8, { align: 'right' })
        let ry = y + 8
        if (qty && disc > 0) {
          ry += 4; k.sans().size(7).color(C.CLAY).text(`sconto${a.discountType !== 'importo' ? ` ${parseFloat(a.discountValue) || 0}%` : ''} − ${eur(disc)}`, inR, ry, { align: 'right' })
        }
        if (qty) { ry += 4.5; k.sans('bold').size(8.5).color(C.NAVY).text(`= ${eur(price * qty - disc)}`, inR, ry, { align: 'right' }) }
      }])
    }
  }

  // Coda: condizioni d'ordine (a kit) o totali (a prezzo singolo) e nota in corsivo
  const tail = []
  if (isKit) {
    if (order.discountMode !== 'nessuno' && order.discountMode !== 'articolo' && (parseFloat(order.discountValue) || 0) > 0) {
      tail.push(order.discountType === 'importo'
        ? `Sconto sull'ordine: ${eur(parseFloat(order.discountValue) || 0)}`
        : `Sconto del ${parseFloat(order.discountValue) || 0}% sui prezzi indicati`)
    }
    if ((parseFloat(order.shipping) || 0) > 0) tail.push(`Spedizione: ${eur(parseFloat(order.shipping))}`)
  }
  const totRows = isKit ? [] : [
    [discAmt > 0 ? 'SUBTOTALE' : 'IMPONIBILE STIMATO', eur(subtotal)],
    ...(discAmt > 0 ? [
      [order.discountMode === 'articolo' ? 'SCONTO TOTALE' : 'SCONTO' + (order.discountType === 'percentuale' ? ` ${parseFloat(order.discountValue) || 0}%` : ''), '− ' + eur(discAmt), C.CLAY],
      ['IMPONIBILE', eur(subtotal - discAmt)],
    ] : []),
    ...(order.ivaEnabled ? [[`IVA ${order.ivaRate || 22}%`, eur(ivaAmt)]] : []),
  ]
  const foot = isKit
    ? `* ${allSingle ? 'Prezzi unitari' : noSingle ? 'Prezzi per singolo kit' : 'Prezzi per singolo kit o articolo'}, soggetti a conferma. Le quantità sono stime indicate dal club e verranno definite in fase di conferma ordine.`
    : '* I prezzi sono indicativi e soggetti a conferma. Le quantità finali potrebbero variare.'
  k.sans().size(7)
  const footL = k.wrap(foot, inR - inX)
  const tailH = (tail.length ? 4 + tail.length * 5 : 0) + (totRows.length ? 6 + totRows.length * 6 + 12 : 0) + 4 + footL.length * 3.5 + 4

  // Riquadro beige che continua sulle pagine successive: si chiude e si riapre a ogni salto.
  let boxTop = null
  const openBox = () => { boxTop = k.y }
  const closeBox = () => {
    doc.setDrawColor(C.BORDER); doc.setLineWidth(0.3)
    doc.roundedRect(M, boxTop, R - M, k.y - boxTop, 2, 2)
  }
  const fill = (h) => { doc.setFillColor(C.BEIGE); doc.rect(M + 0.15, k.y, R - M - 0.3, h, 'F') }
  const need = (h) => {
    if (k.y + h > k.BOTTOM) { closeBox(); doc.addPage(); k.y = k.M; openBox() }
  }

  k.ensure(16 + (rows[0]?.[0] || 0)); k.y += 2; openBox()
  fill(12); k.sans().size(6.5).color(C.MUTED).spaced(title, inX, k.y + 8, {}, 1.2); k.y += 12
  rows.forEach(([h, draw], i) => {
    need(h); fill(h); draw(k.y); k.y += h
    if (i < rows.length - 1 || tail.length || totRows.length) k.rule(k.y - 2, '#e8e0d0', 0.2, inX, inR)
  })
  need(tailH); fill(tailH)
  let ty = k.y
  if (tail.length) { ty += 4; tail.forEach(t => { k.sans().size(8.5).color(C.NAVY).text(t, inX, ty + 2); ty += 5 }) }
  if (totRows.length) {
    ty += 4; k.rule(ty, C.BORDER, 0.5, inX, inR); ty += 4
    const lx = inR - 100
    totRows.forEach(([l, v, col]) => {
      k.sans().size(7).color(C.MUTED).spaced(l, lx, ty + 2, {}, 0.6)
      k.sans().size(10).color(col || C.NAVY).text(v, inR, ty + 2, { align: 'right' }); ty += 6
    })
    k.rule(ty - 1, C.BORDER, 0.2, lx, inR); ty += 4
    k.sans('bold').size(7.5).color(C.NAVY).spaced('TOTALE PREVENTIVO' + (order.ivaEnabled ? ' IVA INCL.' : ''), lx, ty + 2, {}, 0.6)
    k.serif().size(18).color(C.CLAY).text(eur(total), inR, ty + 3, { align: 'right' }); ty += 8
  }
  ty += 3; k.sans().size(7).color(C.MUTED); doc.text(footL, inX, ty, { lineHeightFactor: 1.3 })
  k.y += tailH
  closeBox()
  k.y += 4
}
