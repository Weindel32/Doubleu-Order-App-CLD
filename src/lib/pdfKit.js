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
        // Lo stato (style 'clay') chiude la fascia allineato al margine destro
        const right = f.style === 'clay'
        k.sans().size(6.2)
        const labW = k.spacedWidth(f.label, 0.7)
        if (right) { k.sans().size(6.2).color(C.MUTED).spaced(f.label, k.R, y, { align: 'right' }, 0.7); k.sans('bold').size(9).color(C.CLAY).spaced(f.value, k.R, y + 7, { align: 'right' }, 0.8); continue }
        k.label(f.label, x, y)
        if (f.style === 'serif') k.serif().size(15).color(C.NAVY)
        else if (f.style === 'big') k.serif().size(20).color(C.CLAY)
        else if (f.style === 'clay') k.sans('bold').size(9).color(C.CLAY)
        else k.sans('bold').size(10).color(C.NAVY)
        if (f.style === 'clay') k.spaced(f.value, x, y + 7, {}, 0.8); else k.text(f.value, x, y + 7)
        const valW = f.style === 'clay' ? k.spacedWidth(f.value, 0.8) : doc.getTextWidth(String(f.value ?? ''))
        x += Math.max(f.min || 30, valW + 9, labW + 8)
      }
    },

    // Piede su ogni pagina: testo a sinistra, "pagina x di y" (e altro) a destra
    footer(left, right = '', pageWord = (p, n) => `pagina ${p} di ${n}`) {
      const pages = doc.getNumberOfPages()
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p)
        k.rule(k.H - 12, C.BORDER, 0.2)
        k.sans().size(6.5).color(C.MUTED).spaced(left, k.M, k.H - 8, {}, 0.8)
        k.text([right, pageWord(p, pages)].filter(Boolean).join(' · '), k.R, k.H - 8, { align: 'right' })
      }
    },

    blob() { return doc.output('blob') },
  }
  return k
}

// ── Blocchi condivisi dai documenti per il club (preventivo, conferma ordine) ──

const ADULT = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const KIDS = ['4', '6', '8', '10', '12', '14', '16']
export const sizesSum = (sizes, vals) => sizes.reduce((s, sz) => s + (parseInt(vals?.[sz]) || 0), 0)
export const artPieces = (art) => sizesSum(ADULT, art.sizes?.adult) + sizesSum(KIDS, art.sizes?.kids) + (art.sizes?.uni || 0)

// Fascia del club sotto l'intestazione: campi, contatti, nota in evidenza e note libere.
export function clientBand(k, order, fields, { noteTitle, bg = C.BEIGE } = {}) {
  const { doc, M, R, W } = k
  const details = [
    ['REFERENTE', order.clientContact], ['EMAIL', order.clientEmail], ['TELEFONO', order.clientPhone],
    ['CITTÀ', order.clientCity ? order.clientCity + (order.clientCountry ? ', ' + order.clientCountry : '') : ''],
  ].filter(([, v]) => v)
  k.sans().size(9)
  const noteLines = order.orderNote ? k.wrap(order.orderNote, R - M - 10) : []
  const notesLines = order.notes ? k.wrap(order.notes, R - M - 10) : []
  const bandH = 22 + (details.length ? 13 : 0) + (noteLines.length ? 10 + noteLines.length * 4.3 : 0) + (notesLines.length ? 8 + notesLines.length * 4.3 : 0)
  doc.setFillColor(bg); doc.rect(0, 30, W, bandH, 'F')
  k.rule(30 + bandH, C.BORDER, 0.5, 0, W)
  k.fields(fields, 38)
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
    k.sans().size(6.2).color(C.CLAY).spaced(noteTitle, M + 5, y + 4.5, {}, 0.7)
    k.sans().size(9).color(C.NAVY); doc.text(noteLines, M + 5, y + 9, { lineHeightFactor: 1.4 })
    y += h + 2
  }
  if (notesLines.length) {
    const h = 5 + notesLines.length * 4.3
    doc.setFillColor('#ffffff'); doc.setDrawColor(C.BORDER); doc.setLineWidth(0.2); doc.roundedRect(M, y, R - M, h, 1.5, 1.5, 'FD')
    k.sans().size(9).color(C.NAVY); doc.text(notesLines, M + 5, y + 5.5, { lineHeightFactor: 1.4 })
  }
  k.y = 30 + bandH + 8
}

