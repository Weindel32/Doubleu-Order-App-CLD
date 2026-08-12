import { useState, useRef, useEffect } from 'react'
import { GOLD, MUTED, CREAM, BORDER } from '../tokens.js'
import { s } from '../tokens.js'

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

export function toItalianDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export function fromItalianDate(str) {
  if (!str) return ''
  const [d, m, y] = str.split('/')
  if (!d || !m || !y) return ''
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
}

// Calendario custom al posto di quello nativo del browser (Chrome in
// primis), per restare coerenti con lo stile dell'app. value/onChange
// lavorano sempre in ISO (yyyy-mm-dd), come i <input type="date"> che
// sostituisce — nessun cambio di formato lato chiamante.
export default function DatePicker({ value, onChange, label, placeholder = 'Seleziona data...', triggerStyle }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const today = new Date()
  const parsed = value ? new Date(`${value}T00:00:00`) : today
  const [viewYear, setViewYear]   = useState(parsed.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed.getMonth())

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Se il valore cambia da fuori (es. reset del form) riallinea il mese mostrato
  useEffect(() => {
    if (!open) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()) }
  }, [value, open])

  const firstDay     = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startPad     = firstDay === 0 ? 6 : firstDay - 1
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null
  const displayValue = value ? toItalianDate(value) : ''
  const currentYear  = today.getFullYear()
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  const selectDay = (day) => {
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && <label style={s.label}>{label}</label>}
      <div onClick={() => setOpen(o => !o)}
        style={{ ...s.input, ...triggerStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
        <span style={{ color: displayValue ? CREAM : MUTED }}>{displayValue || placeholder}</span>
        <span style={{ color: GOLD, fontSize: 14 }}>📅</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, marginTop: 4, background: '#1e2d50',
          border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, width: 280, maxWidth: 'calc(100vw - 32px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }}
              style={{ background: 'none', border: 'none', color: GOLD, fontSize: 18, cursor: 'pointer', padding: '0 8px' }}>‹</button>
            <div style={{ fontSize: 12, color: CREAM, letterSpacing: 2, fontWeight: 600 }}>{MONTHS[viewMonth]} {viewYear}</div>
            <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }}
              style={{ background: 'none', border: 'none', color: GOLD, fontSize: 18, cursor: 'pointer', padding: '0 8px' }}>›</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {years.map(y => (
              <button key={y} onClick={() => setViewYear(y)}
                style={{ padding: '3px 10px', borderRadius: 3, border: `1px solid ${y === viewYear ? GOLD : BORDER}`,
                  background: y === viewYear ? 'rgba(184,150,90,0.2)' : 'transparent',
                  color: y === viewYear ? GOLD : MUTED, cursor: 'pointer', fontSize: 10 }}>{y}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {['Lu','Ma','Me','Gi','Ve','Sa','Do'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, color: MUTED, padding: '2px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {Array(startPad).fill(null).map((_, i) => <div key={`e${i}`}/>)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1
              const isSel = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === viewMonth && selectedDate.getFullYear() === viewYear
              const isTod = today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear
              return (
                <button key={day} onClick={() => selectDay(day)}
                  style={{ padding: '6px 2px', borderRadius: 4, border: 'none', cursor: 'pointer', textAlign: 'center', fontSize: 12,
                    fontWeight: isSel ? 700 : 400, background: isSel ? GOLD : isTod ? 'rgba(184,150,90,0.15)' : 'transparent',
                    color: isSel ? '#1a2744' : isTod ? GOLD : CREAM }}>{day}</button>
              )
            })}
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => { onChange(''); setOpen(false) }}
              style={{ background: 'none', border: 'none', color: MUTED, fontSize: 10, cursor: 'pointer' }}>Cancella</button>
            <button onClick={() => { const t = new Date(); setViewMonth(t.getMonth()); setViewYear(t.getFullYear()); selectDay(t.getDate()) }}
              style={{ background: 'none', border: `1px solid ${GOLD}`, color: GOLD, fontSize: 10, cursor: 'pointer', padding: '4px 10px', borderRadius: 3 }}>Oggi</button>
          </div>
        </div>
      )}
    </div>
  )
}
