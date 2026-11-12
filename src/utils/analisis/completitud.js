// Qué le falta a una acción para estar completa. Lógica pura: la usan la
// captura, la cola de pendientes, el contador y las estadísticas. Las reglas
// de cada tipo salen del catálogo (analisis_tipos_accion).
import { puntoExacto } from '../trayectoriasPases.js'
import { reglasDe } from './catalogoAcciones.js'

export function resultadoImplicito(tipo, catalogo) {
  return reglasDe(catalogo, tipo).resultado_implicito
}

// Pases: su resultado fijo. Tipos sin resultado: vacío. Resto: el elegido,
// aunque sea un valor anterior que ya no está entre las opciones.
export function resultadoParaGuardar(tipo, resultado, catalogo) {
  const reglas = reglasDe(catalogo, tipo)
  if (reglas.resultado_implicito) return reglas.resultado_implicito
  if (reglas.resultados.length === 0) return null
  return resultado || null
}

// Devuelve, en el orden en que se completan: jugadora, ubicacion, resultado,
// receptora y destino. Lista vacía = acción completa.
export function faltantesAccion(evento, detalle, catalogo) {
  const reglas = reglasDe(catalogo, evento.tipo)
  const faltan = []
  if (!evento.jugador_id) faltan.push('jugadora')
  if (reglas.ubicacion === 'obligatoria' && !puntoExacto(evento.coordenada_x, evento.coordenada_y)) faltan.push('ubicacion')
  if (reglas.resultados.length > 0 && !evento.resultado) faltan.push('resultado')
  if (reglas.es_pase) {
    if (!detalle || detalle.destinataria_estado === 'pendiente') faltan.push('receptora')
    if (!puntoExacto(detalle?.destino_x, detalle?.destino_y)) faltan.push('destino')
  }
  return faltan
}
