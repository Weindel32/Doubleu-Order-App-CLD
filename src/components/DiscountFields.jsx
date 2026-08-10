import { GOLD, MUTED, BORDER, s } from '../tokens.js'

// Campi sconto riutilizzabili: selettore % / € + valore.
// Usati sia per lo sconto sull'intero ordine sia per quello di riga
// (per articolo in pricing singolo, per kit in pricing kit).
export default function DiscountFields({ type, value, onChange, accent = GOLD, accentBg = 'rgba(184,150,90,0.12)', label = 'Sconto', compact = false }) {
  const active = type === 'importo' ? 'importo' : 'percentuale'
  const btn = (val) => ({
    padding: compact ? '8px 14px' : '10px 28px',
    borderRadius: 3,
    border: `1px solid ${active === val ? accent : BORDER}`,
    background: active === val ? accentBg : 'transparent',
    color: active === val ? accent : MUTED,
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
  })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: compact ? '104px 1fr' : '220px 160px', gap: compact ? 10 : 16, alignItems: 'end' }}>
      <div>
        <label style={s.label}>{compact ? 'Sconto' : 'Tipo'}</label>
        <div style={{ display: 'flex', gap: compact ? 6 : 10 }}>
          {[['percentuale', '%'], ['importo', '€']].map(([val, lbl]) => (
            <button key={val} onClick={() => onChange('discountType', val)} style={btn(val)}>{lbl}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={s.label}>{active === 'percentuale' ? `${label} %` : `${label} €`}</label>
        <input
          type="number" min="0"
          step={active === 'percentuale' ? '1' : '0.01'}
          max={active === 'percentuale' ? '100' : undefined}
          style={s.input}
          value={value ?? ''}
          onChange={e => onChange('discountValue', e.target.value)}
          placeholder={active === 'percentuale' ? '10' : '150'}
        />
      </div>
    </div>
  )
}
