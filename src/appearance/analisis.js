// Solo interfaz: las paletas deportivas y el informe imprimible conservan sus datos.
export const ANALISIS = {
  fondo: 'var(--ui-compartido-fondo)',
  borde: 'var(--ui-compartido-borde)',
  texto: 'var(--ui-compartido-texto)',
  secundario: 'var(--ui-compartido-secundario)',
  panel: 'var(--analisis-panel)',
  control: 'var(--analisis-control)',
  activo: 'var(--analisis-activo)',
  seleccion: 'var(--analisis-seleccion)',
  zonaSeleccion: 'var(--analisis-zona-seleccion)',
  cabecera: 'var(--analisis-cabecera)',
  errorFondo: 'var(--analisis-error-fondo)',
  errorBorde: 'var(--analisis-error-borde)',
  errorTexto: 'var(--analisis-error-texto)',
  exitoFondo: 'var(--analisis-exito-fondo)',
  exitoBorde: 'var(--analisis-exito-borde)',
  exitoTexto: 'var(--analisis-exito-texto)',
}
export function textoAnalisis(color) {
  return ({
    '#F2C230': 'var(--ui-texto-acento)',
    '#4ADE80': 'var(--plantel-exito)',
    '#F87171': 'var(--plantel-peligro)',
    '#60A5FA': 'var(--analisis-azul)',
  })[color] || color
}
