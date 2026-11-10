// Estilos de pantalla; reutilizan las variables del proveedor de apariencia.
export const PARTIDOS = {
  fondo: 'var(--ui-compartido-fondo)',
  superficie: 'var(--ui-compartido-superficie)',
  borde: 'var(--ui-compartido-borde)',
  texto: 'var(--ui-compartido-texto)',
  secundario: 'var(--ui-compartido-secundario)',
  tenue: 'var(--ui-compartido-tenue)',
  fila: 'var(--partidos-fila)',
  primario: 'var(--partidos-primario)',
  sobrePrimario: 'var(--partidos-sobre-primario)',
  exito: 'var(--plantel-exito)',
  peligro: 'var(--plantel-peligro)',
  aviso: 'var(--plantel-aviso)',
  informacion: 'var(--gestion-info)',
}

export function textoPartido(color) {
  return ({ '#FBBF24': PARTIDOS.aviso, '#F87171': PARTIDOS.peligro, '#8A9BB8': PARTIDOS.secundario })[color] || color
}
