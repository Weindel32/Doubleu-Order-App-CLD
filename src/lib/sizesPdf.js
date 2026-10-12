import { ADULT_SIZES, KIDS_SIZES } from '../tokens.js'
import { linePieces, formPieces } from './orderForms.js'

// PDF del riepilogo taglie per il cliente, generato nel browser.
// Non passa dalla stampa del browser: Safari su iPhone aggiunge sempre
// indirizzo, data e numero di pagina a pie' di foglio e non si possono togliere.
// Caratteri del marchio in /public/fonts, caricati solo quando serve il PDF.
//
//   const blob = await buildSizesPdf({ form, lines, sizes })
//   await shareOrDownload(blob, sizesPdfName(form))

const INK = '#111d38', GOLD = '#8c6d3a', MUTED = '#5f6a80'
const BORDER = '#cfc6b4', HEAD_BG = '#f3eee4', OFF_BG = '#f6f4f0'

const FONTS = [
  ['CormorantGaramond-SemiBold.ttf', 'Cormorant', 'normal'],
  ['JosefinSans-Regular.ttf', 'Josefin', 'normal'],
  ['JosefinSans-Bold.ttf', 'Josefin', 'bold'],
]

async function loadFonts() {
  return Promise.all(FONTS.map(async ([file, family, style]) => {
    const res = await fetch(`/fonts/${file}`)
    if (!res.ok) throw new Error(`font ${file}: ${res.status}`)
    const bytes = new Uint8Array(await res.arrayBuffer())
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
    return { file, family, style, data: btoa(bin) }
  }))
}

const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('it-IT', {
  timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : ''

export const sizesPdfName = (form) =>
  ['Riepilogo taglie', form?.order_id, form?.client_name].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]/g, '') + '.pdf'

