import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { getAllArticles, artPieceCount } from '../utils/helpers.js'
import { italianDay } from '../lib/production.js'

// Riepilogo per il cliente: articoli, colori, taglie e quantita' da verificare e confermare
// prima della produzione. Niente prezzi, niente codici interni.

const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Una griglia (adulto o bambino) solo con le taglie ordinate: piu' facile da controllare.
function grid(label, sizes, values, sizeLabel) {
  const used = sizes.filter(sz => (values?.[sz] || 0) > 0)
  if (!used.length) return ''
  const tot = used.reduce((s, sz) => s + values[sz], 0)
  return `
    <tr>
      <td style="padding:7px 10px;font-size:9px;letter-spacing:2px;color:#8a9ab5;border:1px solid #e0d8cc;background:#f8f5f0;white-space:nowrap;width:90px;">${label}</td>
      ${used.map(sz => `
        <td style="padding:5px 6px;text-align:center;border:1px solid #e0d8cc;min-width:46px;">
          <div style="font-size:9px;letter-spacing:1px;color:#8a9ab5;">${sizeLabel(sz)}</div>
          <div style="font-size:15px;font-weight:600;color:#1a2744;margin-top:2px;">${values[sz]}</div>
        </td>`).join('')}
      <td style="padding:5px 10px;text-align:center;border:1px solid #e0d8cc;background:#f8f5f0;min-width:52px;">
        <div style="font-size:9px;letter-spacing:1px;color:#8a9ab5;">TOT</div>
        <div style="font-size:15px;font-weight:700;color:#c4623a;margin-top:2px;">${tot}</div>
      </td>
    </tr>`
}

function articleBlock(art) {
  const pieces = artPieceCount(art)
  const uni = art.sizes?.uni || 0
  const grids = grid('ADULTO', ADULT_SIZES, art.sizes?.adult, sz => sz)
    + grid('BAMBINO', KIDS_SIZES, art.sizes?.kids, sz => `${sz} ANNI`)
  return `
    <div style="padding:14px 0;border-bottom:1px solid #eee6da;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-bottom:8px;">
        <div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:19px;color:#1a2744;">${esc(art.description)}</div>
          <div style="font-size:10px;letter-spacing:1px;color:#8a9ab5;margin-top:2px;">
            ${[art.category ? esc(art.category) : '', art.color ? `Colore <strong style="color:#1a2744;">${esc(art.color)}</strong>` : ''].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style="font-size:11px;color:#8a9ab5;white-space:nowrap;">Totale <strong style="font-size:16px;color:#1a2744;">${pieces}</strong> pz</div>
      </div>
      ${grids ? `<table style="border-collapse:collapse;">${grids}</table>` : ''}
      ${uni > 0 ? `<div style="margin-top:6px;font-size:11px;color:#1a2744;">Taglia unica: <strong>${uni}</strong></div>` : ''}
      ${!grids && !uni ? `<div style="font-size:11px;color:#c4623a;">Taglie da definire</div>` : ''}
    </div>`
}

