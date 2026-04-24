import { useState } from 'react'
import { CREAM, GOLD, MUTED, CLAY, BORDER } from '../tokens.js'
import { getAllArticles, artPieceCount } from '../utils/helpers.js'
import { generateDeliveryPDF } from '../utils/pdfDelivery.js'

export default function BollaModal({ order, onClose }) {
  const allArticles = getAllArticles(order)
  const [selected, setSelected] = useState(new Set())

  const toggle = (idx) => setSelected(prev => {
    const next = new Set(prev)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    return next
  })

  const toggleAll = () =>
    setSelected(selected.size === allArticles.length ? new Set() : new Set(allArticles.map((_, i) => i)))

  const generate = () => {
    const articles = allArticles.filter((_, i) => selected.has(i))
    const h = generateDeliveryPDF(order, articles)
    const w = window.open('', '_blank')
    w.document.write(h)
    w.document.close()
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#1e2d50', border:`1px solid ${BORDER}`, borderRadius:12, padding:28, width:480, maxWidth:'90vw', maxHeight:'80vh', display:'flex', flexDirection:'column', gap:16 }}>

        <div>
          <div style={{ fontSize:9, letterSpacing:3, color:MUTED, marginBottom:4 }}>BOLLA DI CONSEGNA</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:CREAM }}>{order.client}</div>
          <div style={{ fontSize:11, color:MUTED, marginTop:2 }}>Seleziona gli articoli da includere in questa spedizione</div>
        </div>

        <div style={{ borderTop:`1px solid ${BORDER}`, borderBottom:`1px solid ${BORDER}`, overflowY:'auto', maxHeight:340, paddingTop:8, paddingBottom:8 }}>
          <label style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', cursor:'pointer', borderBottom:`1px solid rgba(255,255,255,0.06)`, marginBottom:4 }}>
            <input type="checkbox" checked={selected.size === allArticles.length && allArticles.length > 0} onChange={toggleAll} style={{ accentColor:GOLD, width:15, height:15 }} />
            <span style={{ fontSize:10, letterSpacing:2, color:MUTED }}>SELEZIONA TUTTI</span>
          </label>

          {allArticles.map((art, i) => {
            const pz = artPieceCount(art)
            return (
              <label key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 4px', cursor:'pointer', borderRadius:4, background: selected.has(i) ? 'rgba(184,150,90,0.08)' : 'transparent' }}>
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} style={{ accentColor:GOLD, width:15, height:15, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:CREAM }}>{art.description}</div>
                  <div style={{ fontSize:10, color:MUTED }}>{art.category} · {art.line}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:11, color:CLAY, fontWeight:600 }}>{art.color}</div>
                  <div style={{ fontSize:12, color:GOLD }}>{pz} pz</div>
                </div>
              </label>
            )
          })}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:11, color:MUTED }}>
            {selected.size > 0
              ? `${selected.size} articol${selected.size === 1 ? 'o' : 'i'} · ${allArticles.filter((_,i)=>selected.has(i)).reduce((s,a)=>s+artPieceCount(a),0)} pz`
              : 'Nessun articolo selezionato'}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ padding:'8px 18px', fontSize:11, letterSpacing:1, background:'transparent', border:`1px solid ${BORDER}`, color:MUTED, borderRadius:4, cursor:'pointer' }}>
              Annulla
            </button>
            <button onClick={generate} disabled={selected.size === 0} style={{ padding:'8px 18px', fontSize:11, letterSpacing:1, background: selected.size > 0 ? 'rgba(122,174,232,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${selected.size > 0 ? 'rgba(122,174,232,0.4)' : BORDER}`, color: selected.size > 0 ? '#7aaee8' : MUTED, borderRadius:4, cursor: selected.size > 0 ? 'pointer' : 'default' }}>
              ↓ Genera Bolla
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
