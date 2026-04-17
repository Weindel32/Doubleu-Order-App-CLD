// ─── BRAND TOKENS ────────────────────────────────────────────────
export const NAVY    = '#1a2744'
export const CREAM   = '#f5f0e8'
export const CLAY    = '#c4623a'
export const GOLD    = '#b8965a'
export const MUTED   = '#8a9ab5'
export const GREEN   = '#4a9e6e'
export const SURFACE = 'rgba(255,255,255,0.04)'
export const BORDER  = 'rgba(184,150,90,0.18)'

// ─── ORDER STATUS ─────────────────────────────────────────────────
export const ORDER_STATUSES = ['PREVENTIVO', 'CONFERMATO', 'IN PRODUZIONE', 'CONSEGNA PARZIALE', 'CONSEGNATO']

export const STATUS_COLORS = {
  'PREVENTIVO':        { bg: 'rgba(196,98,58,0.18)',  color: '#c4623a', border: 'rgba(196,98,58,0.4)'  },
  'CONFERMATO':        { bg: 'rgba(184,150,90,0.15)', color: '#b8965a', border: 'rgba(184,150,90,0.3)' },
  'IN PRODUZIONE':     { bg: 'rgba(90,130,184,0.18)', color: '#7aaee8', border: 'rgba(90,130,184,0.4)' },
  'CONSEGNA PARZIALE': { bg: 'rgba(180,140,50,0.18)', color: '#e8c96e', border: 'rgba(180,140,50,0.4)' },
  'CONSEGNATO':        { bg: 'rgba(74,158,110,0.18)', color: '#4a9e6e', border: 'rgba(74,158,110,0.4)' },
}

// ─── CONSTANTS ───────────────────────────────────────────────────
export const ADULT_SIZES  = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
export const KIDS_SIZES   = ['4', '6', '8', '10', '12', '14', '16']
export const CATEGORIES   = ['Hoodie', 'Zip Hoodie', 'Sweatshirt', 'T-Shirt PRF', 'T-Shirt Cot', 'Polo', 'T-Shirt Ws', 'Short', 'Skirt', 'Sweatpants', 'Jacket', 'Altro']
export const LINES        = ['Premium', 'Club', 'WFox', 'Surfaces', 'Training', 'Lifestyle', 'LS24']
export const PRICING_MODES = ['kit', 'singolo']

// ─── SHARED STYLES ───────────────────────────────────────────────
export const s = {
  app: { display: 'flex', minHeight: '100vh', background: NAVY, color: CREAM },
  sidebar: {
    width: 220, background: 'rgba(10,18,40,0.85)', borderRight: `1px solid ${BORDER}`,
    display: 'flex', flexDirection: 'column', padding: '28px 0', flexShrink: 0,
    position: 'sticky', top: 0, height: '100vh',
  },
  logo: { padding: '0 24px 28px', borderBottom: `1px solid rgba(184,150,90,0.12)`, marginBottom: 8 },
  logoMark: { fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: CREAM, letterSpacing: 4, lineHeight: 1 },
  logoSub: { fontSize: 9, letterSpacing: 3, color: GOLD, marginTop: 5, textTransform: 'uppercase' },
  navItem: (active) => ({
    padding: '11px 24px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
    color: active ? CREAM : MUTED, cursor: 'pointer',
    borderLeft: active ? `2px solid ${GOLD}` : '2px solid transparent',
    background: active ? 'rgba(184,150,90,0.07)' : 'transparent',
    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10,
  }),
  main: { flex: 1, overflow: 'auto', padding: '40px 48px', maxWidth: 'calc(100vw - 220px)' },
  pageTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: CREAM, letterSpacing: 2, marginBottom: 4 },
  pageSub: { fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 36 },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 },
  card: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '24px 28px', marginBottom: 16 },
  cardTitle: { fontSize: 9, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 },
  statCard: (accent) => ({
    background: accent ? `linear-gradient(135deg, ${CLAY}, #a0502e)` : SURFACE,
    border: accent ? 'none' : `1px solid ${BORDER}`,
    borderRadius: 10, padding: '24px 28px',
  }),
  statLabel: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: MUTED, marginBottom: 8 },
  statValue: { fontFamily: "'Cormorant Garamond', serif", fontSize: 38, fontWeight: 300, color: CREAM, lineHeight: 1 },
  statSub: { fontSize: 11, color: GOLD, marginTop: 6, letterSpacing: 1 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, borderBottom: `1px solid rgba(184,150,90,0.2)` },
  td: { padding: '14px', fontSize: 12, color: CREAM, borderBottom: `1px solid rgba(255,255,255,0.05)`, letterSpacing: 0.5 },
  divider: { height: 1, background: `linear-gradient(90deg, rgba(184,150,90,0.25), transparent)`, margin: '28px 0' },
  input: {
    background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 4,
    padding: '10px 14px', color: CREAM, fontSize: 12, letterSpacing: 0.5,
    outline: 'none', width: '100%',
  },
  label: { fontSize: 9, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 6, display: 'block' },
}

export const badgeStyle = (status) => {
  const sc = STATUS_COLORS[status] || STATUS_COLORS['PREVENTIVO']
  return {
    display: 'inline-block', padding: '3px 10px', borderRadius: 2,
    fontSize: 9, letterSpacing: 2, fontWeight: 600,
    background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
  }
}

export const btnStyle = (primary) => ({
  padding: '10px 24px', borderRadius: 3, border: 'none', cursor: 'pointer',
  fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600,
  background: primary ? `linear-gradient(135deg, ${CLAY}, #a0502e)` : 'rgba(255,255,255,0.06)',
  color: primary ? CREAM : MUTED, transition: 'all 0.2s',
})

export const btnGoldStyle = {
  padding: '10px 24px', borderRadius: 3, border: `1px solid ${GOLD}`,
  cursor: 'pointer', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
  fontWeight: 600, background: 'transparent', color: GOLD,
}
