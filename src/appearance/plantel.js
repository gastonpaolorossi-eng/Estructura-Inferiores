// Paletas de pantalla: los valores alternativos preservan el modo oscuro original.
export const PLANTEL = {
  fondoLista: 'var(--plantel-fondo-lista)',
  tarjetaLista: 'var(--plantel-tarjeta-lista)',
  bordeLista: 'var(--plantel-borde-lista)',
  controlLista: 'var(--plantel-control-lista)',
  bordeControl: 'var(--plantel-borde-control)',
  separador: 'var(--plantel-separador)',
  pista: 'var(--plantel-pista)',
  controlInactivo: 'var(--plantel-control-inactivo)',
  seleccionado: 'var(--plantel-seleccionado)',
  bordeSeleccionado: 'var(--plantel-borde-seleccionado)',
  textoLista: 'var(--plantel-texto-lista)',
  textoDetalle: 'var(--plantel-texto-detalle)',
  textoControl: 'var(--plantel-texto-control)',
  secundarioLista: 'var(--plantel-secundario-lista)',
  amarilloLista: 'var(--plantel-amarillo-lista)',
  textoAmarilloLista: 'var(--plantel-texto-amarillo-lista)',
  blanco: 'var(--plantel-blanco)',
  fondoPerfil: 'var(--plantel-fondo-perfil)',
  tarjetaPerfil: 'var(--plantel-tarjeta-perfil)',
  bordePerfil: 'var(--plantel-borde-perfil)',
  textoPerfil: 'var(--plantel-texto-perfil)',
  secundarioPerfil: 'var(--plantel-secundario-perfil)',
  tenuePerfil: 'var(--plantel-tenue-perfil)',
  amarilloPerfil: 'var(--plantel-amarillo-perfil)',
  textoAmarilloPerfil: 'var(--plantel-texto-amarillo-perfil)',
  amarilloSuave: 'var(--plantel-amarillo-suave)',
  fila: 'var(--plantel-fila)',
  exito: 'var(--plantel-exito)',
  peligro: 'var(--plantel-peligro)',
  aviso: 'var(--plantel-aviso)',
  informacion: 'var(--plantel-informacion)',
  lesion: 'var(--plantel-lesion)',
  errorFondo: 'var(--plantel-error-fondo)',
  errorTexto: 'var(--plantel-error-texto)',
  errorBorde: 'var(--plantel-error-borde)',
  avisoFondo: 'var(--plantel-aviso-fondo)',
  avisoBorde: 'var(--plantel-aviso-borde)',
  estadoExito: 'var(--plantel-estado-exito)',
  estadoAviso: 'var(--plantel-estado-aviso)',
  estadoNeutro: 'var(--plantel-estado-neutro)',
  primario: 'var(--plantel-primario)',
  sobrePrimario: 'var(--plantel-sobre-primario)',
  cabecera: 'var(--plantel-cabecera)',
  bordeAcento: 'var(--plantel-borde-acento)',
}

export function textoPlantel(color) {
  const equivalencias = {
    '#4ADE80': PLANTEL.exito, '#F87171': PLANTEL.peligro, '#FBBF24': PLANTEL.aviso,
    '#7DD3FC': PLANTEL.informacion, '#FB923C': PLANTEL.lesion, '#A1A1AA': PLANTEL.secundarioLista,
    '#F4D21F': PLANTEL.textoAmarilloLista, '#F6C900': PLANTEL.textoAmarilloPerfil,
    [PLANTEL.amarilloPerfil]: PLANTEL.textoAmarilloPerfil,
  }
  return equivalencias[color] || color
}

export function fondoEstadoPlantel(color) {
  return ({ '#163627': PLANTEL.estadoExito, '#402326': PLANTEL.errorFondo, '#40351B': PLANTEL.estadoAviso, '#292B32': PLANTEL.estadoNeutro })[color] || color
}

// Las variables CSS no admiten concatenar sufijos hexadecimales de transparencia.
export function tintePlantel(color, alfa) {
  return color.startsWith('var(')
    ? `color-mix(in srgb, ${color} ${parseInt(alfa, 16) / 255 * 100}%, transparent)`
    : color + alfa
}
