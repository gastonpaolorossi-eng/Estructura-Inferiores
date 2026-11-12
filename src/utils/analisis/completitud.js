// Qué le falta a una acción para estar completa. Lógica pura: la usan la
// captura, la cola de pendientes, el contador y las estadísticas.
import { esPase } from '../destinatariasPases.js'
import { puntoExacto } from '../trayectoriasPases.js'

// El tipo del pase ya dice cómo salió.
const RESULTADO_PASE = { 'Pase correcto': 'Exitoso', 'Pase incorrecto': 'Fallido' }

export const TIPOS_CON_RESULTADO = ['Remate', 'Centro', 'Duelo ofensivo', 'Duelo defensivo', 'Duelo aéreo', 'Despeje']
export const TIPOS_UBICACION_OPCIONAL = ['Gol', 'Atajada', 'Salida de arquera']

export function resultadoImplicito(tipo) {
  return RESULTADO_PASE[tipo] ?? null
}

export function resultadoParaGuardar(tipo, resultado) {
  return resultadoImplicito(tipo) ?? (resultado || null)
}

// Devuelve, en el orden en que se completan: jugadora, ubicacion, resultado,
// receptora y destino. Lista vacía = acción completa.
export function faltantesAccion(evento, detalle = null) {
  const faltan = []
  if (!evento.jugador_id) faltan.push('jugadora')
  if (!TIPOS_UBICACION_OPCIONAL.includes(evento.tipo) && !puntoExacto(evento.coordenada_x, evento.coordenada_y)) faltan.push('ubicacion')
  if (TIPOS_CON_RESULTADO.includes(evento.tipo) && !evento.resultado) faltan.push('resultado')
  if (esPase(evento)) {
    if (!detalle || detalle.destinataria_estado === 'pendiente') faltan.push('receptora')
    if (!puntoExacto(detalle?.destino_x, detalle?.destino_y)) faltan.push('destino')
  }
  return faltan
}