export async function buildSizesPdf({ form, lines, sizes }) {
  const [{ jsPDF }, fonts] = await Promise.all([import('jspdf'), loadFonts()])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  for (const f of fonts) {
    doc.addFileToVFS(f.file, f.data)
    doc.addFont(f.file, f.family, f.style)
  }
  doc.setProperties({ title: sizesPdfName(form).replace(/\.pdf$/, ''), author: 'DOUBLEU' })

  const W = 210, H = 297, M = 12, R = W - M
  const sans = (style = 'normal') => doc.setFont('Josefin', style)
  const serif = () => doc.setFont('Cormorant', 'normal')

  // Intestazione
  serif(); doc.setTextColor(INK); doc.setFontSize(22); doc.setCharSpace(1.6)
  doc.text('DOUBLEU', M, 22)
  doc.setCharSpace(0.7); sans(); doc.setFontSize(7); doc.setTextColor(GOLD)
  doc.text('RIEPILOGO TAGLIE', M, 28)
  doc.setCharSpace(0)
  serif(); doc.setTextColor(INK); doc.setFontSize(14)
  doc.text(form.client_name || '', R, 17, { align: 'right' })
  sans(); doc.setFontSize(8.5)
  doc.text(`Ordine ${form.order_id || ''}`, R, 22.5, { align: 'right' })
  if (form.submitted_at) {
    doc.text(`Inviato il ${fmtDateTime(form.submitted_at)}${form.contact_name ? ` da ${form.contact_name}` : ''}`, R, 27, { align: 'right' })
  }
  doc.setDrawColor(INK); doc.setLineWidth(0.6); doc.line(M, 31, R, 31)

  // Colonne: bambino (anni) poi adulto. Taglia unica senza colonna: la
  // quantita' sta nel totale della riga.
  const has = (g) => lines.some(l => l.grids.includes(g))
  const cols = [
    ...(has('kids')  ? KIDS_SIZES.map(sz => ({ g: 'kids', sz, sub: 'anni' })) : []),
    ...(has('adult') ? ADULT_SIZES.map(sz => ({ g: 'adult', sz })) : []),
  ]
  const artW = cols.length ? 58 : R - M - 16
  const colW = (R - M - artW) / (cols.length + 1)
  const x0 = M + artW
  doc.setDrawColor(BORDER); doc.setLineWidth(0.2)

  const box = (x, y, w, h, fill) => {
    if (fill) { doc.setFillColor(fill); doc.rect(x, y, w, h, 'FD') } else doc.rect(x, y, w, h)
  }
  const center = (txt, x, w, y) => doc.text(String(txt), x + w / 2, y, { align: 'center' })

  const headH = 9
  const drawHead = (y) => {
    sans('bold'); doc.setFontSize(7.5); doc.setTextColor(INK)
    box(M, y, artW, headH, HEAD_BG); doc.text('Articolo', M + 2, y + 5.6)
    cols.forEach((c, i) => {
      const x = x0 + i * colW
      box(x, y, colW, headH, HEAD_BG)
      if (c.sub) {
        center(c.sz, x, colW, y + 4.3)
        sans(); doc.setFontSize(5.5); center(c.sub, x, colW, y + 7.3); sans('bold'); doc.setFontSize(7.5)
      } else center(c.sz, x, colW, y + 5.6)
    })
    box(x0 + cols.length * colW, y, colW, headH, HEAD_BG); center('Tot.', x0 + cols.length * colW, colW, y + 5.6)
    return y + headH
  }

  let y = drawHead(36)
  const bottom = H - 16
  for (const l of lines) {
    sans('bold'); doc.setFontSize(8.5)
    const title = doc.splitTextToSize(l.description || l.category || '', artW - 4)
    sans(); doc.setFontSize(6.8)
    const meta = doc.splitTextToSize([l.color, l.sp, l.kit, l.grids.includes('uni') ? 'taglia unica' : null].filter(Boolean).join(' · '), artW - 4)
    const rowH = Math.max(10, 3.5 + title.length * 3.6 + meta.length * 3 + 1.5)
    if (y + rowH > bottom) { doc.addPage(); y = drawHead(M + 4) }

    box(M, y, artW, rowH)
    sans('bold'); doc.setFontSize(8.5); doc.setTextColor(INK)
    doc.text(title, M + 2, y + 4.6, { lineHeightFactor: 1.2 })
    sans(); doc.setFontSize(6.8); doc.setTextColor(MUTED)
    doc.text(meta, M + 2, y + 4.6 + title.length * 3.6, { lineHeightFactor: 1.25 })

    const mid = y + rowH / 2 + 1.2
    sans(); doc.setFontSize(9); doc.setTextColor(INK)
    cols.forEach((c, i) => {
      const x = x0 + i * colW
      const on = l.grids.includes(c.g)
      box(x, y, colW, rowH, on ? null : OFF_BG)
      const v = on ? (parseInt(sizes[l.key]?.[c.g]?.[c.sz]) || 0) : 0
      if (v > 0) center(v, x, colW, mid)
    })
    box(x0 + cols.length * colW, y, colW, rowH)
    sans('bold'); center(linePieces(l, sizes), x0 + cols.length * colW, colW, mid)
    y += rowH
  }

  // Totale
  if (y + 9 > bottom) { doc.addPage(); y = M + 4 }
  box(M, y, artW + cols.length * colW, 9); box(x0 + cols.length * colW, y, colW, 9)
  sans('bold'); doc.setFontSize(8.5); doc.setTextColor(INK)
  doc.text('Totale pezzi', x0 + cols.length * colW - 2, y + 5.8, { align: 'right' })
  doc.setFontSize(10); center(formPieces(lines, sizes), x0 + cols.length * colW, colW, y + 5.9)
  y += 9

  // Note e chiusura
  if (form.client_note) {
    sans(); doc.setFontSize(8.5)
    const note = doc.splitTextToSize(form.client_note, R - M - 12)
    if (y + 8 + note.length * 4 > bottom) { doc.addPage(); y = M }
    sans('bold'); doc.text('Note:', M, y + 7)
    sans(); doc.text(note, M + 10, y + 7, { lineHeightFactor: 1.35 })
    y += 7 + note.length * 4
  }
  if (y + 12 > bottom) { doc.addPage(); y = M }
  y += 7
  doc.setDrawColor(BORDER); doc.line(M, y, R, y)
  sans(); doc.setFontSize(7); doc.setTextColor(MUTED)
  doc.text(`${form.locked
    ? 'Ordine in produzione: per qualsiasi modifica contattate DOUBLEU.'
    : 'Le taglie si possono correggere dallo stesso link fino all\'avvio della produzione.'}   ·   doubleutennis.com`, M, y + 5)

  return doc.output('blob')
}

// Telefono: foglio di condivisione con il file (WhatsApp, Mail, File…).
// Computer: download. Va chiamata subito al tocco, col PDF gia' pronto:
// Safari permette la condivisione solo in risposta diretta al gesto.
export async function shareOrDownload(blob, name) {
  const file = new File([blob], name, { type: 'application/pdf' })
  const touch = window.matchMedia?.('(pointer: coarse)').matches
  if (touch && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name.replace(/\.pdf$/, '') }); return }
    catch (e) { if (e?.name === 'AbortError') return }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
