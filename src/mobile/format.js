// Importi in formato italiano per le schermate mobile: €1.552,00.
// Prima i decimali uscivano col punto (€1.552.00), indistinguibili dalle
// migliaia. Il punto delle migliaia si mette a mano: toLocaleString('it-IT')
// non lo mette sotto 10.000 (1552,00).
export function eur2(n) {
  const v = parseFloat(n) || 0
  const [int, dec] = Math.abs(v).toFixed(2).split('.')
  return (v < 0 ? '−' : '') + '€' + int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec
}
