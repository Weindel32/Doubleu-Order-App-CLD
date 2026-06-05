import { orderSubtotal, orderIVA, orderTotal } from '../utils/helpers.js'

const ADULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const KIDS_SIZES  = ['4', '6', '8', '10', '12', '14', '16']

function artSizeTotal(art) {
  const ad = ADULT_SIZES.reduce((s, sz) => s + (art.sizes && art.sizes.adult ? (art.sizes.adult[sz] || 0) : 0), 0)
  const ki = KIDS_SIZES.reduce((s, sz) => s + (art.sizes && art.sizes.kids ? (art.sizes.kids[sz] || 0) : 0), 0)
  return ad + ki
}

function sizeTableHtml(art) {
  const cell = 'padding:5px 8px;text-align:center;border:1px solid #e0d8cc;font-size:11px;'
  const head = cell + 'background:#f0ece4;font-size:9px;letter-spacing:1px;color:#8a9ab5;font-weight:600;'
  const val  = cell + 'font-family:"Cormorant Garamond",serif;font-size:15px;color:#1a2744;'
  const tot  = cell + 'background:#fff7f0;font-family:"Cormorant Garamond",serif;font-size:15px;color:#c4623a;font-weight:700;'
  const dim  = cell + 'color:#ccc;'

  const adult = art.sizes && art.sizes.adult ? art.sizes.adult : {}
  const kids  = art.sizes && art.sizes.kids  ? art.sizes.kids  : {}
  const adTotal = ADULT_SIZES.reduce((s, sz) => s + (adult[sz] || 0), 0)
  const kiTotal = KIDS_SIZES.reduce((s, sz) => s + (kids[sz] || 0), 0)
  if (adTotal + kiTotal === 0) return ''

  let rows = ''

  if (adTotal > 0) {
    let headCells = '<td style="' + head + 'color:#1a2744;">ADULTO</td>'
    ADULT_SIZES.forEach(function(sz) { headCells += '<td style="' + head + '">' + sz + '</td>' })
    headCells += '<td style="' + tot + '">TOT</td>'
    let valCells = '<td style="' + cell + '"></td>'
    ADULT_SIZES.forEach(function(sz) {
      var n = adult[sz] || 0
      valCells += '<td style="' + (n > 0 ? val : dim) + '">' + n + '</td>'
    })
    valCells += '<td style="' + tot + '">' + adTotal + '</td>'
    rows += '<tr>' + headCells + '</tr><tr>' + valCells + '</tr>'
  }

  if (kiTotal > 0) {
    let headCells = '<td style="' + head + 'color:#1a2744;">BAMBINO</td>'
    KIDS_SIZES.forEach(function(sz) { headCells += '<td style="' + head + '">' + sz + '</td>' })
    headCells += '<td style="' + tot + '">TOT</td>'
    let valCells = '<td style="' + cell + '"></td>'
    KIDS_SIZES.forEach(function(sz) {
      var n = kids[sz] || 0
      valCells += '<td style="' + (n > 0 ? val : dim) + '">' + n + '</td>'
    })
    valCells += '<td style="' + tot + '">' + kiTotal + '</td>'
    rows += '<tr>' + headCells + '</tr><tr>' + valCells + '</tr>'
  }

  return '<div style="margin-top:10px;overflow-x:auto;"><table style="border-collapse:collapse;">' + rows + '</table>'
    + '<div style="margin-top:4px;font-size:9px;letter-spacing:2px;color:#c4623a;">TOTALE PEZZI: ' + (adTotal + kiTotal) + '</div></div>'
}

