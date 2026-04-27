import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { getAllArticles, artPieceCount } from '../utils/helpers.js'

export function generateProductionPDF(order) {
  const articles    = getAllArticles(order)
  const hasKids     = articles.some(a => KIDS_SIZES.some(sz => (a.sizes.kids?.[sz]  || 0) > 0))
  const hasAdult    = articles.some(a => ADULT_SIZES.some(sz => (a.sizes.adult?.[sz] || 0) > 0))
  const totalPieces = articles.reduce((s, a) => s + artPieceCount(a), 0)

  const articleRows = articles.map(art => {
    const adultTotal = ADULT_SIZES.reduce((s, sz) => s + (art.sizes.adult?.[sz] || 0), 0)
    const kidsTotal  = KIDS_SIZES.reduce((s, sz)  => s + (art.sizes.kids?.[sz]  || 0), 0)
    const grandTotal = adultTotal + kidsTotal

    const adultSection = hasAdult ? `
      <tr style="background:#f0f4f8;">
        <td style="padding:6px 10px;font-size:9px;letter-spacing:2px;color:#8a9ab5;border:1px solid #e0d8cc;white-space:nowrap;">ADULTO</td>
        ${ADULT_SIZES.map(sz=>`<td style="padding:6px 8px;text-align:center;font-size:9px;letter-spacing:1px;color:#8a9ab5;border:1px solid #e0d8cc;background:#f0f4f8;">${sz}</td>`).join('')}
        ${hasKids?KIDS_SIZES.map(()=>`<td style="border:1px solid #e0d8cc;background:#f0f4f8;"></td>`).join(''):''}
        <td style="padding:6px 8px;text-align:center;font-size:9px;color:#8a9ab5;border:1px solid #e0d8cc;background:#f0f4f8;">TOT</td>
      </tr>
      <tr>
        <td style="padding:10px 10px;border:1px solid #e0d8cc;font-size:11px;color:#8a9ab5;white-space:nowrap;">pz</td>
        ${ADULT_SIZES.map(sz=>`<td style="padding:10px 8px;text-align:center;border:1px solid #e0d8cc;font-size:14px;color:${(art.sizes.adult?.[sz]||0)>0?'#1a2744':'#ccc'};">${art.sizes.adult?.[sz]??0}</td>`).join('')}
        ${hasKids?KIDS_SIZES.map(()=>`<td style="border:1px solid #e0d8cc;text-align:center;color:#ddd;">—</td>`).join(''):''}
        <td style="padding:10px 8px;text-align:center;border:1px solid #e0d8cc;font-weight:700;font-size:16px;color:#1a2744;">${adultTotal}</td>
      </tr>` : ''

    const kidsSection = hasKids ? `
      <tr style="background:#f4f0f8;">
        <td style="padding:6px 10px;font-size:9px;letter-spacing:2px;color:#8a9ab5;border:1px solid #e0d8cc;white-space:nowrap;">BAMBINO</td>
        ${hasAdult?ADULT_SIZES.map(()=>`<td style="border:1px solid #e0d8cc;background:#f4f0f8;"></td>`).join(''):''}
        ${KIDS_SIZES.map(sz=>`<td style="padding:6px 8px;text-align:center;font-size:9px;letter-spacing:1px;color:#8a9ab5;border:1px solid #e0d8cc;background:#f4f0f8;">${sz}</td>`).join('')}
        <td style="padding:6px 8px;text-align:center;font-size:9px;color:#8a9ab5;border:1px solid #e0d8cc;background:#f4f0f8;">TOT</td>
      </tr>
      <tr>
        <td style="padding:10px 10px;border:1px solid #e0d8cc;font-size:11px;color:#8a9ab5;white-space:nowrap;">pz</td>
        ${hasAdult?ADULT_SIZES.map(()=>`<td style="border:1px solid #e0d8cc;text-align:center;color:#ddd;">—</td>`).join(''):''}
        ${KIDS_SIZES.map(sz=>`<td style="padding:10px 8px;text-align:center;border:1px solid #e0d8cc;font-size:14px;color:${(art.sizes.kids?.[sz]||0)>0?'#1a2744':'#ccc'};">${art.sizes.kids?.[sz]??0}</td>`).join('')}
        <td style="padding:10px 8px;text-align:center;border:1px solid #e0d8cc;font-weight:700;font-size:16px;color:#1a2744;">${kidsTotal}</td>
      </tr>` : ''

    return `
      <div style="margin-bottom:30px;page-break-inside:avoid;">
        <div style="display:flex;gap:18px;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;">
          <div style="background:#1a2744;color:#f5f0e8;padding:5px 14px;border-radius:3px;font-size:12px;letter-spacing:3px;font-weight:700;white-space:nowrap;">${art.sp}</div>
          <div style="flex:1;">
            <div style="font-family:'Cormorant Garamond',serif;font-size:21px;color:#1a2744;letter-spacing:1px;">${art.description}</div>
            <div style="font-size:10px;letter-spacing:2px;color:#8a9ab5;margin-top:2px;">${art.category} · Linea ${art.line}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;letter-spacing:2px;color:#8a9ab5;margin-bottom:4px;">COLORE / PANTONE</div>
            <div style="font-size:14px;font-weight:700;color:#c4623a;letter-spacing:1px;">${art.color}</div>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table style="border-collapse:collapse;font-family:'Josefin Sans',sans-serif;width:100%;">
            ${adultSection}${kidsSection}
          </table>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
            ${['CRTM','TESS','TAGLIO','RIC/ST','CONF','PRONTO'].map(s=>`
              <div style="display:flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid #c8d0dd;border-radius:3px;">
                <div style="width:11px;height:11px;border:1.5px solid #8a9ab5;border-radius:2px;flex-shrink:0;"></div>
                <span style="font-size:8px;letter-spacing:1px;color:#1a2744;font-family:'Josefin Sans',sans-serif;">${s}</span>
              </div>`).join('')}
          </div>
          <div style="font-size:11px;color:#8a9ab5;white-space:nowrap;margin-left:12px;">
            Totale pezzi articolo: <strong style="color:#1a2744;font-size:14px;">${grandTotal}</strong>
          </div>
        </div>
      </div>`
  }).join('')

  const summaryCards = articles.map(a => {
    const tot = artPieceCount(a)
    return `<div style="background:white;padding:12px 16px;border-radius:6px;border:1px solid #e0d8cc;min-width:150px;">
      <div style="font-size:9px;letter-spacing:2px;color:#8a9ab5;margin-bottom:3px;">${a.sp}</div>
      <div style="font-size:13px;color:#1a2744;margin-bottom:3px;">${a.description}</div>
      <div style="font-size:10px;color:#c4623a;margin-bottom:6px;">${a.color}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:24px;color:#c4623a;">${tot} <span style="font-size:13px;">pz</span></div>
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>PDF Produzione — ${order.id}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Josefin+Sans:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Josefin Sans', sans-serif; color: #1a2744; margin: 0; background: #fff; }
    .print-btn { position:fixed;top:20px;right:20px;z-index:999;background:#c4623a;color:white;border:none;padding:12px 28px;font-family:'Josefin Sans',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;border-radius:3px;font-weight:600; }
    @media print { .print-btn { display:none!important; } body { print-color-adjust:exact;-webkit-print-color-adjust:exact; } @page { margin:15mm; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">↓ Stampa / Salva PDF</button>

  <div style="background:#1a2744;padding:28px 40px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#f5f0e8;letter-spacing:6px;">DOUBLEU</div>
      <div style="font-size:9px;letter-spacing:3px;color:#b8965a;margin-top:4px;">MADE IN ITALY · PREMIUM CLUBWEAR</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;letter-spacing:3px;color:rgba(255,255,255,0.4);margin-bottom:4px;">ORDINE PRODUZIONE · USO INTERNO</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:26px;color:#f5f0e8;letter-spacing:3px;">${order.id}</div>
    </div>
  </div>

  <div style="background:#f8f5f0;padding:20px 40px;border-bottom:2px solid #e0d8cc;">
    <div style="display:flex;gap:40px;flex-wrap:wrap;align-items:center;">
      <div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">CLUB</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:22px;">${order.client}</div></div>
      <div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">DATA</div>
        <div style="font-size:14px;font-weight:600;">${order.date}</div></div>
      <div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">TOTALE PEZZI</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:30px;color:#c4623a;line-height:1;">${totalPieces}</div></div>
      <div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">ARTICOLI</div>
        <div style="font-size:14px;font-weight:600;">${articles.length}</div></div>
    </div>
    ${order.productionNotes ? `
    <div style="margin-top:16px;background:#fff8f0;border-left:4px solid #c4623a;padding:14px 18px;border-radius:0 8px 8px 0;">
      <div style="font-size:9px;letter-spacing:3px;color:#c4623a;margin-bottom:6px;font-weight:700;">⚠ NOTE PRODUZIONE</div>
      <div style="font-size:13px;line-height:1.6;">${order.productionNotes}</div>
    </div>` : ''}
  </div>

  <div style="padding:28px 40px;">
    <div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:24px;padding-bottom:10px;border-bottom:2px solid #e8e0d0;">
      Dettaglio Articoli e Taglie
    </div>
    ${articleRows}
  </div>

  <div style="margin:0 40px 40px;background:#f8f5f0;border:1px solid #e0d8cc;border-radius:10px;padding:22px 28px;page-break-inside:avoid;">
    <div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:18px;">RIEPILOGO FINALE</div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;">
      ${summaryCards}
      <div style="background:#1a2744;padding:12px 16px;border-radius:6px;min-width:150px;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="font-size:9px;letter-spacing:2px;color:#b8965a;margin-bottom:4px;">TOTALE ORDINE</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:34px;color:#f5f0e8;line-height:1;">${totalPieces} <span style="font-size:16px;">pz</span></div>
      </div>
    </div>
  </div>

  <!-- FOOTER - solo uso interno, niente URL -->
  <div style="background:#1a2744;padding:16px 40px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:9px;letter-spacing:3px;color:#b8965a;">DOUBLEU · DOCUMENTO AD USO INTERNO</div>
    <div style="font-size:9px;color:rgba(255,255,255,0.3);">Generato il ${new Date().toLocaleDateString('it-IT')}</div>
  </div>
</body>
</html>`
}