// Griglie taglie complete (adulto, bambino) con gli zeri in grigio. Altezza: 13 mm per griglia.
export const sizeGridsCount = (art) => (sizesSum(ADULT, art.sizes?.adult) > 0 ? 1 : 0) + (sizesSum(KIDS, art.sizes?.kids) > 0 ? 1 : 0)
export function sizeGrids(k, x, y, art) {
  const { doc } = k
  const grids = [
    sizesSum(ADULT, art.sizes?.adult) > 0 && ['ADULTO', ADULT, art.sizes.adult],
    sizesSum(KIDS, art.sizes?.kids) > 0 && ['BAMBINO', KIDS, art.sizes.kids],
  ].filter(Boolean)
  const cw = 11, lw = 18
  for (const [name, sizes, vals] of grids) {
    const cells = [name, ...sizes, 'TOT']
    doc.setDrawColor(C.BORDER); doc.setLineWidth(0.2)
    cells.forEach((c, i) => {
      const cx = i === 0 ? x : x + lw + (i - 1) * cw, ww = i === 0 ? lw : cw, last = i === cells.length - 1
      doc.setFillColor(last ? C.WARM : '#f0ece4'); doc.rect(cx, y, ww, 6, 'FD')
      doc.setFillColor(last ? C.WARM : '#ffffff'); doc.rect(cx, y + 6, ww, 6.5, 'FD')
      k.sans(i === 0 ? 'bold' : 'normal').size(6).color(i === 0 ? C.NAVY : C.MUTED).text(name === 'BAMBINO' && i > 0 && !last ? `${c} anni` : c, cx + ww / 2, y + 4.1, { align: 'center' })
      if (i > 0) {
        const v = last ? sizesSum(sizes, vals) : (parseInt(vals[c]) || 0)
        k.serif().size(11).color(last ? C.CLAY : v > 0 ? C.NAVY : C.DIM).text(String(v), cx + ww / 2, y + 11, { align: 'center' })
      }
    })
    y += 13
  }
  return y
}

// Riquadro con titolo e paragrafi "Titolo — testo" (titolo in grassetto). Non si spezza.
export function paragraphBox(k, title, paras) {
  const { doc, M, R } = k
  k.sans().size(8)
  const lines = paras.map(([b, t]) => k.wrap(`${b} — ${t}`, R - M - 12))
  const boxH = 12 + lines.reduce((s, l) => s + l.length * 4.2 + 2, 0)
  k.ensure(boxH + 4); k.y += 4
  doc.setDrawColor(C.BORDER); doc.setLineWidth(0.3); doc.roundedRect(M, k.y, R - M, boxH, 2, 2)
  k.sans().size(6.5).color(C.MUTED).spaced(title, M + 6, k.y + 7, {}, 1.2)
  let py = k.y + 13
  paras.forEach(([bold], i) => {
    lines[i].forEach((line, j) => {
      if (j === 0) {
        const head = bold + ' — '
        k.sans('bold').size(8).color(C.TEXT).text(head, M + 6, py)
        k.sans().text(line.slice(head.length), M + 6 + doc.getTextWidth(head), py)
      } else k.sans().size(8).color(C.TEXT).text(line, M + 6, py)
      py += 4.2
    })
    py += 2
  })
  k.y += boxH + 4
}

// Riquadro beige dei prezzi: titolo, righe [altezza, disegna(y)] e coda (totali, note).
// Se non sta in una pagina continua sulla successiva, chiudendo e riaprendo il bordo.
export function priceBox(k, title, rows, tailH, drawTail) {
  const { doc, M, R } = k
  const inX = M + 7, inR = R - 7
  let boxTop = null
  const closeBox = () => { doc.setDrawColor(C.BORDER); doc.setLineWidth(0.3); doc.roundedRect(M, boxTop, R - M, k.y - boxTop, 2, 2) }
  const fill = (h) => { doc.setFillColor(C.BEIGE); doc.rect(M + 0.15, k.y, R - M - 0.3, h, 'F') }
  const need = (h) => { if (k.y + h > k.BOTTOM) { closeBox(); doc.addPage(); k.y = k.M; boxTop = k.y } }

  k.ensure(16 + (rows[0]?.[0] || 0)); k.y += 2; boxTop = k.y
  fill(12); k.sans().size(6.5).color(C.MUTED).spaced(title, inX, k.y + 8, {}, 1.2); k.y += 12
  rows.forEach(([h, draw], i) => {
    need(h); fill(h); draw(k.y); k.y += h
    if (i < rows.length - 1 || tailH) k.rule(k.y - 2, '#e8e0d0', 0.2, inX, inR)
  })
  if (tailH) { need(tailH); fill(tailH); drawTail(k.y); k.y += tailH }
  closeBox()
  k.y += 4
}

// Righe dei totali allineate a destra: [[etichetta, valore, colore?]], poi il totale grande.
export const totalsHeight = (rows) => 6 + rows.length * 6 + 12
export function totals(k, y, rows, totalLabel, totalValue, totalColor = C.CLAY) {
  const inR = k.R - 7, lx = inR - 100
  k.rule(y, C.BORDER, 0.5, k.M + 7, inR); y += 4
  rows.forEach(([l, v, col]) => {
    k.sans().size(7).color(C.MUTED).spaced(l, lx, y + 2, {}, 0.6)
    k.sans().size(10).color(col || C.NAVY).text(v, inR, y + 2, { align: 'right' }); y += 6
  })
  k.rule(y - 1, C.BORDER, 0.2, lx, inR); y += 4
  k.sans('bold').size(7.5).color(C.NAVY).spaced(totalLabel, lx, y + 2, {}, 0.6)
  k.serif().size(18).color(totalColor).text(totalValue, inR, y + 3, { align: 'right' })
  return y + 8
}
