import { useState } from 'react'
import { GOLD, MUTED, CREAM, CLAY, BORDER, GREEN, ADULT_SIZES, KIDS_SIZES, CATEGORIES, LINES, ORDER_STATUSES } from '../tokens.js'
import { s, btnStyle, btnGoldStyle, badgeStyle } from '../tokens.js'
import { artPieceCount, orderTotal as calcOrderTotal } from '../data/mockData.js'
import { generateProductionPDF } from '../utils/pdfProduction.js'
import { generateClientPDF }     from '../utils/pdfClient.js'
import { exportSizesCSV }        from '../utils/exportCSV.js'
import PaymentsPanel             from '../components/PaymentsPanel.jsx'

const STEPS = ['Club & Note', 'Pricing & Articoli', 'Taglie', 'Pagamenti', 'Riepilogo']
const emptyArticle = () => ({ sp:'', category:'Felpa', line:'Performance', description:'', color:'', price:'', sizes:{ adult: Object.fromEntries(ADULT_SIZES.map(sz=>[sz,0])), kids: Object.fromEntries(KIDS_SIZES.map(sz=>[sz,0])) } })
const emptyKit = () => ({ name:'', price:'', articles:[emptyArticle()] })

export default function NewOrder({ editOrder, setView }) {
  const [step,setStep]             = useState(1)
  const [club,setClub]             = useState(editOrder?.client||'')
  const [date]                     = useState(editOrder?.date||new Date().toLocaleDateString('it-IT'))
  const [deliveryDate,setDelivery] = useState(editOrder?.deliveryDate||'')
  const [alertDays,setAlertDays]   = useState(editOrder?.alertDays??7)
  const [status,setStatus]         = useState(editOrder?.status||'PREVENTIVO')
  const [clientNotes,setCN]        = useState(editOrder?.notes||'')
  const [productionNotes,setPN]    = useState(editOrder?.productionNotes||'')
  const [showTotal,setShowTotal]   = useState(editOrder?.showTotalInClientPDF??true)
  const [pricingMode,setPM]        = useState(editOrder?.pricingMode||'singolo')
  const [kits,setKits]             = useState(editOrder?.kits||[emptyKit()])
  const [payments,setPayments]     = useState(editOrder?.payments||[])

  const allArticles = kits.flatMap(k=>k.articles)
  const totalPieces = allArticles.reduce((s,a)=>s+artPieceCount(a),0)
  const orderObj    = ()=>({ id:editOrder?.id||'DU-2026-NEW', client:club||'—', date, deliveryDate, alertDays, status, pieces:totalPieces, notes:clientNotes, productionNotes, pricingMode, kits, payments, showTotalInClientPDF:showTotal })
  const total       = calcOrderTotal(orderObj())
  const totalPaid   = payments.filter(p=>p.paid).reduce((s,p)=>s+(parseFloat(p.amount)||0),0)
  const totalPend   = payments.filter(p=>!p.paid).reduce((s,p)=>s+(parseFloat(p.amount)||0),0)
  const residual    = Math.max(0,total-totalPaid-totalPend)

  const updateKit   =(ki,f,v)=> setKits(kits.map((k,i)=>i===ki?{...k,[f]:v}:k))
  const addKit      =()=>       setKits([...kits,emptyKit()])
  const removeKit   =(ki)=>     setKits(kits.filter((_,i)=>i!==ki))
  const addArt      =(ki)=>     setKits(kits.map((k,i)=>i===ki?{...k,articles:[...k.articles,emptyArticle()]}:k))
  const removeArt   =(ki,ai)=>  setKits(kits.map((k,i)=>i===ki?{...k,articles:k.articles.filter((_,j)=>j!==ai)}:k))
  const updateArt   =(ki,ai,f,v)=> setKits(kits.map((k,i)=>i!==ki?k:{...k,articles:k.articles.map((a,j)=>j!==ai?a:{...a,[f]:v})}))
  const updateSz    =(ki,ai,type,sz,v)=> setKits(kits.map((k,i)=>i!==ki?k:{...k,articles:k.articles.map((a,j)=>j!==ai?a:{...a,sizes:{...a.sizes,[type]:{...a.sizes[type],[sz]:parseInt(v)||0}}})}))
  const openPDF     =(gen)=>{ const h=gen(orderObj()); const w=window.open('','_blank'); w.document.write(h); w.document.close() }
  const canGo2      = allArticles.some(a=>a.sp&&a.description)
  const inp         = {...s.input}

  // ── Shared nav buttons ──────────────────────────────────────────
  const NavBtns = ({prev,next,nextLabel='Continua →',nextDisabled=false}) => (
    <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
      <button style={btnStyle(false)} onClick={prev}>← Indietro</button>
      <button style={{...btnStyle(true),opacity:nextDisabled?0.4:1}} onClick={()=>!nextDisabled&&next()}>{nextLabel}</button>
    </div>
  )

  return (
    <div style={{maxWidth:940}}>
      {/* Header */}
      <div style={s.topBar}>
        <div>
          <div style={s.pageTitle}>{editOrder?'Modifica Ordine':'Nuovo Ordine'}</div>
          <div style={s.pageSub}>{editOrder?.id||'DU-2026-NEW'} · {date}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:9,letterSpacing:2,color:MUTED,marginBottom:4}}>PEZZI TOTALI</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,color:GOLD,lineHeight:1}}>{totalPieces}</div>
        </div>
      </div>

      {/* Step bar */}
      <div style={{display:'flex',marginBottom:36}}>
        {STEPS.map((label,i)=>(
          <div key={label} style={{flex:1,cursor:'pointer'}} onClick={()=>setStep(i+1)}>
            <div style={{height:2,background:i+1<=step?GOLD:'rgba(255,255,255,0.08)',marginBottom:6,transition:'all 0.3s'}}/>
            <div style={{fontSize:9,letterSpacing:2,color:i+1<=step?GOLD:MUTED,textTransform:'uppercase'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── STEP 1: Club ─────────────────────────────────────────── */}
      {step===1 && <div>
        <div style={s.card}>
          <div style={s.cardTitle}>Dati Club</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:16}}>
            <div><label style={s.label}>Club / Cliente *</label><input style={inp} value={club} onChange={e=>setClub(e.target.value)} placeholder="Es. Tennis Club Milano"/></div>
            <div><label style={s.label}>Data Ordine</label><input style={{...inp,opacity:0.5}} value={date} readOnly/></div>
            <div><label style={s.label}>Stato Ordine</label>
              <select style={inp} value={status} onChange={e=>setStatus(e.target.value)}>{ORDER_STATUSES.map(st=><option key={st}>{st}</option>)}</select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><label style={s.label}>Data Consegna Prevista (GG/MM/AAAA)</label><input style={inp} value={deliveryDate} onChange={e=>setDelivery(e.target.value)} placeholder="30/05/2026"/></div>
            <div><label style={s.label}>Alert preavviso</label>
              <select style={inp} value={alertDays} onChange={e=>setAlertDays(+e.target.value)}>
                {[3,5,7,10,14,21,30].map(d=><option key={d} value={d}>{d} giorni prima</option>)}
              </select>
            </div>
          </div>
          <div style={{marginTop:12}}><span style={badgeStyle(status)}>{status}</span></div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Note per il Cliente</div>
          <textarea rows={3} style={{...inp,resize:'vertical'}} value={clientNotes} onChange={e=>setCN(e.target.value)} placeholder="Es. Consegna stimata 35 gg lavorativi..."/>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>⚠ Note Produzione (uso interno)</div>
          <textarea rows={3} style={{...inp,resize:'vertical',borderColor:'rgba(196,98,58,0.35)'}} value={productionNotes} onChange={e=>setPN(e.target.value)} placeholder="Es. Piping bianco manica raglan. Pantone 356C..."/>
          <div style={{fontSize:9,color:CLAY,letterSpacing:1,marginTop:8}}>Solo nel PDF Produzione</div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Opzioni PDF Cliente</div>
          <label style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer'}}>
            <div onClick={()=>setShowTotal(!showTotal)} style={{width:40,height:22,borderRadius:11,position:'relative',cursor:'pointer',background:showTotal?GOLD:'rgba(255,255,255,0.12)',transition:'background 0.2s'}}>
              <div style={{position:'absolute',top:3,left:showTotal?21:3,width:16,height:16,borderRadius:'50%',background:'white',transition:'left 0.2s'}}/>
            </div>
            <span style={{fontSize:12,color:CREAM}}>Mostra totale nel PDF Cliente</span>
            <span style={{fontSize:10,color:MUTED}}>{showTotal?'Sì':'No'}</span>
          </label>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:12,marginTop:8}}>
          <button style={btnStyle(false)} onClick={()=>setView('orders')}>Annulla</button>
          <button style={btnStyle(true)} onClick={()=>setStep(2)}>Continua →</button>
        </div>
      </div>}

      {/* ── STEP 2: Articles ─────────────────────────────────────── */}
      {step===2 && <div>
        <div style={s.card}>
          <div style={s.cardTitle}>Modalità Pricing</div>
          <div style={{display:'flex',gap:10}}>
            {['singolo','kit'].map(mode=>(
              <button key={mode} style={{padding:'10px 28px',borderRadius:3,border:`1px solid ${pricingMode===mode?GOLD:BORDER}`,background:pricingMode===mode?'rgba(184,150,90,0.12)':'transparent',color:pricingMode===mode?GOLD:MUTED,cursor:'pointer',fontSize:10,letterSpacing:2,textTransform:'uppercase',fontWeight:600}}
                onClick={()=>setPM(mode)}>
                {mode==='singolo'?'Articolo singolo':'Prezzo per Kit'}
              </button>
            ))}
          </div>
          <div style={{fontSize:11,color:MUTED,marginTop:10}}>{pricingMode==='kit'?'Prezzo per kit completo (es. felpa+short = €90/giocatore)':'Ogni articolo ha il proprio prezzo unitario'}</div>
        </div>
        {kits.map((kit,ki)=>(
          <div key={ki} style={{...s.card,border:`1px solid rgba(184,150,90,0.25)`}}>
            {pricingMode==='kit' && <div style={{display:'grid',gridTemplateColumns:'1fr 140px',gap:16,marginBottom:20}}>
              <div><label style={s.label}>Nome Kit</label><input style={inp} value={kit.name} onChange={e=>updateKit(ki,'name',e.target.value)} placeholder="Es. Kit Completo Padel"/></div>
              <div><label style={s.label}>Prezzo Kit €</label><input type="number" style={inp} value={kit.price} onChange={e=>updateKit(ki,'price',e.target.value)} placeholder="90"/></div>
            </div>}
            <div style={{fontSize:9,letterSpacing:3,color:MUTED,marginBottom:14}}>{pricingMode==='kit'?'ARTICOLI NEL KIT':'ARTICOLI'}</div>
            {kit.articles.map((art,ai)=>(
              <div key={ai} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${BORDER}`,borderRadius:8,padding:'14px',marginBottom:10}}>
                <div style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 1fr 1fr',gap:10,marginBottom:pricingMode==='singolo'?10:0}}>
                  <div><label style={s.label}>Codice SP *</label><input style={inp} value={art.sp} onChange={e=>updateArt(ki,ai,'sp',e.target.value)} placeholder="SP-206"/></div>
                  <div><label style={s.label}>Descrizione *</label><input style={inp} value={art.description} onChange={e=>updateArt(ki,ai,'description',e.target.value)} placeholder="Felpa zip cappuccio"/></div>
                  <div><label style={s.label}>Colore / Pantone</label><input style={inp} value={art.color} onChange={e=>updateArt(ki,ai,'color',e.target.value)} placeholder="Navy/Cream"/></div>
                  <div><label style={s.label}>Categoria</label><select style={inp} value={art.category} onChange={e=>updateArt(ki,ai,'category',e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                  <div><label style={s.label}>Linea</label><select style={inp} value={art.line} onChange={e=>updateArt(ki,ai,'line',e.target.value)}>{LINES.map(l=><option key={l}>{l}</option>)}</select></div>
                </div>
                {pricingMode==='singolo' && <div style={{width:140}}><label style={s.label}>Prezzo unitario €</label><input type="number" style={inp} value={art.price} onChange={e=>updateArt(ki,ai,'price',e.target.value)} placeholder="28"/></div>}
                {kit.articles.length>1 && <button style={{...btnStyle(false),padding:'4px 10px',fontSize:9,color:CLAY,marginTop:8}} onClick={()=>removeArt(ki,ai)}>Rimuovi</button>}
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
              <button style={{...btnGoldStyle,padding:'7px 16px',fontSize:9}} onClick={()=>addArt(ki)}>+ Articolo</button>
              {kits.length>1 && <button style={{...btnStyle(false),padding:'7px 14px',fontSize:9,color:CLAY}} onClick={()=>removeKit(ki)}>Rimuovi kit</button>}
            </div>
          </div>
        ))}
        {pricingMode==='kit' && <button style={{...btnGoldStyle,marginBottom:16}} onClick={addKit}>+ Aggiungi Kit</button>}
        <NavBtns prev={()=>setStep(1)} next={()=>setStep(3)} nextDisabled={!canGo2}/>
      </div>}

      {/* ── STEP 3: Sizes ────────────────────────────────────────── */}
      {step===3 && <div>
        {kits.map((kit,ki)=>kit.articles.map((art,ai)=>{
          const adT=ADULT_SIZES.reduce((s,sz)=>s+(art.sizes.adult?.[sz]||0),0)
          const kiT=KIDS_SIZES.reduce((s,sz)=>s+(art.sizes.kids?.[sz]||0),0)
          return (
            <div key={`${ki}-${ai}`} style={{...s.card,marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <span style={{background:'rgba(26,39,68,0.9)',color:GOLD,padding:'5px 14px',fontSize:11,letterSpacing:2,borderRadius:2,border:`1px solid ${BORDER}`}}>{art.sp||'—'}</span>
                  <div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:CREAM}}>{art.description}</div>
                    <div style={{fontSize:10,color:CLAY,marginTop:2}}>{art.color}</div>
                  </div>
                  {pricingMode==='kit' && <span style={{fontSize:10,color:MUTED,background:'rgba(255,255,255,0.04)',padding:'3px 10px',borderRadius:2}}>{kit.name}</span>}
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:9,color:MUTED,letterSpacing:2}}>TOT.</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,color:GOLD,lineHeight:1}}>{adT+kiT}</div>
                </div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:MUTED,marginBottom:12}}>TAGLIE ADULTO</div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
                  {ADULT_SIZES.map(sz=>(
                    <div key={sz} style={{textAlign:'center'}}>
                      <div style={{fontSize:9,letterSpacing:2,color:GOLD,marginBottom:6}}>{sz}</div>
                      <input type="number" min="0" style={{...inp,width:58,textAlign:'center',padding:'8px 4px',fontSize:15}} value={art.sizes.adult?.[sz]||0} onChange={e=>updateSz(ki,ai,'adult',sz,e.target.value)}/>
                    </div>
                  ))}
                  <div style={{borderLeft:`1px solid ${BORDER}`,paddingLeft:14,marginLeft:4}}>
                    <div style={{fontSize:9,color:MUTED,marginBottom:6}}>TOT</div>
                    <div style={{width:58,height:40,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:GOLD}}>{adT}</div>
                  </div>
                </div>
              </div>
              <div>
                <div style={{fontSize:9,letterSpacing:3,color:MUTED,marginBottom:12}}>TAGLIE BAMBINO</div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
                  {KIDS_SIZES.map(sz=>(
                    <div key={sz} style={{textAlign:'center'}}>
                      <div style={{fontSize:9,letterSpacing:2,color:GOLD,marginBottom:6}}>{sz}</div>
                      <input type="number" min="0" style={{...inp,width:58,textAlign:'center',padding:'8px 4px',fontSize:15}} value={art.sizes.kids?.[sz]||0} onChange={e=>updateSz(ki,ai,'kids',sz,e.target.value)}/>
                    </div>
                  ))}
                  <div style={{borderLeft:`1px solid ${BORDER}`,paddingLeft:14,marginLeft:4}}>
                    <div style={{fontSize:9,color:MUTED,marginBottom:6}}>TOT</div>
                    <div style={{width:58,height:40,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:GOLD}}>{kiT}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        }))}
        <NavBtns prev={()=>setStep(2)} next={()=>setStep(4)} nextLabel="Pagamenti →"/>
      </div>}

      {/* ── STEP 4: Payments ─────────────────────────────────────── */}
      {step===4 && <div>
        <PaymentsPanel payments={payments} setPayments={setPayments} orderTotal={total}/>
        <NavBtns prev={()=>setStep(3)} next={()=>setStep(5)} nextLabel="Riepilogo →"/>
      </div>}

      {/* ── STEP 5: Summary ──────────────────────────────────────── */}
      {step===5 && <div>
        <div style={s.card}>
          <div style={s.cardTitle}>Riepilogo Ordine</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20}}>
            {[{l:'CLUB',v:club||'—',serif:true},{l:'PEZZI',v:totalPieces,serif:true,color:GOLD},{l:'TOTALE',v:`€ ${total.toFixed(2)}`,serif:true,color:GOLD},{l:'STATO',badge:status}].map(item=>(
              <div key={item.l}>
                <div style={{fontSize:9,color:MUTED,letterSpacing:2,marginBottom:6}}>{item.l}</div>
                {item.badge?<span style={badgeStyle(item.badge)}>{item.badge}</span>:<div style={{fontFamily:item.serif?"'Cormorant Garamond',serif":undefined,fontSize:item.serif?20:14,color:item.color||CREAM}}>{item.v}</div>}
              </div>
            ))}
          </div>
          {deliveryDate && (
            <div style={{padding:'10px 16px',background:'rgba(184,150,90,0.07)',borderRadius:6,border:`1px solid rgba(184,150,90,0.15)`,marginBottom:16,display:'flex',gap:24}}>
              <div><div style={{fontSize:9,color:MUTED,letterSpacing:2,marginBottom:3}}>CONSEGNA</div><div style={{fontSize:14,color:GOLD}}>{deliveryDate}</div></div>
              <div><div style={{fontSize:9,color:MUTED,letterSpacing:2,marginBottom:3}}>ALERT</div><div style={{fontSize:14,color:CREAM}}>{alertDays} giorni prima</div></div>
            </div>
          )}
          {kits.map((kit,ki)=>(
            <div key={ki} style={{marginBottom:12,paddingBottom:12,borderBottom:`1px solid rgba(255,255,255,0.05)`}}>
              {pricingMode==='kit' && <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:CREAM}}>{kit.name}</span><span style={{fontSize:13,color:GOLD}}>€ {kit.price}/kit</span></div>}
              {kit.articles.map((a,ai)=>{
                const tot=artPieceCount(a)
                return <div key={ai} style={{display:'flex',justifyContent:'space-between',padding:'6px 0 6px 14px',borderLeft:pricingMode==='kit'?`2px solid rgba(184,150,90,0.2)`:'none'}}>
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <span style={{fontSize:10,color:GOLD,letterSpacing:2}}>{a.sp}</span>
                    <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15}}>{a.description}</span>
                    <span style={{fontSize:10,color:CLAY}}>{a.color}</span>
                  </div>
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:GOLD}}>{tot} pz</span>
                </div>
              })}
            </div>
          ))}
          {payments.length>0 && (
            <div style={{marginTop:12,padding:'12px 16px',background:'rgba(74,158,110,0.07)',border:`1px solid rgba(74,158,110,0.18)`,borderRadius:6}}>
              <div style={{fontSize:9,letterSpacing:2,color:GREEN,marginBottom:8}}>SITUAZIONE PAGAMENTI</div>
              <div style={{display:'flex',gap:24}}>
                <div><div style={{fontSize:9,color:MUTED}}>Incassato</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:GREEN}}>€ {totalPaid.toFixed(2)}</div></div>
                <div><div style={{fontSize:9,color:MUTED}}>In sospeso</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:GOLD}}>€ {totalPend.toFixed(2)}</div></div>
                <div><div style={{fontSize:9,color:MUTED}}>Residuo</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:residual>0?CLAY:MUTED}}>€ {residual.toFixed(2)}</div></div>
              </div>
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'space-between',marginTop:8,flexWrap:'wrap'}}>
          <button style={btnStyle(false)} onClick={()=>setStep(4)}>← Indietro</button>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button style={btnStyle(false)}>Salva Bozza</button>
            <button style={{...btnStyle(false),color:'#7aaee8',border:'1px solid rgba(122,174,232,0.3)',background:'rgba(122,174,232,0.06)'}} onClick={()=>exportSizesCSV(orderObj())}>↓ CSV Taglie</button>
            <button style={{...btnGoldStyle,borderColor:CLAY,color:CLAY}} onClick={()=>openPDF(generateProductionPDF)}>↓ PDF Prod.</button>
            <button style={btnGoldStyle} onClick={()=>openPDF(generateClientPDF)}>↓ PDF Cliente</button>
            <button style={btnStyle(true)}>Conferma Ordine</button>
          </div>
        </div>
      </div>}
    </div>
  )
}
