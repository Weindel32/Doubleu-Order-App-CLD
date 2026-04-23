import { GOLD, MUTED, CREAM, CLAY, NAVY, BORDER, SURFACE, GREEN } from '../tokens.js'
import { s } from '../tokens.js'
import { getAllArticles, artPieceCount, orderTotal } from '../utils/helpers.js'

const CAT_COLORS = { 'Felpa':CLAY,'T-Shirt':GOLD,'Polo':'#7aaee8','Short':GREEN,'Giacca':'#e8c96e','Pantalone':MUTED,'Altro':'#c87ae8' }
const LINE_COLORS = { 'Performance':CLAY,'Club':GOLD,'Training':'#7aaee8','Lifestyle':GREEN }

function BarChart({ data, title, colorFn }) {
  const entries = Object.entries(data).sort((a,b)=>b[1]-a[1])
  const maxVal  = Math.max(...entries.map(e=>e[1]),1)
  return (
    <div style={{...s.card,marginBottom:0}}>
      <div style={s.cardTitle}>{title}</div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {entries.map(([label,val])=>(
          <div key={label}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
              <span style={{fontSize:11,color:CREAM,letterSpacing:1}}>{label}</span>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:GOLD}}>{val} <span style={{fontSize:11,color:MUTED}}>pz</span></span>
            </div>
            <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.round((val/maxVal)*100)}%`,background:colorFn?colorFn(label):`linear-gradient(90deg,${GOLD},${CLAY})`,borderRadius:3,transition:'width 0.6s'}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutChart({ data, title }) {
  const entries = Object.entries(data).sort((a,b)=>b[1]-a[1])
  const total   = entries.reduce((s,[,v])=>s+v,0)
  const colors  = [GOLD,CLAY,'#7aaee8',GREEN,'#e8c96e',MUTED,'#c87ae8']
  const r=56,cx=70,cy=70; let cumAngle=-90

  const arcs = entries.map(([label,val],i)=>{
    const pct=val/total, angle=pct*360, start=cumAngle; cumAngle+=angle
    const startRad=(start*Math.PI)/180, endRad=((start+angle)*Math.PI)/180
    const x1=cx+r*Math.cos(startRad),y1=cy+r*Math.sin(startRad)
    const x2=cx+r*Math.cos(endRad),y2=cy+r*Math.sin(endRad)
    return {label,val,pct,color:colors[i%colors.length],d:`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${angle>180?1:0} 1 ${x2} ${y2} Z`}
  })

  return (
    <div style={{...s.card,marginBottom:0}}>
      <div style={s.cardTitle}>{title}</div>
      <div style={{display:'flex',gap:28,alignItems:'center',flexWrap:'wrap'}}>
        <svg width="140" height="140" style={{flexShrink:0}}>
          {arcs.map((arc,i)=><path key={i} d={arc.d} fill={arc.color} opacity={0.85}/>)}
          <circle cx={cx} cy={cy} r={r-20} fill={NAVY}/>
          <text x={cx} y={cy-6} textAnchor="middle" fill={CREAM} fontSize="20" fontFamily="Cormorant Garamond,serif" fontWeight="300">{total}</text>
          <text x={cx} y={cy+10} textAnchor="middle" fill={MUTED} fontSize="8" fontFamily="Josefin Sans,sans-serif" letterSpacing="2">PEZZI</text>
        </svg>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          {arcs.map((arc,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:arc.color,flexShrink:0}}/>
              <span style={{fontSize:11,color:CREAM,flex:1}}>{arc.label}</span>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:GOLD}}>{arc.val}</span>
              <span style={{fontSize:9,color:MUTED,width:32,textAlign:'right'}}>{Math.round(arc.pct*100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Analytics({ orders }) {
  const confirmed = orders.filter(o => o.status !== 'PREVENTIVO')

  const byCategory={}, byLine={}, byStatus={}
  let totalPieces=0

  confirmed.forEach(order => {
    getAllArticles(order).forEach(art => {
      const pz = artPieceCount(art)
      byCategory[art.category] = (byCategory[art.category]||0)+pz
      byLine[art.line]         = (byLine[art.line]||0)+pz
      totalPieces += pz
    })
  })

  orders.forEach(o => {
    const pz = o.status === 'CONSEGNA PARZIALE'
      ? getAllArticles(o).filter(a => !a.delivered).reduce((s, a) => s + artPieceCount(a), 0)
      : o.pieces
    byStatus[o.status] = (byStatus[o.status]||0) + pz
  })

  if (orders.length === 0) {
    return (
      <div>
        <div style={s.pageTitle}>Analytics</div>
        <div style={s.pageSub}>Produzione · pezzi e referenze</div>
        <div style={{textAlign:'center',padding:'80px 0',color:MUTED}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,marginBottom:12}}>Nessun dato ancora</div>
          <div style={{fontSize:11,letterSpacing:1}}>I grafici appariranno una volta inseriti gli ordini</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={s.pageTitle}>Analytics</div>
      <div style={s.pageSub}>Produzione · pezzi e referenze</div>

      <div style={s.grid4}>
        {[
          {label:'Pezzi Totali Prodotti',value:totalPieces,sub:'Ordini confermati+'},
          {label:'Categorie Attive',value:Object.keys(byCategory).length},
          {label:'Linee Attive',value:Object.keys(byLine).length},
          {label:'Categoria Top',value:Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—',sub:`${Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0]?.[1]||0} pz`},
        ].map(item=>(
          <div key={item.label} style={s.statCard(false)}>
            <div style={{...s.statLabel,color:MUTED}}>{item.label}</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:item.value?.toString().length>4?22:34,fontWeight:300,color:CREAM,lineHeight:1}}>{item.value}</div>
            {item.sub&&<div style={s.statSub}>{item.sub}</div>}
          </div>
        ))}
      </div>

      <div style={s.divider}/>

      {Object.keys(byCategory).length > 0 && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
            <DonutChart data={byCategory} title="Pezzi per Categoria"/>
            <BarChart data={byCategory} title="Distribuzione per Referenza" colorFn={l=>CAT_COLORS[l]||MUTED}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
            <BarChart data={byLine} title="Pezzi per Linea" colorFn={l=>LINE_COLORS[l]||GOLD}/>
            <BarChart data={byStatus} title="Pezzi per Stato Ordine" colorFn={()=>`linear-gradient(90deg,${GOLD},rgba(184,150,90,0.4))`}/>
          </div>
        </>
      )}

      <div style={s.divider}/>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:CREAM,letterSpacing:2,marginBottom:20}}>Breakdown per Referenza</div>
      <table style={s.table}>
        <thead>
          <tr>{['Referenza','Linea','Categoria','Ordini','Pezzi Totali','% sul totale'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {(()=>{
            const rows={}
            confirmed.forEach(order=>{
              getAllArticles(order).forEach(art=>{
                const key=art.description
                if(!rows[key]) rows[key]={description:art.description,category:art.category,line:art.line,orders:new Set(),pieces:0}
                rows[key].orders.add(order.id)
                rows[key].pieces+=artPieceCount(art)
              })
            })
            return Object.values(rows).sort((a,b)=>b.pieces-a.pieces).map(row=>(
              <tr key={row.description}>
                <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:17}}>{row.description}</td>
                <td style={{...s.td,color:MUTED,fontSize:11}}>{row.line}</td>
                <td style={s.td}><span style={{display:'inline-block',padding:'2px 8px',borderRadius:2,fontSize:9,letterSpacing:2,background:`${CAT_COLORS[row.category]||GOLD}22`,color:CAT_COLORS[row.category]||GOLD,border:`1px solid ${CAT_COLORS[row.category]||GOLD}44`}}>{row.category}</span></td>
                <td style={{...s.td,textAlign:'center'}}>{row.orders.size}</td>
                <td style={{...s.td,fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:GOLD}}>{row.pieces}</td>
                <td style={s.td}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{flex:1,height:4,background:'rgba(255,255,255,0.06)',borderRadius:2}}>
                      <div style={{height:'100%',width:`${Math.round(row.pieces/totalPieces*100)}%`,background:CAT_COLORS[row.category]||GOLD,borderRadius:2}}/>
                    </div>
                    <span style={{fontSize:11,color:MUTED,width:32}}>{Math.round(row.pieces/totalPieces*100)}%</span>
                  </div>
                </td>
              </tr>
            ))
          })()}
        </tbody>
      </table>
    </div>
  )
}
