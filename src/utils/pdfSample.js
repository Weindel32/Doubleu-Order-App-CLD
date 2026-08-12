import { PURPOSE_LABELS, fmtDate, recipientLabel } from './samples.js'

// Documento da allegare alla spedizione dei campioni: elenco articoli
// senza prezzo, con dichiarazione che restano di proprietà DOUBLEU e
// che danni o mancata restituzione vengono addebitati. Niente valori
// economici — è un documento che esce dall'azienda e finisce nelle
// mani del cliente, non un preventivo.
export function generateSamplePDF(shipment, clients = [], prospects = []) {
  const recipient = recipientLabel(shipment, clients, prospects)
  const items = shipment.items || []
  const totalPieces = items.reduce((s, it) => s + (parseInt(it.quantity) || 0), 0)
  const mustReturn = !!shipment.return_required

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
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Bolla Campioni — ${recipient}</title>
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
  <button class="print-btn" onclick="window.print()">↓ Stampa / Salva</button>

  <!-- HEADER -->
  <div style="background:#1a2744;padding:20px 40px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#f5f0e8;letter-spacing:5px;">DOUBLEU</div>
      <div style="font-size:9px;letter-spacing:3px;color:#b8965a;margin-top:3px;">MADE IN ITALY · PREMIUM CLUBWEAR</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;letter-spacing:3px;color:rgba(255,255,255,0.4);margin-bottom:3px;">BOLLA CAMPIONI</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;color:#f5f0e8;letter-spacing:2px;">${fmtDate(shipment.shipped_date)}</div>
    </div>
  </div>

  <!-- INFO -->
  <div style="background:#f8f5f0;padding:16px 40px;border-bottom:2px solid #e0d8cc;display:flex;gap:40px;flex-wrap:wrap;">
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">DESTINATARIO</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#1a2744;">${recipient}</div>
      ${shipment.contact_name ? `<div style="font-size:11px;color:#666;margin-top:2px;">c.a. ${shipment.contact_name}</div>` : ''}
    </div>
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">MOTIVO INVIO</div>
      <div style="font-size:14px;font-weight:600;color:#1a2744;">${PURPOSE_LABELS[shipment.purpose] || shipment.purpose || '—'}</div>
    </div>
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">PEZZI</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#c4623a;line-height:1;">${totalPieces}</div>
    </div>
    ${shipment.carrier ? `
    <div>
      <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:3px;">CORRIERE</div>
      <div style="font-size:14px;font-weight:600;color:#1a2744;">${shipment.carrier}${shipment.tracking ? ` · ${shipment.tracking}` : ''}</div>
    </div>` : ''}
  </div>

  <!-- ARTICOLI -->
  <div style="padding:24px 40px;">
    <div style="font-size:9px;letter-spacing:4px;color:#8a9ab5;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #e0d8cc;">
      Elenco Campioni
    </div>
    <table>
      <thead>
        <tr>
          ${['Codice','Descrizione','Categoria','Colore','Taglia','Q.tà'].map(h =>
            `<th style="padding:8px 12px;border:1px solid #e0d8cc;background:#f5f5f5;text-align:left;font-size:9px;letter-spacing:2px;color:#666;">${h}</th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <!-- CLAUSOLA PROPRIETÀ ─────────────────────────────────────── -->
  <div style="margin:0 40px 24px;background:#f8f5f0;border:1px solid #e0d8cc;border-radius:8px;padding:20px 24px;page-break-inside:avoid;break-inside:avoid;">
    <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:10px;">CONDIZIONI</div>
    <div style="font-size:11.5px;color:#444;line-height:1.8;">
      I capi elencati in questa bolla sono forniti in visione a titolo gratuito e restano
      di proprietà esclusiva di DOUBLEU.
      ${mustReturn
        ? `Il destinatario si impegna a restituirli integri${shipment.return_due_date ? ` entro il ${fmtDate(shipment.return_due_date)}` : ''}. `
        : ''}
      In caso di danneggiamento, mancata restituzione o perdita dei campioni, il relativo
      costo verrà addebitato al destinatario secondo il listino DOUBLEU in vigore al
      momento della consegna.
    </div>
  </div>

  <!-- FIRMA RICEVUTA -->
  <div style="margin:0 40px 40px;padding:20px 24px;border:1px solid #e0d8cc;border-radius:8px;page-break-inside:avoid;break-inside:avoid;">
    <div style="font-size:9px;letter-spacing:3px;color:#8a9ab5;margin-bottom:6px;">RICEVUTA E ACCETTAZIONE CONDIZIONI</div>
    <div style="font-size:10.5px;color:#888;margin-bottom:16px;">Il sottoscritto dichiara di aver ricevuto i campioni sopra elencati e di accettare le condizioni riportate.</div>
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