// La data dell'ordine per il club e' quella in cui ci ha mandato le taglie (submitted_at del modulo);
// senza modulo resta la data dell'ordine.
export function generateRecapPDF(order, sizesSubmittedAt = null) {
  const orderDate = sizesSubmittedAt ? italianDay(sizesSubmittedAt).split('-').reverse().join('/') : order.date
  const articles = getAllArticles(order)
  const totalPieces = articles.reduce((s, a) => s + artPieceCount(a), 0)
  const kits = (order.kits || []).filter(k => (k.articles || []).length)
  const showKits = kits.length > 1 || kits.some(k => k.name)

  // Una riga di tabella per articolo: le righe non si spezzano tra due pagine.
  // Il nome del kit sta nella riga del suo primo articolo, cosi' resta sulla stessa pagina.
  const articleRows = kits.flatMap((kit, k) => {
    const kitPieces = kit.articles.reduce((s, a) => s + artPieceCount(a), 0)
    return kit.articles.map((art, i) => `
      <div style="padding:0 40px;${i === 0 ? `padding-top:${k ? 22 : 24}px;` : ''}">
        ${i === 0 && showKits ? `
        <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1a2744;padding-bottom:6px;">
          <div style="font-size:12px;letter-spacing:3px;color:#1a2744;font-weight:700;text-transform:uppercase;">${esc(kit.name || 'Articoli')}</div>
          <div style="font-size:11px;color:#8a9ab5;">${kitPieces} pz</div>
        </div>` : ''}
        ${articleBlock(art)}
      </div>`)
  })

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Riepilogo ordine ${esc(order.id)} — ${esc(order.client)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Josefin+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Josefin Sans', sans-serif; color: #1a2744; margin: 0; background: #fff; }
    /* Pagina senza margini del browser: e' li' che stampa link, data e titolo (su iPad non si possono togliere).
       Il margine lo danno le righe vuote di thead/tfoot, che il browser ripete in cima e in fondo a ogni pagina. */
    @page { size: A4; margin: 0; }
    table.pagina { width: 100%; border-collapse: collapse; }
    table.pagina > * > tr > td { padding: 0; vertical-align: top; }
    table.pagina tr { break-inside: avoid; page-break-inside: avoid; }
    td.spazio { height: 12mm; }
    .print-btn { position:fixed;bottom:20px;right:20px;z-index:999;background:#c4623a;box-shadow:0 6px 18px rgba(0,0,0,.25);color:white;border:none;padding:12px 28px;font-family:'Josefin Sans',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;border-radius:3px;font-weight:600; }
    @media print { .print-btn { display:none!important; } body { print-color-adjust:exact;-webkit-print-color-adjust:exact; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">↓ Stampa / Salva PDF</button>

  <table class="pagina">
  <thead><tr><td class="spazio"></td></tr></thead>
  <tfoot><tr><td class="spazio"></td></tr></tfoot>
  <tbody>
  <tr><td>
  <div style="background:#1a2744;padding:26px 40px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#f5f0e8;letter-spacing:6px;">DOUBLEU</div>
      <div style="font-size:9px;letter-spacing:3px;color:#b8965a;margin-top:4px;">MADE IN ITALY · PREMIUM CLUBWEAR</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;letter-spacing:3px;color:#b8965a;margin-bottom:4px;">RIEPILOGO ORDINE · DA CONFERMARE</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:26px;color:#f5f0e8;letter-spacing:3px;">${esc(order.id)}</div>
    </div>
  </div>
  </td></tr>

  <tr><td>
  <div style="background:#f8f5f0;padding:20px 40px;border-bottom:2px solid #e0d8cc;">
    <div style="display:flex;gap:40px;flex-wrap:wrap;align-items:flex-end;">
      <div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">CLUB</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:22px;">${esc(order.client)}</div></div>
      <div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">DATA ORDINE</div>
        <div style="font-size:14px;font-weight:600;">${esc(orderDate)}</div></div>
      <div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">TOTALE CAPI</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:30px;color:#c4623a;line-height:1;">${totalPieces}</div></div>
    </div>
    <div style="margin-top:16px;font-size:13px;line-height:1.6;color:#1a2744;">
      Vi chiediamo di verificare <strong>articoli, colori, taglie e quantità</strong> riportati qui sotto.
      Se è tutto corretto, confermate rispondendo al messaggio o firmando in fondo: la produzione parte dopo la vostra conferma.
      Eventuali correzioni vanno segnalate prima dell'avvio della produzione.
    </div>
    ${order.orderNote ? `<div style="margin-top:12px;font-size:13px;color:#1a2744;"><strong>Nota:</strong> ${esc(order.orderNote)}</div>` : ''}
  </div>
  </td></tr>

  ${articleRows.map(r => `<tr><td>${r}</td></tr>`).join('')}

  <tr><td>
  <div style="padding:30px 40px 32px;">
  <div style="border:1px solid #1a2744;border-radius:8px;padding:20px 24px;">
    <div style="font-size:10px;letter-spacing:3px;color:#1a2744;font-weight:700;margin-bottom:14px;">CONFERMA DEL CLUB</div>
    <div style="font-size:13px;margin-bottom:22px;">Confermo articoli, colori, taglie e quantità per un totale di <strong>${totalPieces} capi</strong>.</div>
    <div style="display:flex;gap:40px;flex-wrap:wrap;font-size:11px;color:#8a9ab5;letter-spacing:1px;">
      <div style="flex:1;min-width:160px;">NOME E COGNOME<div style="border-bottom:1px solid #8a9ab5;height:26px;"></div></div>
      <div style="width:140px;">DATA<div style="border-bottom:1px solid #8a9ab5;height:26px;"></div></div>
      <div style="flex:1;min-width:160px;">FIRMA<div style="border-bottom:1px solid #8a9ab5;height:26px;"></div></div>
    </div>
  </div>
  </div>
  </td></tr>

  <tr><td>
  <div style="background:#1a2744;padding:14px 40px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:9px;letter-spacing:3px;color:#b8965a;">DOUBLEU · RIEPILOGO SENZA PREZZI</div>
    <div style="font-size:9px;color:rgba(255,255,255,0.4);">Generato il ${new Date().toLocaleDateString('it-IT')}</div>
  </div>
  </td></tr>
  </tbody>
  </table>
</body>
</html>`
}
