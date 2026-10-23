import { PURPOSE_LABELS, recipientLabel, recipientCountry, isGift } from './samples.js'
import { newPdf, C, pdfName } from '../lib/pdfKit.js'

// Documento da allegare alla spedizione dei campioni: elenco articoli
// senza prezzo. Esce dall'azienda e finisce in mano al cliente, quindi
// niente valori economici — non è un preventivo.
//
// Esiste in italiano e in inglese: i club esteri lavorano in inglese, e
// la lingua predefinita si ricava dal paese in anagrafica (vedi
// documentLanguage). Le stringhe stanno tutte qui sotto, così aggiungere
// una lingua non richiede di toccare il markup.

const PURPOSE_EN = {
  valutazione: 'Evaluation',
  misurazione: 'Sizing set',
  fiera:       'Trade fair / Event',
  promozione:  'Promotion',
}

const T = {
  it: {
    docTitle:    'Bolla Campioni',
    docTag:      'BOLLA CAMPIONI',
    recipient:   'DESTINATARIO',
    attn:        'c.a.',
    purpose:     'MOTIVO INVIO',
    giftTag:     'OMAGGIO',
    pieces:      'PEZZI',
    carrier:     'CORRIERE',
    listTitle:   'Elenco Campioni',
    columns:     ['Codice', 'Descrizione', 'Categoria', 'Colore', 'Taglia', 'Q.tà'],
    terms:       'CONDIZIONI',
    receiptTag:  'RICEVUTA E ACCETTAZIONE CONDIZIONI',
    receiptLine: 'Il sottoscritto dichiara di aver ricevuto i campioni sopra elencati e di accettare le condizioni riportate.',
    dateField:   'DATA RICEZIONE',
    nameField:   'NOME E COGNOME',
    signField:   'FIRMA',
    generatedOn: 'Generato il',
    purposeLabel: (p) => PURPOSE_LABELS[p] || p || '—',
    // Merce regalata: nessuna proprietà trattenuta, nessun addebito.
    giftTerms:   'I capi elencati in questa bolla sono ceduti al destinatario a titolo di omaggio promozionale, a costo zero. Non è previsto alcun rientro e non verrà emessa fattura.',
    loanIntro:   'I capi elencati in questa bolla sono forniti in visione a titolo gratuito e restano di proprietà esclusiva di DOUBLEU.',
    returnBy:    (d) => `Il destinatario si impegna a restituirli integri${d ? ` entro il ${d}` : ''}.`,
    chargeback:  'In caso di danneggiamento, mancata restituzione o perdita dei campioni, il relativo costo verrà addebitato al destinatario secondo il listino DOUBLEU in vigore al momento della consegna.',
  },
  en: {
    docTitle:    'Sample Delivery Note',
    docTag:      'SAMPLE DELIVERY NOTE',
    recipient:   'RECIPIENT',
    attn:        'attn.',
    purpose:     'PURPOSE',
    giftTag:     'FREE OF CHARGE',
    pieces:      'PIECES',
    carrier:     'CARRIER',
    listTitle:   'Sample List',
    columns:     ['Code', 'Description', 'Category', 'Colour', 'Size', 'Qty'],
    terms:       'TERMS',
    receiptTag:  'RECEIPT AND ACCEPTANCE OF TERMS',
    receiptLine: 'The undersigned confirms receipt of the samples listed above and accepts the terms set out herein.',
    dateField:   'DATE RECEIVED',
    nameField:   'FULL NAME',
    signField:   'SIGNATURE',
    generatedOn: 'Generated on',
    purposeLabel: (p) => PURPOSE_EN[p] || p || '—',
    giftTerms:   'The items listed in this delivery note are supplied to the recipient free of charge as a promotional gift. No return is required and no invoice will be issued.',
    loanIntro:   'The items listed in this delivery note are supplied free of charge on loan and remain the exclusive property of DOUBLEU.',
    returnBy:    (d) => `The recipient undertakes to return them undamaged${d ? ` by ${d}` : ''}.`,
    chargeback:  'In the event of damage, failure to return or loss of the samples, the corresponding cost will be charged to the recipient according to the DOUBLEU price list in force at the time of delivery.',
  },
}

