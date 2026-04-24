import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { getAllArticles, artPieceCount } from '../utils/helpers.js'

export function generateDeliveryPDF(order) {
  const articles    = order.status === 'CONSEGNA PARZIALE'
    ? getAllArticles(order).filter(a => a.delivered)
    : getAllArticles(order)
  const totalPieces = articles.reduce((s, a) => s + artPieceCount(a), 0)
  const hasKids     = articles.some(a => KIDS_SIZES.some(sz => (a.sizes.kids?.[sz]  || 0) > 0))
  const hasAdult    = articles.some(a => ADULT_SIZES.some(sz => (a.sizes.adult?.[sz] || 0) > 0))

  const articleRows = articles.map(art => {
    const adultTotal = ADULT_SIZES.reduce((s, sz) => s + (art.sizes.adult?.[sz] || 0), 0)
    const kidsTotal  = KIDS_SIZES.reduce((s, sz)  => s + (art.sizes.kids?.[sz]  || 0), 0)
    const grandTotal = adultTotal + kidsTotal

    const adultSection = hasAdult ? `
      <tr style="background:#f5f5f5;">
        <td style="padding:6px 10px;font-size:9px;letter-spacing:2px;color:#666;border:1px solid #ddd;">ADULTO</td>
        ${ADULT_SIZES.map(sz=>`<td style="padding:6px;text-align:center;font-size:9px;color:#666;border:1px solid #ddd;">${sz}</td>`).join('')}
        ${hasKids?KIDS_SIZES.map(()=>`<td style="border:1px solid #ddd;background:#f5f5f5;"></td>`).join(''):''}
        <td style="padding:6px;text-align:center;font-size:9px;color:#666;border:1px solid #ddd;">TOT</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;border:1px solid #ddd;font-size:11px;color:#666;">pz</td>
        ${ADULT_SIZES.map(sz=>`<td style="padding:8px;text-align:center;border:1px solid #ddd;font-size:13px;color:${(art.sizes.adult?.[sz]||0)>0?'#1a2744':'#ccc'};">${art.sizes.adult?.[sz]??0}</td>`).join('')}
        ${hasKids?KIDS_SIZES.map(()=>`<td style="border:1px solid #ddd;text-align:center;color:#ccc;">—</td>`).join(''):''}
        <td style="padding:8px;text-align:center;border:1px solid #ddd;font-weight:700;font-size:15px;color:#1a2744;">${adultTotal}</td>
      </tr>` : ''

    const kidsSection = hasKids ? `
      <tr style="background:#f0f0f8;">
        <td style="padding:6px 10px;font-size:9px;letter-spacing:2px;color:#666;border:1px solid #ddd;">BAMBINO</td>
        ${hasAdult?ADULT_SIZES.map(()=>`<td style="border:1px solid #ddd;background:#f0f0f8;"></td>`).join(''):''}
        ${KIDS_SIZES.map(sz=>`<td style="padding:6px;text-align:center;font-size:9px;color:#666;border:1px solid #ddd;">${sz}</td>`).join('')}
        <td style="padding:6px;text-align:center;font-size:9px;color:#666;border:1px solid #ddd;">TOT</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;border:1px solid #ddd;font-size:11px;color:#666;">pz</td>
        ${hasAdult?ADULT_SIZES.map(()=>`<td style="border:1px solid #ddd;text-align:center;color:#ccc;">—</td>`).join(''):''}
        ${KIDS_SIZES.map(sz=>`<td style="padding:8px;text-align:center;border:1px solid #ddd;font-size:13px;color:${(art.sizes.kids?.[sz]||0)>0?'#1a2744':'#ccc'};">${art.sizes.kids?.[sz]??0}</td>`).join('')}
        <td style="padding:8px;text-align:center;border:1px solid #ddd;font-weight:700;font-size:15px;color:#1a2744;">${kidsTotal}</td>
      </tr>` : ''

    return `
      <div style="margin-bottom:24px;page-break-inside:avoid;border:1px solid #e0e0e0;border-radius:6px;padding:16px;">
        <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;">
          <div style="flex:1;">
            <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#1a2744;">${art.description}</div>
            <div style="font-size:10px;letter-spacing:2px;color:#888;margin-top:2px;">${art.category} · ${art.line}</div>
            ${art.notes ? `<div style="font-size:11px;color:#555;margin-top:4px;font-style:italic;">${art.notes}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;letter-spacing:2px;color:#888;margin-bottom:3px;">COLORE</div>
            <div style="font-size:13px;font-weight:700;color:#c4623a;">${art.color}</div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:22px;color:#1a2744;margin-top:4px;">${grandTotal} pz</div>
          </div>
        </div>
        <table style="border-collapse:collapse;font-family:'Josefin Sans',sans-serif;width:100%;">
          ${adultSection}${kidsSection}
        </table>
      </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Bolla di Consegna — ${order.id}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Josefin+Sans:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Josefin Sans', sans-serif; color: #1a2744; margin: 0; background: #fff; }
    .print-btn { position:fixed;top:20px;right:20px;z-index:999;background:#1a2744;color:white;border:none;padding:12px 28px;font-family:'Josefin Sans',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;border-radius:3px;font-weight:600; }
    @media print { .print-btn { display:none!important; } body { print-color-adjust:exact;-webkit-print-color-adjust:exact; } @page { margin:15mm;margin-top:0; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">↓ Stampa / Salva</button>

  <!-- HEADER -->
  <div style="background:#1a2744;padding:20px 40px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#f5f0e8;letter-spacing:5px;">DOUBLEU</div>
      <div style="font-size:9px;letter-spacing:3px;color:#b8965a;margin-top:3px;">MADE IN ITALY · PREMIUM CLUBWEAR</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;letter-spacing:3px;color:rgba(255,255,255,0.4);margin-bottom:3px;">BOLLA DI CONSEGNA</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;color:#f5f0e8;letter-spacing:2px;">${order.id}</div>
    </div>
  </div>

  <!-- INFO -->
  <div style="background:#f8f5f0;padding:16px 40px;border-bottom:2px solid #e0d8cc;display:flex;gap:40px;flex-wrap:wrap;">
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">DESTINATARIO</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#1a2744;">${order.client}</div>
      ${order.clientCity ? `<div style="font-size:11px;color:#666;margin-top:2px;">${order.clientCity}${order.clientCountry?', '+order.clientCountry:''}</div>` : ''}
    </div>
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">DATA CONSEGNA</div>
      <div style="font-size:14px;font-weight:600;color:#1a2744;">${order.deliveryDate || new Date().toLocaleDateString('it-IT')}</div>
    </div>
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">TOTALE COLLI</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#c4623a;line-height:1;">${totalPieces} pz</div>
    </div>
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">ARTICOLI</div>
      <div style="font-size:14px;font-weight:600;color:#1a2744;">${articles.length}</div>
    </div>
  </div>

  <!-- ARTICLES -->
  <div style="padding:24px 40px;">
    <div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:20px;padding-bottom:8px;border-bottom:1px solid #e0d8cc;">
      Dettaglio Merce
    </div>
    ${articleRows}
  </div>

  <!-- RIEPILOGO -->
  <div style="margin:0 40px 24px;background:#f8f5f0;border:1px solid #e0d8cc;border-radius:8px;padding:18px 24px;">
    <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:12px;">RIEPILOGO</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      ${articles.map(a => {
        const tot = artPieceCount(a)
        return `<div style="background:white;padding:10px 14px;border-radius:4px;border:1px solid #e0d8cc;min-width:140px;">
          <div style="font-size:12px;color:#1a2744;margin-bottom:2px;">${a.description}</div>
          <div style="font-size:10px;color:#c4623a;margin-bottom:4px;">${a.color}</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:22px;color:#1a2744;">${tot} <span style="font-size:12px;">pz</span></div>
        </div>`
      }).join('')}
      <div style="background:#1a2744;padding:10px 14px;border-radius:4px;min-width:140px;">
        <div style="font-size:9px;color:#b8965a;margin-bottom:4px;letter-spacing:2px;">TOTALE</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#f5f0e8;">${totalPieces} <span style="font-size:14px;">pz</span></div>
      </div>
    </div>
  </div>

  <!-- FIRMA RICEVUTA -->
  <div style="margin:0 40px 40px;padding:20px 24px;border:1px solid #e0d8cc;border-radius:8px;">
    <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:16px;">RICEVUTA MERCE</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;">
      <div>
        <div style="font-size:9px;color:#8a9ab5;letter-spacing:2px;margin-bottom:6px;">DATA RICEZIONE</div>
        <div style="border-bottom:1px solid #aaa;height:28px;"></div>
      </div>
      <div>
        <div style="font-size:9px;color:#8a9ab5;letter-spacing:2px;margin-bottom:6px;">NOME E COGNOME</div>
        <div style="border-bottom:1px solid #aaa;height:28px;"></div>
      </div>
      <div>
        <div style="font-size:9px;color:#8a9ab5;letter-spacing:2px;margin-bottom:6px;">FIRMA</div>
        <div style="border-bottom:1px solid #aaa;height:28px;"></div>
      </div>
    </div>
  </div>

  <div style="background:#1a2744;padding:14px 40px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:9px;letter-spacing:3px;color:#b8965a;">DOUBLEU · MADE IN ITALY · www.doubleutennis.com</div>
    <div style="font-size:9px;color:rgba(255,255,255,0.3);">Generato il ${new Date().toLocaleDateString('it-IT')}</div>
  </div>
</body>
</html>`
}