export function generateQuotePDF(order) {
  var articles = (order.kits || []).flatMap(function(k) { return k.articles || [] })
  var subtotal  = orderSubtotal(order)
  var ivaAmt    = orderIVA(order)
  var total     = orderTotal(order)
  var anyHasSizes = articles.some(function(a) { return artSizeTotal(a) > 0 })

  var pricingBlock = (function() {
    if (order.pricingMode === 'kit') {
      return order.kits.map(function(kit) {
        var qty      = parseInt(kit.quantity) || parseInt(order.kitQuantity) || 0
        var kitTotal = (parseFloat(kit.price) || 0) * qty
        var omaggioInKit = kit.articles.filter(function(a) { return (a.omaggio || 0) > 0 })
          .map(function(a) { return a.description + ' (' + a.omaggio + ' pz)' }).join(', ')
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #e8e0d0;">'
          + '<div>'
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:18px;color:#1a2744;">' + (kit.name || 'Kit') + '</div>'
          + '<div style="font-size:10px;color:#8a9ab5;margin-top:2px;">' + kit.articles.map(function(a) { return a.description }).filter(Boolean).join(' + ') + '</div>'
          + (omaggioInKit ? '<div style="font-size:10px;color:#c4623a;margin-top:3px;font-style:italic;">In omaggio: ' + omaggioInKit + '</div>' : '')
          + '</div>'
          + '<div style="text-align:right;">'
          + '<div style="font-size:10px;color:#8a9ab5;letter-spacing:2px;">PREZZO KIT &times; N&deg; PERSONE</div>'
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;color:#c4623a;">&euro; ' + (parseFloat(kit.price) || 0).toFixed(2) + ' &times; ' + qty + ' pers.</div>'
          + '<div style="font-size:13px;color:#1a2744;font-weight:700;margin-top:4px;">= &euro; ' + kitTotal.toFixed(2) + '</div>'
          + '</div></div>'
      }).join('')
    } else {
      return articles.map(function(a) {
        var sizesQty = artSizeTotal(a)
        var qty = sizesQty > 0 ? sizesQty : (parseInt(a.estimatedQty) || 0)
        var artTotal = (parseFloat(a.price) || 0) * qty
        var qtyLabel = sizesQty > 0 ? 'PEZZI DA TAGLIE' : 'QUANTIT&Agrave; STIMATA'
        var priceRight = qty
          ? '<div style="font-size:10px;color:#8a9ab5;letter-spacing:2px;">PREZZO &times; ' + qtyLabel + '</div>'
            + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;color:#c4623a;">&euro; ' + (parseFloat(a.price) || 0).toFixed(2) + ' &times; ' + qty + ' pz</div>'
            + '<div style="font-size:13px;color:#1a2744;font-weight:700;margin-top:4px;">= &euro; ' + artTotal.toFixed(2) + '</div>'
          : '<div style="font-size:10px;color:#8a9ab5;letter-spacing:2px;">PREZZO UNITARIO</div>'
            + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;color:#c4623a;">&euro; ' + (parseFloat(a.price) || 0).toFixed(2) + '</div>'
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #e8e0d0;">'
          + '<div>'
          + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:18px;color:#1a2744;">' + a.description + '</div>'
          + '<div style="font-size:10px;color:#8a9ab5;margin-top:2px;">' + [a.category, a.line, a.color].filter(Boolean).join(' &middot; ') + '</div>'
          + '</div>'
          + '<div style="text-align:right;">' + priceRight + '</div>'
          + '</div>'
      }).join('')
    }
  })()

  var articleRows = articles.map(function(art) {
    var omRow = (art.omaggio || 0) > 0
      ? '<div style="display:inline-block;margin-top:6px;padding:2px 8px;background:#fff3ee;border:1px solid #c4623a;border-radius:3px;font-size:9px;letter-spacing:2px;color:#c4623a;font-weight:700;">OMAGGIO: ' + art.omaggio + ' PZ</div>'
      : ''
    return '<div style="display:flex;align-items:flex-start;gap:20px;padding:14px 0;border-bottom:1px solid #f0ece4;">'
      + '<div style="background:#f0ece4;padding:5px 12px;border-radius:2px;font-size:10px;letter-spacing:2px;color:#1a2744;font-weight:700;white-space:nowrap;flex-shrink:0;">' + (art.sp || '&mdash;') + '</div>'
      + '<div style="flex:1;">'
      + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:18px;color:#1a2744;">' + (art.description || '&mdash;') + '</div>'
      + '<div style="font-size:10px;color:#8a9ab5;margin-top:3px;letter-spacing:1px;">' + [art.category, art.line].filter(Boolean).join(' &middot; ') + '</div>'
      + (art.color ? '<div style="font-size:11px;color:#c4623a;margin-top:3px;font-weight:600;">' + art.color + '</div>' : '')
      + (art.notes ? '<div style="font-size:10px;color:#8a9ab5;margin-top:4px;font-style:italic;">' + art.notes + '</div>' : '')
      + omRow
      + sizeTableHtml(art)
      + '</div></div>'
  }).join('')

  var clientDetailsBlock = ''
  if (order.clientContact || order.clientEmail || order.clientPhone || order.clientCity) {
    clientDetailsBlock = '<div style="margin-top:12px;display:flex;gap:28px;flex-wrap:wrap;">'
      + (order.clientContact ? '<div><div style="font-size:9px;letter-spacing:2px;color:#8a9ab5;margin-bottom:2px;">REFERENTE</div><div style="font-size:13px;color:#1a2744;">' + order.clientContact + '</div></div>' : '')
      + (order.clientEmail   ? '<div><div style="font-size:9px;letter-spacing:2px;color:#8a9ab5;margin-bottom:2px;">EMAIL</div><div style="font-size:13px;color:#1a2744;">' + order.clientEmail + '</div></div>' : '')
      + (order.clientPhone   ? '<div><div style="font-size:9px;letter-spacing:2px;color:#8a9ab5;margin-bottom:2px;">TELEFONO</div><div style="font-size:13px;color:#1a2744;">' + order.clientPhone + '</div></div>' : '')
      + (order.clientCity    ? '<div><div style="font-size:9px;letter-spacing:2px;color:#8a9ab5;margin-bottom:2px;">CITT&Agrave;</div><div style="font-size:13px;color:#1a2744;">' + order.clientCity + (order.clientCountry ? ', ' + order.clientCountry : '') + '</div></div>' : '')
      + '</div>'
  }

  var kitPersone = order.kits.reduce(function(s, k) { return s + (parseInt(k.quantity) || parseInt(order.kitQuantity) || 0) }, 0)
  var totLabel = order.pricingMode === 'kit'
    ? 'TOTALE STIMATO (' + kitPersone + ' PERSONE)'
    : 'IMPONIBILE STIMATO'

  var ivaRow = order.ivaEnabled
    ? '<div style="display:flex;justify-content:space-between;width:300px;"><span style="font-size:11px;color:#8a9ab5;letter-spacing:2px;">IVA ' + (order.ivaRate || 22) + '%</span><span style="font-size:15px;color:#1a2744;">&euro; ' + ivaAmt.toFixed(2) + '</span></div>'
    : ''

  var totalBlock = '<div style="margin-top:20px;padding-top:16px;border-top:2px solid #e0d8cc;">'
    + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">'
    + '<div style="display:flex;justify-content:space-between;width:300px;"><span style="font-size:11px;color:#8a9ab5;letter-spacing:2px;">' + totLabel + '</span><span style="font-size:15px;color:#1a2744;">&euro; ' + subtotal.toFixed(2) + '</span></div>'
    + ivaRow
    + '<div style="display:flex;justify-content:space-between;width:300px;padding-top:8px;border-top:1px solid #e0d8cc;"><span style="font-size:11px;color:#1a2744;font-weight:700;letter-spacing:2px;">TOTALE PREVENTIVO' + (order.ivaEnabled ? ' IVA INCL.' : '') + '</span><span style="font-family:\'Cormorant Garamond\',serif;font-size:28px;color:#c4623a;font-weight:600;">&euro; ' + total.toFixed(2) + '</span></div>'
    + '</div></div>'

  var kitPersoneBlock = order.pricingMode === 'kit'
    ? '<div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">TOTALE PERSONE</div><div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;color:#1a2744;">' + kitPersone + '</div></div>'
    : ''

  var sizeBanner = anyHasSizes ? '' : '<div style="font-size:10px;color:#b8965a;letter-spacing:1px;margin-bottom:16px;padding:8px 12px;background:#fff7f0;border-radius:4px;border-left:3px solid #c4623a;">Le taglie specifiche verranno definite in fase di conferma ordine.</div>'

  var sizesNote = anyHasSizes ? '' : '<p style="margin-bottom:0;"><strong>Prodotti personalizzati</strong> &mdash; I prodotti sono realizzati su misura. Le taglie definitive saranno indicate in fase di conferma ordine.</p>'

  var notesBlock = order.notes ? '<div style="margin-top:14px;padding:10px 16px;background:white;border-radius:6px;border:1px solid #e0d8cc;font-size:13px;color:#1a2744;">' + order.notes + '</div>' : ''

  return '<!DOCTYPE html>\n<html lang="it">\n<head>\n'
    + '<meta charset="utf-8">\n'
    + '<title>Preventivo &mdash; ' + order.id + '</title>\n'
    + '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Josefin+Sans:wght@300;400;600&display=swap" rel="stylesheet">\n'
    + '<style>* { box-sizing: border-box; } body { font-family: \'Josefin Sans\', sans-serif; color: #1a2744; margin: 0; background: #fff; } .print-btn { position:fixed;top:20px;right:20px;z-index:999;background:#1a2744;color:white;border:none;padding:12px 28px;font-family:\'Josefin Sans\',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;border-radius:3px;font-weight:600; } @media print { .print-btn { display:none!important; } body { print-color-adjust:exact;-webkit-print-color-adjust:exact; } @page { margin:15mm; } @page :first { margin-top:0; } }</style>\n'
    + '</head>\n<body>\n'
    + '<button class="print-btn" onclick="window.print()">&darr; Salva / Stampa</button>\n'

    + '<div style="background:#1a2744;padding:28px 40px;display:flex;justify-content:space-between;align-items:center;">'
    + '<div><div style="font-family:\'Cormorant Garamond\',serif;font-size:30px;font-weight:600;color:#f5f0e8;letter-spacing:6px;">DOUBLEU</div>'
    + '<div style="font-size:9px;letter-spacing:3px;color:#b8965a;margin-top:4px;">MADE IN ITALY &middot; PREMIUM CLUBWEAR</div></div>'
    + '<div style="text-align:right;"><div style="font-size:9px;letter-spacing:3px;color:rgba(255,255,255,0.4);margin-bottom:4px;">PREVENTIVO</div>'
    + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:26px;color:#f5f0e8;letter-spacing:3px;">' + order.id + '</div></div>'
    + '</div>'

    + '<div style="background:#fff7f0;padding:20px 40px;border-bottom:2px solid #e0d8cc;">'
    + '<div style="display:flex;gap:40px;flex-wrap:wrap;">'
    + '<div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">CLUB</div><div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;color:#1a2744;">' + order.client + '</div></div>'
    + '<div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">DATA PREVENTIVO</div><div style="font-size:14px;font-weight:600;">' + order.date + '</div></div>'
    + '<div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">N&deg; ARTICOLI</div><div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;color:#c4623a;">' + articles.length + '</div></div>'
    + kitPersoneBlock
    + '<div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">STATO</div><div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#c4623a;">PREVENTIVO</div></div>'
    + '</div>'
    + clientDetailsBlock
    + notesBlock
    + '</div>'

    + '<div style="padding:28px 40px;">'
    + '<div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #e8e0d0;">Articoli del Preventivo</div>'
    + sizeBanner
    + articleRows
    + '</div>'

    + '<div style="margin:28px 40px 28px;background:#f8f5f0;border:1px solid #e0d8cc;border-radius:10px;padding:22px 28px;page-break-inside:avoid;">'
    + '<div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:16px;">' + (order.pricingMode === 'kit' ? 'COMPOSIZIONE KIT E PREZZI' : 'PREZZI PER ARTICOLO') + '</div>'
    + pricingBlock
    + totalBlock
    + '<div style="margin-top:12px;font-size:9px;color:#8a9ab5;font-style:italic;">* I prezzi sono indicativi e soggetti a conferma. Le quantit&agrave; finali potrebbero variare.</div>'
    + '</div>'

    + '<div style="margin:0 40px 40px;padding:22px 28px;border:1px solid #e0d8cc;border-radius:10px;">'
    + '<div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:16px;">NOTE E VALIDIT&Agrave;</div>'
    + '<div style="font-size:11px;color:#555;line-height:1.8;">'
    + '<p style="margin-bottom:8px;"><strong>Validit&agrave; del preventivo</strong> &mdash; Il presente preventivo ha validit&agrave; 30 giorni dalla data di emissione.</p>'
    + '<p style="margin-bottom:8px;"><strong>Conferma dell\'ordine</strong> &mdash; L\'ordine si considera confermato solo al ricevimento della conferma scritta, approvazione grafica definitiva e versamento dell\'acconto previsto.</p>'
    + sizesNote
    + '</div></div>'

    + '<div style="background:#1a2744;padding:16px 40px;display:flex;justify-content:space-between;align-items:center;">'
    + '<div style="font-size:9px;letter-spacing:3px;color:#b8965a;">DOUBLEU &middot; MADE IN ITALY &middot; www.doubleutennis.com</div>'
    + '<div style="font-size:9px;color:rgba(255,255,255,0.3);">Generato il ' + new Date().toLocaleDateString('it-IT') + '</div>'
    + '</div>'

    + '</body>\n</html>'
}