// dd/mm/yyyy è ambiguo per chi legge in inglese: lì il mese va scritto.
function fmtDocDate(iso, lang) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  if (lang === 'it') return `${d}/${m}/${y}`
  const date = new Date(`${iso}T00:00:00`)
  if (isNaN(date)) return iso
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// I club esteri lavorano in inglese. Un destinatario fuori anagrafica
// non ha un paese: resta l'italiano, e l'interfaccia offre comunque il
// pulsante per stampare l'altra versione.
export function documentLanguage(shipment, clients = [], prospects = []) {
  const country = (recipientCountry(shipment, clients, prospects) || '').trim()
  if (!country) return 'it'
  return /^ital/i.test(country) ? 'it' : 'en'
}

export const samplePdfName = (shipment, clients = [], prospects = [], lang) => {
  const L = T[T[lang] ? lang : documentLanguage(shipment, clients, prospects)]
  return pdfName(L.docTitle, recipientLabel(shipment, clients, prospects), shipment.shipped_date)
}

// Bolla campioni come PDF vero (jsPDF): niente link e data aggiunti dalla stampa del browser.
export async function buildSamplePdf(shipment, clients = [], prospects = [], lang) {
  const docLang = T[lang] ? lang : documentLanguage(shipment, clients, prospects)
  const L = T[docLang]
  const recipient = recipientLabel(shipment, clients, prospects)
  const items = shipment.items || []
  const totalPieces = items.reduce((s, it) => s + (parseInt(it.quantity) || 0), 0)
  const gift = isGift(shipment)
  const mustReturn = !gift && !!shipment.return_required

  // Su un omaggio la clausola di proprietà e addebito direbbe il
  // contrario di quanto concordato: va sostituita, non integrata.
  const terms = gift
    ? L.giftTerms
    : [
        L.loanIntro,
        mustReturn ? L.returnBy(shipment.return_due_date ? fmtDocDate(shipment.return_due_date, docLang) : '') : '',
        L.chargeback,
      ].filter(Boolean).join(' ')

  const k = await newPdf(samplePdfName(shipment, clients, prospects, docLang).replace(/\.pdf$/, ''))
  const { doc, M, R, W } = k
  k.header(L.docTag, fmtDocDate(shipment.shipped_date, docLang))

  // ── Destinatario, motivo, pezzi, corriere ──
  const bandH = 28
  doc.setFillColor(C.BEIGE); doc.rect(0, 30, W, bandH, 'F')
  k.rule(30 + bandH, C.BORDER, 0.5, 0, W)
  k.fields([
    { label: L.recipient, value: recipient, style: 'serif', min: 56 },
    { label: L.purpose, value: L.purposeLabel(shipment.purpose), min: 40 },
    { label: L.pieces, value: String(totalPieces), style: 'big', min: 24 },
    ...(shipment.carrier ? [{ label: L.carrier, value: shipment.carrier + (shipment.tracking ? ` · ${shipment.tracking}` : '') }] : []),
  ], 38)
  if (shipment.contact_name) k.sans().size(8).color('#666666').text(`${L.attn} ${shipment.contact_name}`, M, 50)
  if (gift) {
    // Etichetta omaggio sotto il motivo dell'invio (stessa colonna calcolata da k.fields)
    k.sans().size(6.2)
    const labW = k.spacedWidth(L.recipient, 0.7)
    k.serif().size(15)
    const x = M + Math.max(56, doc.getTextWidth(recipient) + 9, labW + 8)
    k.sans('bold').size(6.2)
    const w = k.spacedWidth(L.giftTag, 0.6) + 4
    doc.setDrawColor(C.CLAY); doc.setFillColor('#f9e7df'); doc.setLineWidth(0.2); doc.rect(x, 47.5, w, 5, 'FD')
    k.color(C.CLAY).spaced(L.giftTag, x + 2, 51, {}, 0.6)
  }
  k.y = 30 + bandH + 8

  // ── Elenco campioni ──
  k.sans().size(6.5).color(C.MUTED).spaced(L.listTitle.toUpperCase(), M, k.y, {}, 1.2)
  k.rule(k.y + 3, C.BORDER, 0.3); k.y += 7
  const cols = [22, 0, 30, 30, 16, 14]
  cols[1] = R - M - cols.reduce((a, b) => a + b, 0)
  let cx = M
  const xs = cols.map(w => { const x = cx; cx += w; return x })
  const head = () => {
    doc.setDrawColor(C.BORDER); doc.setLineWidth(0.2)
    L.columns.forEach((h, i) => {
      doc.setFillColor('#f5f5f5'); doc.rect(xs[i], k.y, cols[i], 7, 'FD')
      k.sans().size(6.2).color('#666666').spaced(h.toUpperCase(), xs[i] + 2.5, k.y + 4.6, {}, 0.5)
    })
    k.y += 7
  }
  head()
  for (const it of items) {
    k.serif().size(12)
    const desc = k.wrap(it.description || '—', cols[1] - 5)
    k.sans().size(8)
    const cat = k.wrap(it.category || '—', cols[2] - 5)
    const col = k.wrap(it.color || '—', cols[3] - 5)
    const h = Math.max(desc.length * 4.6, cat.length * 3.6, col.length * 3.6) + 5
    if (k.y + h > k.BOTTOM) { doc.addPage(); k.y = k.M; head() }
    doc.setDrawColor(C.BORDER); doc.setLineWidth(0.2)
    cols.forEach((w, i) => doc.rect(xs[i], k.y, w, h))
    const ty = k.y + 5.2
    k.sans().size(7.5).color('#888888').spaced(it.sp || '—', xs[0] + 2.5, ty, {}, 0.3)
    k.serif().size(12).color(C.NAVY); doc.text(desc, xs[1] + 2.5, ty + 0.3, { lineHeightFactor: 1.15 })
    k.sans().size(8).color('#666666'); doc.text(cat, xs[2] + 2.5, ty, { lineHeightFactor: 1.3 })
    k.sans('bold').size(8).color(C.CLAY); doc.text(col, xs[3] + 2.5, ty, { lineHeightFactor: 1.3 })
    k.sans().size(8).color('#666666').text(it.size || '—', xs[4] + cols[4] / 2, ty, { align: 'center' })
    k.serif().size(13).color(C.NAVY).text(String(it.quantity || 1), xs[5] + cols[5] / 2, ty + 0.5, { align: 'center' })
    k.y += h
  }
  k.y += 6

  // ── Condizioni ──
  k.sans().size(8.5)
  const termL = k.wrap(terms, R - M - 12)
  const tH = 13 + termL.length * 4.4
  k.ensure(tH)
  doc.setFillColor(C.BEIGE); doc.setDrawColor(C.BORDER); doc.setLineWidth(0.3); doc.roundedRect(M, k.y, R - M, tH, 2, 2, 'FD')
  k.sans().size(6.5).color(C.MUTED).spaced(L.terms, M + 6, k.y + 7, {}, 1.2)
  k.sans().size(8.5).color('#444444'); doc.text(termL, M + 6, k.y + 13, { lineHeightFactor: 1.5 })
  k.y += tH + 5

  // ── Ricevuta e accettazione ──
  k.sans().size(7.5)
  const recL = k.wrap(L.receiptLine, R - M - 12)
  const sH = 30 + recL.length * 3.6
  k.ensure(sH)
  doc.setDrawColor(C.BORDER); doc.setLineWidth(0.3); doc.roundedRect(M, k.y, R - M, sH, 2, 2)
  k.sans().size(6.5).color(C.MUTED).spaced(L.receiptTag, M + 6, k.y + 7, {}, 1.2)
  k.sans().size(7.5).color('#888888'); doc.text(recL, M + 6, k.y + 12.5, { lineHeightFactor: 1.3 })
  const fy = k.y + 12.5 + recL.length * 3.6 + 4
  const colW = (R - M - 12 - 2 * 10) / 3
  ;[L.dateField, L.nameField, L.signField].forEach((lab, i) => {
    const x = M + 6 + i * (colW + 10)
    k.sans().size(6.2).color(C.MUTED).spaced(lab, x, fy, {}, 0.6)
    k.rule(fy + 8, '#aaaaaa', 0.3, x, x + colW)
  })
  k.y += sH + 4

  k.footer('DOUBLEU · MADE IN ITALY · DOUBLEUTENNIS.COM',
    `${L.generatedOn} ${new Date().toLocaleDateString(docLang === 'it' ? 'it-IT' : 'en-GB')}`,
    docLang === 'it' ? undefined : (p, n) => `page ${p} of ${n}`)
  return k.blob()
}
