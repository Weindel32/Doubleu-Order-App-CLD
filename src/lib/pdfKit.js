import { loadFonts } from './sizesPdf.js'

// Base comune dei PDF veri (jsPDF) dell'app: caratteri del marchio, intestazione blu, fascia dati,
// salto pagina e piede. Non passano dalla stampa del browser: niente link e data aggiunti da
// Safari/Chrome. Misure in mm, A4 verticale.

export const C = {
  NAVY: '#1a2744', CREAM: '#f5f0e8', GOLD: '#b8965a', CLAY: '#c4623a', MUTED: '#8a9ab5',
  BEIGE: '#f8f5f0', WARM: '#fff7f0', BORDER: '#e0d8cc', RULE: '#eee6da', TEXT: '#555555', SOFT: '#5a6a85', DIM: '#cccccc',
}

// 1234.5 → "€ 1.234,50"
export const eur = (n) => '€ ' + (Number(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const pdfName = (...parts) => parts.filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]/g, '') + '.pdf'

export async function newPdf(title) {
  const [{ jsPDF }, fonts] = await Promise.all([import('jspdf'), loadFonts()])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  for (const f of fonts) { doc.addFileToVFS(f.file, f.data); doc.addFont(f.file, f.family, f.style) }
  doc.setProperties({ title, author: 'DOUBLEU' })

  const k = {
    doc, W: 210, H: 297, M: 16, R: 194, BOTTOM: 281, y: 16,
    sans(style = 'normal') { doc.setFont('Josefin', style); return k },
    serif() { doc.setFont('Cormorant', 'normal'); return k },
    size(n) { doc.setFontSize(n); return k },
    color(c) { doc.setTextColor(c); return k },
    // Testo con spaziatura tra le lettere (etichette in maiuscolo)
    spaced(txt, x, y, opts = {}, cs = 0.6) {
      const s = String(txt)
      // jsPDF allinea senza contare la spaziatura: a destra o al centro si calcola a mano.
      const w = doc.getTextWidth(s) + cs * Math.max(0, s.length - 1)
      const { align, ...rest } = opts
      const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x
      doc.setCharSpace(cs); doc.text(s, x0, y, rest); doc.setCharSpace(0)
    },
    // Larghezza di un'etichetta spaziata con il carattere corrente
    spacedWidth(txt, cs = 0.6) { const s = String(txt); return doc.getTextWidth(s) + cs * Math.max(0, s.length - 1) },
    text(txt, x, y, opts) { doc.text(String(txt ?? ''), x, y, opts) },
    // Righe di testo che stanno in `width` con il carattere corrente
    wrap(txt, width) { return txt ? doc.splitTextToSize(String(txt), width) : [] },
    // Se il blocco alto `h` non sta nella pagina, si va alla successiva
    ensure(h) { if (k.y + h > k.BOTTOM) { doc.addPage(); k.y = k.M } },
    label(txt, x, y) { k.sans().size(6.2).color(C.MUTED).spaced(txt, x, y, {}, 0.7) },
    rule(y, color = C.RULE, w = 0.3, x1 = k.M, x2 = k.R) { doc.setDrawColor(color); doc.setLineWidth(w); doc.line(x1, y, x2, y) },

    // Intestazione blu: DOUBLEU a sinistra, tipo di documento e numero a destra.
    header(kind, id) {
      doc.setFillColor(C.NAVY); doc.rect(0, 0, k.W, 30, 'F')
      k.serif().size(22).color(C.CREAM).spaced('DOUBLEU', k.M, 15, {}, 2)
      k.sans().size(6.5).color(C.GOLD).spaced('MADE IN ITALY · PREMIUM CLUBWEAR', k.M, 21.5)
      k.spaced(kind, k.R, 12.5, { align: 'right' })
      k.serif().size(17).color(C.CREAM).spaced(id || '', k.R, 21.5, { align: 'right' }, 0.8)
      k.y = 30
    },

    // Fascia sotto l'intestazione con campi affiancati: [{ label, value, style: 'serif'|'bold'|'big'|'clay' }]
    fields(list, y) {
      let x = k.M
      for (const f of list) {
        k.sans().size(6.2)
        const labW = k.spacedWidth(f.label, 0.7)
        k.label(f.label, x, y)
        if (f.style === 'serif') k.serif().size(15).color(C.NAVY)
        else if (f.style === 'big') k.serif().size(20).color(C.CLAY)
        else if (f.style === 'clay') k.sans('bold').size(9).color(C.CLAY)
        else k.sans('bold').size(10).color(C.NAVY)
        if (f.style === 'clay') k.spaced(f.value, x, y + 7, {}, 0.8); else k.text(f.value, x, y + 7)
        const valW = f.style === 'clay' ? k.spacedWidth(f.value, 0.8) : doc.getTextWidth(String(f.value ?? ''))
        x += Math.max(f.min || 34, valW + 12, labW + 10)
      }
    },

    // Piede su ogni pagina: testo a sinistra, "pagina x di y" (e altro) a destra
    footer(left, right = '') {
      const pages = doc.getNumberOfPages()
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p)
        k.rule(k.H - 12, C.BORDER, 0.2)
        k.sans().size(6.5).color(C.MUTED).spaced(left, k.M, k.H - 8, {}, 0.8)
        k.text([right, `pagina ${p} di ${pages}`].filter(Boolean).join(' · '), k.R, k.H - 8, { align: 'right' })
      }
    },

    blob() { return doc.output('blob') },
  }
  return k
}
