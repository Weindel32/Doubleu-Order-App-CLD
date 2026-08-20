import { PURPOSE_LABELS, recipientLabel, isGift } from './samples.js'

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
    printBtn:    '↓ Stampa / Salva',
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
    printBtn:    '↓ Print / Save',
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

function recipientCountry(shipment, clients = [], prospects = []) {
  if (shipment.client_id) {
    const c = clients.find(x => String(x.id) === String(shipment.client_id))
    if (c) return c.country || ''
  }
  if (shipment.prospect_id) {
    const p = prospects.find(x => String(x.id) === String(shipment.prospect_id))
    if (p) return p.country || ''
  }
  return ''
}

// I club esteri lavorano in inglese. Un destinatario fuori anagrafica
// non ha un paese: resta l'italiano, e l'interfaccia offre comunque il
// pulsante per stampare l'altra versione.
export function documentLanguage(shipment, clients = [], prospects = []) {
  const country = (recipientCountry(shipment, clients, prospects) || '').trim()
  if (!country) return 'it'
  return /^ital/i.test(country) ? 'it' : 'en'
}

export function generateSamplePDF(shipment, clients = [], prospects = [], lang) {
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

  const rows = items.map(it => `
    <tr>
      <td style="padding:10px 12px;border:1px solid #e0d8cc;font-size:11px;color:#888;letter-spacing:1px;">${it.sp || '—'}</td>
      <td style="padding:10px 12px;border:1px solid #e0d8cc;font-family:'Cormorant Garamond',serif;font-size:16px;color:#1a2744;">${it.description || '—'}</td>
      <td style="padding:10px 12px;border:1px solid #e0d8cc;font-size:12px;color:#666;">${it.category || '—'}</td>
      <td style="padding:10px 12px;border:1px solid #e0d8cc;font-size:12px;color:#c4623a;font-weight:600;">${it.color || '—'}</td>
      <td style="padding:10px 12px;border:1px solid #e0d8cc;font-size:12px;color:#666;text-align:center;">${it.size || '—'}</td>
      <td style="padding:10px 12px;border:1px solid #e0d8cc;font-family:'Cormorant Garamond',serif;font-size:18px;color:#1a2744;text-align:center;font-weight:600;">${it.quantity || 1}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="${docLang}">
<head>
  <meta charset="utf-8">
  <title>${L.docTitle} — ${recipient}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Josefin+Sans:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Josefin Sans', sans-serif; color: #1a2744; margin: 0; background: #fff; }
    .print-btn { position:fixed;top:20px;right:20px;z-index:999;background:#1a2744;color:white;border:none;padding:12px 28px;font-family:'Josefin Sans',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;border-radius:3px;font-weight:600; }
    @media print { .print-btn { display:none!important; } body { print-color-adjust:exact;-webkit-print-color-adjust:exact;margin:0;padding:0; } @page { margin:0;size:A4; } }
    table { border-collapse:collapse; width:100%; }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">${L.printBtn}</button>

  <!-- HEADER -->
  <div style="background:#1a2744;padding:20px 40px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#f5f0e8;letter-spacing:5px;">DOUBLEU</div>
      <div style="font-size:9px;letter-spacing:3px;color:#b8965a;margin-top:3px;">MADE IN ITALY · PREMIUM CLUBWEAR</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;letter-spacing:3px;color:rgba(255,255,255,0.4);margin-bottom:3px;">${L.docTag}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;color:#f5f0e8;letter-spacing:2px;">${fmtDocDate(shipment.shipped_date, docLang)}</div>
    </div>
  </div>

  <!-- INFO -->
  <div style="background:#f8f5f0;padding:16px 40px;border-bottom:2px solid #e0d8cc;display:flex;gap:40px;flex-wrap:wrap;">
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">${L.recipient}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#1a2744;">${recipient}</div>
      ${shipment.contact_name ? `<div style="font-size:11px;color:#666;margin-top:2px;">${L.attn} ${shipment.contact_name}</div>` : ''}
    </div>
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">${L.purpose}</div>
      <div style="font-size:14px;font-weight:600;color:#1a2744;">${L.purposeLabel(shipment.purpose)}</div>
      ${gift ? `<div style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:2px;font-size:9px;letter-spacing:2px;font-weight:600;color:#c4623a;background:rgba(196,98,58,0.12);border:1px solid rgba(196,98,58,0.35);">${L.giftTag}</div>` : ''}
    </div>
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">${L.pieces}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#c4623a;line-height:1;">${totalPieces}</div>
    </div>
    ${shipment.carrier ? `
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">${L.carrier}</div>
      <div style="font-size:14px;font-weight:600;color:#1a2744;">${shipment.carrier}${shipment.tracking ? ` · ${shipment.tracking}` : ''}</div>
    </div>` : ''}
  </div>

  <!-- ARTICOLI -->
  <div style="padding:24px 40px;">
    <div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #e0d8cc;">
      ${L.listTitle}
    </div>
    <table>
      <thead>
        <tr>
          ${L.columns.map(h =>
            `<th style="padding:8px 12px;border:1px solid #e0d8cc;background:#f5f5f5;text-align:left;font-size:9px;letter-spacing:2px;color:#666;">${h}</th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <!-- CONDIZIONI ─────────────────────────────────────────────── -->
  <div style="margin:0 40px 24px;background:#f8f5f0;border:1px solid #e0d8cc;border-radius:8px;padding:20px 24px;page-break-inside:avoid;break-inside:avoid;">
    <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:10px;">${L.terms}</div>
    <div style="font-size:11.5px;color:#444;line-height:1.8;">${terms}</div>
  </div>

  <!-- FIRMA RICEVUTA -->
  <div style="margin:0 40px 40px;padding:20px 24px;border:1px solid #e0d8cc;border-radius:8px;page-break-inside:avoid;break-inside:avoid;">
    <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:6px;">${L.receiptTag}</div>
    <div style="font-size:10.5px;color:#888;margin-bottom:16px;">${L.receiptLine}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;">
      <div>
        <div style="font-size:9px;color:#8a9ab5;letter-spacing:2px;margin-bottom:6px;">${L.dateField}</div>
        <div style="border-bottom:1px solid #aaa;height:28px;"></div>
      </div>
      <div>
        <div style="font-size:9px;color:#8a9ab5;letter-spacing:2px;margin-bottom:6px;">${L.nameField}</div>
        <div style="border-bottom:1px solid #aaa;height:28px;"></div>
      </div>
      <div>
        <div style="font-size:9px;color:#8a9ab5;letter-spacing:2px;margin-bottom:6px;">${L.signField}</div>
        <div style="border-bottom:1px solid #aaa;height:28px;"></div>
      </div>
    </div>
  </div>

  <div style="background:#1a2744;padding:14px 40px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:9px;letter-spacing:3px;color:#b8965a;">DOUBLEU · MADE IN ITALY · www.doubleutennis.com</div>
    <div style="font-size:9px;color:rgba(255,255,255,0.3);">${L.generatedOn} ${new Date().toLocaleDateString(docLang === 'it' ? 'it-IT' : 'en-GB')}</div>
  </div>
</body>
</html>`
}
