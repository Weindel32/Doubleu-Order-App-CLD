import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { getAllArticles, artPieceCount, orderSubtotal, orderIVA, orderTotal } from '../utils/helpers.js'

export function generateClientPDF(order) {
  const articles = getAllArticles(order)
  const hasKids  = articles.some(a => KIDS_SIZES.some(sz => (a.sizes.kids?.[sz] || 0) > 0))
  const hasAdult = articles.some(a => ADULT_SIZES.some(sz => (a.sizes.adult?.[sz] || 0) > 0))
  const subtotal = orderSubtotal(order)
  const ivaAmt   = orderIVA(order)
  const total    = orderTotal(order)

  const pricingBlock = (() => {
    if (order.pricingMode === 'kit') {
      return order.kits.map(kit => {
        const qty      = parseInt(kit.quantity) || parseInt(order.kitQuantity) || 0
        const kitTotal = (parseFloat(kit.price) || 0) * qty
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #e8e0d0;">
            <div>
              <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:#1a2744;">${kit.name}</div>
              <div style="font-size:10px;color:#8a9ab5;margin-top:2px;">${kit.articles.map(a=>a.description).join(' + ')}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:10px;color:#8a9ab5;letter-spacing:2px;">PREZZO KIT × N° PERSONE</div>
              <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#c4623a;">€ ${(parseFloat(kit.price)||0).toFixed(2)} × ${qty} pers.</div>
              <div style="font-size:13px;color:#1a2744;font-weight:700;margin-top:4px;">= € ${kitTotal.toFixed(2)}</div>
            </div>
          </div>`
      }).join('')
    } else {
      return articles.map(a => {
        const pz  = artPieceCount(a)
        const tot = (parseFloat(a.price) || 0) * pz
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #e8e0d0;">
            <div>
              <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:#1a2744;">${a.description}</div>
              <div style="font-size:10px;color:#8a9ab5;margin-top:2px;">${a.category} · ${a.line} · ${a.color}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:10px;color:#8a9ab5;letter-spacing:2px;">PREZZO UNITARIO</div>
              <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#c4623a;">€ ${(parseFloat(a.price)||0).toFixed(2)} × ${pz} pz</div>
              <div style="font-size:13px;color:#1a2744;font-weight:700;margin-top:4px;">= € ${tot.toFixed(2)}</div>
            </div>
          </div>`
      }).join('')
    }
  })()

  const articleRows = articles.map(art => {
    const adultTotal = ADULT_SIZES.reduce((s, sz) => s + (art.sizes.adult?.[sz] || 0), 0)
    const kidsTotal  = KIDS_SIZES.reduce((s, sz)  => s + (art.sizes.kids?.[sz]  || 0), 0)

    const adultSection = hasAdult ? `
      <tr style="background:#f0f4f8;">
        <td style="padding:6px 10px;font-size:9px;letter-spacing:2px;color:#8a9ab5;border:1px solid #e0d8cc;">ADULTO</td>
        ${ADULT_SIZES.map(sz=>`<td style="padding:6px;text-align:center;font-size:9px;color:#8a9ab5;border:1px solid #e0d8cc;">${sz}</td>`).join('')}
        ${hasKids?KIDS_SIZES.map(()=>`<td style="border:1px solid #e0d8cc;background:#f0f4f8;"></td>`).join(''):''}
        <td style="padding:6px;text-align:center;font-size:9px;color:#8a9ab5;border:1px solid #e0d8cc;">TOT</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;border:1px solid #e0d8cc;font-size:11px;color:#8a9ab5;">pz</td>
        ${ADULT_SIZES.map(sz=>`<td style="padding:8px;text-align:center;border:1px solid #e0d8cc;font-size:13px;color:${(art.sizes.adult?.[sz]||0)>0?'#1a2744':'#ccc'};">${art.sizes.adult?.[sz]??0}</td>`).join('')}
        ${hasKids?KIDS_SIZES.map(()=>`<td style="border:1px solid #e0d8cc;text-align:center;color:#ddd;">—</td>`).join(''):''}
        <td style="padding:8px;text-align:center;border:1px solid #e0d8cc;font-weight:700;font-size:15px;color:#1a2744;">${adultTotal}</td>
      </tr>` : ''

    const kidsSection = hasKids ? `
      <tr style="background:#f4f0f8;">
        <td style="padding:6px 10px;font-size:9px;letter-spacing:2px;color:#8a9ab5;border:1px solid #e0d8cc;">BAMBINO</td>
        ${hasAdult?ADULT_SIZES.map(()=>`<td style="border:1px solid #e0d8cc;background:#f4f0f8;"></td>`).join(''):''}
        ${KIDS_SIZES.map(sz=>`<td style="padding:6px;text-align:center;font-size:9px;color:#8a9ab5;border:1px solid #e0d8cc;">${sz}</td>`).join('')}
        <td style="padding:6px;text-align:center;font-size:9px;color:#8a9ab5;border:1px solid #e0d8cc;">TOT</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;border:1px solid #e0d8cc;font-size:11px;color:#8a9ab5;">pz</td>
        ${hasAdult?ADULT_SIZES.map(()=>`<td style="border:1px solid #e0d8cc;text-align:center;color:#ddd;">—</td>`).join(''):''}
        ${KIDS_SIZES.map(sz=>`<td style="padding:8px;text-align:center;border:1px solid #e0d8cc;font-size:13px;color:${(art.sizes.kids?.[sz]||0)>0?'#1a2744':'#ccc'};">${art.sizes.kids?.[sz]??0}</td>`).join('')}
        <td style="padding:8px;text-align:center;border:1px solid #e0d8cc;font-weight:700;font-size:15px;color:#1a2744;">${kidsTotal}</td>
      </tr>` : ''

    return `
      <div style="margin-bottom:28px;page-break-inside:avoid;">
        <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;">
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#1a2744;">${art.description}</div>
            <div style="font-size:10px;letter-spacing:2px;color:#8a9ab5;margin-top:2px;">${art.category} · ${art.line}</div>
          </div>
          <div style="margin-left:auto;text-align:right;">
            <div style="font-size:9px;letter-spacing:2px;color:#8a9ab5;">COLORE</div>
            <div style="font-size:13px;font-weight:700;color:#c4623a;">${art.color}</div>
          </div>
        </div>
        <table style="border-collapse:collapse;font-family:'Josefin Sans',sans-serif;width:100%;">
          ${adultSection}${kidsSection}
        </table>
        <div style="text-align:right;margin-top:6px;font-size:11px;color:#8a9ab5;">
          Totale pezzi: <strong style="color:#1a2744;">${adultTotal+kidsTotal}</strong>
        </div>
      </div>`
  }).join('')

  const clientDetailsBlock = (order.clientContact || order.clientEmail || order.clientPhone || order.clientCity) ? `
    <div style="margin-top:12px;display:flex;gap:28px;flex-wrap:wrap;">
      ${order.clientContact ? `<div><div style="font-size:9px;letter-spacing:2px;color:#8a9ab5;margin-bottom:2px;">REFERENTE</div><div style="font-size:13px;color:#1a2744;">${order.clientContact}</div></div>` : ''}
      ${order.clientEmail   ? `<div><div style="font-size:9px;letter-spacing:2px;color:#8a9ab5;margin-bottom:2px;">EMAIL</div><div style="font-size:13px;color:#1a2744;">${order.clientEmail}</div></div>` : ''}
      ${order.clientPhone   ? `<div><div style="font-size:9px;letter-spacing:2px;color:#8a9ab5;margin-bottom:2px;">TELEFONO</div><div style="font-size:13px;color:#1a2744;">${order.clientPhone}</div></div>` : ''}
      ${order.clientCity    ? `<div><div style="font-size:9px;letter-spacing:2px;color:#8a9ab5;margin-bottom:2px;">CITTÀ</div><div style="font-size:13px;color:#1a2744;">${order.clientCity}${order.clientCountry?', '+order.clientCountry:''}</div></div>` : ''}
    </div>` : ''

  const totalBlock = order.showTotalInClientPDF ? `
    <div style="margin-top:20px;padding-top:16px;border-top:2px solid #e0d8cc;">
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
        <div style="display:flex;justify-content:space-between;width:280px;">
          <span style="font-size:11px;color:#8a9ab5;letter-spacing:2px;">IMPONIBILE</span>
          <span style="font-size:15px;color:#1a2744;">€ ${subtotal.toFixed(2)}</span>
        </div>
        ${order.ivaEnabled ? `
        <div style="display:flex;justify-content:space-between;width:280px;">
          <span style="font-size:11px;color:#8a9ab5;letter-spacing:2px;">IVA ${order.ivaRate || 22}%</span>
          <span style="font-size:15px;color:#1a2744;">€ ${ivaAmt.toFixed(2)}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;width:280px;padding-top:8px;border-top:1px solid #e0d8cc;">
          <span style="font-size:11px;color:#1a2744;font-weight:700;letter-spacing:2px;">TOTALE ${order.ivaEnabled?'IVA INCL.':''}</span>
          <span style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#1a2744;font-weight:600;">€ ${total.toFixed(2)}</span>
        </div>
      </div>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Conferma Ordine — ${order.id}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Josefin+Sans:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Josefin Sans', sans-serif; color: #1a2744; margin: 0; background: #fff; }
    .print-btn { position:fixed;top:20px;right:20px;z-index:999;background:#1a2744;color:white;border:none;padding:12px 28px;font-family:'Josefin Sans',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;border-radius:3px;font-weight:600; }
    @media print { .print-btn { display:none!important; } body { print-color-adjust:exact;-webkit-print-color-adjust:exact; } @page { margin:15mm; margin-top:0 } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">↓ Salva / Stampa</button>

  <div style="background:#1a2744;padding:28px 40px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#f5f0e8;letter-spacing:6px;">DOUBLEU</div>
      <div style="font-size:9px;letter-spacing:3px;color:#b8965a;margin-top:4px;">MADE IN ITALY · PREMIUM CLUBWEAR</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;letter-spacing:3px;color:rgba(255,255,255,0.4);margin-bottom:4px;">CONFERMA ORDINE</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:26px;color:#f5f0e8;letter-spacing:3px;">${order.id}</div>
    </div>
  </div>

  <div style="background:#f8f5f0;padding:20px 40px;border-bottom:2px solid #e0d8cc;">
    <div style="display:flex;gap:40px;flex-wrap:wrap;">
      <div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">CLUB</div><div style="font-family:'Cormorant Garamond',serif;font-size:22px;color:#1a2744;">${order.client}</div></div>
      <div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">DATA ORDINE</div><div style="font-size:14px;font-weight:600;">${order.date}</div></div>
      <div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">TOTALE PEZZI</div><div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#c4623a;">${order.pieces}</div></div>
      ${order.pricingMode==='kit'?`<div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">TOTALE PERSONE</div><div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#1a2744;">${order.kits.reduce((s,k)=>s+(parseInt(k.quantity)||parseInt(order.kitQuantity)||0),0)}</div></div>`:''}
      <div><div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:4px;">STATO</div><div style="font-size:12px;font-weight:700;letter-spacing:2px;">${order.status}</div></div>
    </div>
    ${clientDetailsBlock}
    ${order.notes ? `<div style="margin-top:14px;padding:10px 16px;background:white;border-radius:6px;border:1px solid #e0d8cc;font-size:13px;color:#1a2744;">${order.notes}</div>` : ''}
  </div>

  <div style="padding:28px 40px;">
    <div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:24px;padding-bottom:10px;border-bottom:2px solid #e8e0d0;">Dettaglio Articoli</div>
    ${articleRows}
  </div>

  <div style="margin:0 40px 28px;background:#f8f5f0;border:1px solid #e0d8cc;border-radius:10px;padding:22px 28px;page-break-inside:avoid;">
    <div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:16px;">${order.pricingMode==='kit'?'COMPOSIZIONE KIT E PREZZI':'PREZZI PER ARTICOLO'}</div>
    ${pricingBlock}
    ${totalBlock}
  </div>

  <div style="margin:0 40px 28px;padding:22px 28px;border:1px solid #e0d8cc;border-radius:10px;page-break-inside:avoid;">
    <div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:16px;">CONDIZIONI GENERALI DI VENDITA</div>
    <div style="font-size:11px;color:#555;line-height:1.8;">
      <p style="margin-bottom:8px;"><strong>1. Oggetto</strong> — Le presenti condizioni regolano la vendita di prodotti personalizzati a marchio DOUBLEU. Tutti i prodotti sono realizzati su richiesta e personalizzati secondo le specifiche approvate dal cliente.</p>
      <p style="margin-bottom:8px;"><strong>2. Conferma dell'Ordine</strong> — L'ordine si considera confermato al verificarsi congiunto di: firma del presente documento, approvazione grafica definitiva, versamento dell'acconto previsto.</p>
      <p style="margin-bottom:8px;"><strong>3. Produzione e Tempistiche</strong> — I tempi decorrono dalla data di conferma definitiva. Le tempistiche sono indicative e possono variare per cause di forza maggiore.</p>
      <p style="margin-bottom:8px;"><strong>4. Prodotti Personalizzati</strong> — Non è previsto diritto di recesso. Non è possibile annullare l'ordine dopo l'avvio della produzione. Non sono accettati resi per errori di taglia comunicati dal cliente.</p>
      <p style="margin-bottom:8px;"><strong>5. Pagamenti</strong> — Acconto al momento della conferma, saldo alla consegna, salvo accordi diversi.</p>
      <p style="margin-bottom:0;"><strong>6. Foro Competente</strong> — Per ogni controversia è competente il Foro di Salerno.</p>
    </div>
  </div>

  <div style="margin:0 40px 40px;padding:28px;border:1px solid #e0d8cc;border-radius:10px;page-break-inside:avoid;">
    <div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:24px;">FIRMA PER ACCETTAZIONE</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;">
      <div>
        <div style="font-size:10px;color:#8a9ab5;letter-spacing:2px;margin-bottom:8px;">LUOGO E DATA</div>
        <div style="border-bottom:1px solid #aaa;height:36px;margin-bottom:8px;"></div>
        <div style="font-size:9px;color:#aaa;">_________________________________</div>
      </div>
      <div>
        <div style="font-size:10px;color:#8a9ab5;letter-spacing:2px;margin-bottom:8px;">FIRMA DEL CLIENTE</div>
        <div style="border-bottom:1px solid #aaa;height:36px;margin-bottom:8px;"></div>
        <div style="font-size:9px;color:#aaa;">Per accettazione condizioni e ordine</div>
      </div>
    </div>
  </div>

  <!-- FOOTER - solo sito web, niente indirizzo fisico -->
  <div style="background:#1a2744;padding:16px 40px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:9px;letter-spacing:3px;color:#b8965a;">DOUBLEU · MADE IN ITALY · www.doubleutennis.com</div>
    <div style="font-size:9px;color:rgba(255,255,255,0.3);">Generato il ${new Date().toLocaleDateString('it-IT')}</div>
  </div>
</body>
</html>`
}
