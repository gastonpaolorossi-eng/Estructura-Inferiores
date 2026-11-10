import { COLORES } from '../theme'

// Solo presentación: no cambiar los colores de los datos utilizados al exportar.
export const BOTON_GESTION = {
  backgroundColor: 'var(--gestion-primario-fondo)',
  color: 'var(--gestion-primario-texto)',
}

export function textoGestion(color) {
  if (color === COLORES.acento) return 'var(--ui-texto-acento)'
  if (color === '#7DD3FC') return 'var(--gestion-info)'
  if (color === '#FB923C') return 'var(--gestion-aviso)'
  return color
}

export function textoSobreEstado(color) {
  return color === COLORES.acento || color === '#7DD3FC' || color === '#FB923C'
    ? 'var(--gestion-estado-claro-texto)'
    : 'var(--gestion-estado-texto)'
}
