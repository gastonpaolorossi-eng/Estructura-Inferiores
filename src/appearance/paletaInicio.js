// Superficies y textos de Inicio; leen los tokens de apariencia.css.
export const PALETA_INICIO = {
  fondo: 'var(--inicio-fondo)',
  tarjeta: 'var(--inicio-tarjeta)',
  tarjetaHover: 'var(--inicio-tarjeta-hover)',
  borde: 'var(--inicio-borde)',
  amarillo: 'var(--ui-acento)',
  amarilloSuave: 'var(--inicio-amarillo-suave)',
  blanco: 'var(--inicio-texto)',
  gris: 'var(--inicio-secundario)',
  tenue: 'var(--inicio-tenue)',
  verde: 'var(--ui-exito)',
  rojo: 'var(--ui-peligro)',
}

// Los fondos usan el color de estado; el texto, su variante legible en modo claro.
export function textoInicio(color) {
  const variables = {
    [PALETA_INICIO.amarillo]: 'var(--inicio-texto-acento)',
    [PALETA_INICIO.verde]: 'var(--inicio-texto-exito)',
    [PALETA_INICIO.rojo]: 'var(--inicio-texto-peligro)',
    'var(--ui-alerta)': 'var(--inicio-texto-aviso)',
  }
  return variables[color] || color
}
