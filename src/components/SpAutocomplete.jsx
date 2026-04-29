import { useState, useRef, useEffect } from 'react'
import { PRODUCT_CATALOG } from '../data/productCatalog.js'
import { GOLD, CREAM, MUTED, BORDER, CLAY } from '../tokens.js'
import { s } from '../tokens.js'

export default function SpAutocomplete({ value, onSelect, inputStyle }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = query.trim().length === 0
    ? []
    : PRODUCT_CATALOG.filter(p =>
        p.code.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12)

  function handleChange(e) {
    setQuery(e.target.value)
    setOpen(true)
  }

  function handleSelect(product) {
    setQuery(product.code)
    setOpen(false)
    onSelect(product)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label style={s.label}>Codice DUSP *</label>
      <input
        style={inputStyle}
        value={query}
        onChange={handleChange}
        onFocus={() => query.trim().length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="DUSP 206 o felpa..."
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 2000,
          marginTop: 4,
          background: '#1e2d50',
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: '100%',
          maxWidth: 420,
          maxHeight: 280,
          overflowY: 'auto',
        }}>
          {filtered.map((product, i) => (
            <div
              key={product.code + i}
              onMouseDown={() => handleSelect(product)}
              style={{
                padding: '9px 14px',
                cursor: 'pointer',
                borderBottom: `1px solid rgba(184,150,90,0.1)`,
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,150,90,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: 1, whiteSpace: 'nowrap' }}>
                {product.code}
              </span>
              <span style={{ fontSize: 12, color: CREAM, letterSpacing: 0.3 }}>
                {product.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
