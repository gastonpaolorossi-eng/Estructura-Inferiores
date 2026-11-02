import { resumirAcciones, resumirParticipacion } from './metricas.js'
import { fechaValida } from '../planificacion.js'

// Contrato puro: no se conecta a Supabase ni concede permisos.
// lectura_rls identifica resultados del lector autenticado, no certifica políticas desplegadas.
export const ESTADO_INTEGRACION_INDIVIDUAL = 'pendiente_verificacion_permisos'

/** Describe una evidencia externa de lectura; no valida JWT ni reemplaza RLS.
 * `verificacion` nunca debe proceder de un formulario, localStorage o metadata editable.
 * En esta entrega solo existe evidencia simulada en pruebas; no hay consumidor de red.
 */
export function validarAlcanceIndividual({ usuarioId, sesionId, proyectoId, jugadoraIds = [], categoriaIds = [], anio, verificacion } = {}) {
  if (!usuarioId || !sesionId) return { estado: 'sin_sesion' }
  if (!proyectoId || !Number.isInteger(anio) || anio < 1900 || anio > 9999 ||
      !jugadoraIds.length || jugadoraIds.length > 2 || new Set(jugadoraIds).size !== jugadoraIds.length ||
      jugadoraIds.some(id => typeof id !== 'string' || !id.trim()) ||
      !categoriaIds.length || categoriaIds.some(id => typeof id !== 'string' || !id.trim())) return { estado: 'alcance_invalido' }
  if (verificacion?.estado !== 'verificado' || verificacion.usuarioId !== usuarioId || verificacion.sesionId !== sesionId || verificacion.proyectoId !== proyectoId) return { estado: 'no_verificado' }
  if (!verificacion.lecturaAnalisis || !jugadoraIds.every(id => verificacion.jugadoraIds?.includes(id)) ||
      !categoriaIds.every(id => verificacion.categoriaIds?.includes(id))) return { estado: 'denegado' }
  return { estado: 'verificado', usuarioId, sesionId, proyectoId, anio, jugadoraIds: [...jugadoraIds], categoriaIds: [...new Set(categoriaIds)] }
}

const estadosFuente = new Set(['disponible', 'denegado', 'error', 'no_consultada'])
function fuente(valor) {
  if (!valor || !estadosFuente.has(valor.estado)) return { estado: 'no_consultada', filas: null }
  if (valor.estado !== 'disponible') return { estado: valor.estado, filas: null }
  return Array.isArray(valor.filas) ? { estado: 'disponible', filas: valor.filas } : { estado: 'error', filas: null }
}

/** Entradas ya leídas bajo el mismo alcance; no realiza consultas ni decide acceso.
 * No recalcula ni sustituye los siete indicadores históricos del Perfil.
 * Cada fuente: { estado, filas }; [] significa sin registros ACCESIBLES.
 */
export function construirContratoIndividual(alcance, entradas = {}) {
  if (!['verificado', 'lectura_rls'].includes(alcance?.estado)) return { estado: 'bloqueado', motivo: alcance?.estado || 'no_verificado', jugadoras: [], fuentes: {} }
  const fuentes = Object.fromEntries(['partidos', 'analisis', 'eventos', 'estadisticas'].map(k => [k, fuente(entradas[k])]))
  const filas = clave => fuentes[clave].filas || []
  const enAnio = fecha => fechaValida(fecha) && fecha.slice(0, 4) === String(alcance.anio)
  const partidos = new Map(filas('partidos').filter(p => alcance.categoriaIds.includes(p.categoria_id)).map(p => [p.id, p]))
  const analisis = new Map(filas('analisis').filter(a => alcance.categoriaIds.includes(a.categoria_id)).map(a => [a.id, a]))
  const incidencias = { eventosSinAnalisisAccesible: [], eventosSinFechaValida: [], duplicados: [], idsConflictivos: [] }
  const registros = new Map(), conflictivos = new Set()
  for (const evento of filas('eventos')) {
    if (!alcance.jugadoraIds.includes(evento.jugador_id)) continue
    if (!evento.id) { incidencias.idsConflictivos.push(null); continue }
    const firma = JSON.stringify([evento.jugador_id, evento.partido_id, evento.tipo, evento.resultado, evento.segundo, evento.periodo, evento.coordenada_x, evento.coordenada_y, evento.zona])
    if (registros.has(evento.id)) {
      incidencias.duplicados.push(evento.id)
      if (registros.get(evento.id).firma !== firma) { conflictivos.add(evento.id); incidencias.idsConflictivos.push(evento.id) }
    } else registros.set(evento.id, { evento, firma })
  }
  const eventos = []
  for (const [id, { evento }] of registros) {
    if (conflictivos.has(id)) continue
    const a = analisis.get(evento.partido_id)
    if (!a) { incidencias.eventosSinAnalisisAccesible.push(id); continue }
    const p = partidos.get(a.partido_calendario_id)
    const vinculado = Boolean(p && p.categoria_id === a.categoria_id && fechaValida(p.fecha))
    const fecha = vinculado ? p.fecha : a.fecha
    if (!fechaValida(fecha)) { incidencias.eventosSinFechaValida.push(id); continue }
    if (enAnio(fecha)) eventos.push({ evento, analisisId: a.id, partidoId: vinculado ? p.id : null })
  }
  const fuentesAccionesCompletas = ['eventos', 'analisis', 'partidos'].every(k => fuentes[k].estado === 'disponible')
  const estado = Object.values(fuentes).every(f => f.estado === 'disponible') && !Object.values(incidencias).some(v => v.length) && !eventos.some(e => !e.partidoId) ? 'disponible' : 'parcial'
  return { estado, anio: alcance.anio, fuentes: Object.fromEntries(Object.entries(fuentes).map(([k, f]) => [k, { estado: f.estado }])), incidencias,
    jugadoras: alcance.jugadoraIds.map(jugadorId => {
      const propios = eventos.filter(e => e.evento.jugador_id === jugadorId)
      const vinculados = propios.filter(e => e.partidoId), sinVinculo = propios.filter(e => !e.partidoId)
      const deportivos = filas('estadisticas').filter(s => s.jugador_id === jugadorId && enAnio(partidos.get(s.partido_id)?.fecha))
      const partidoIds = [...new Set(deportivos.map(s => s.partido_id))]
      const participacion = fuentes.estadisticas.estado === 'disponible' && fuentes.partidos.estado === 'disponible' ? resumirParticipacion(deportivos, partidoIds) : { estado: 'no_disponible', minutos: null, titularidades: null }
      const analisisDisponibles = [...analisis.values()].filter(a => enAnio(partidos.get(a.partido_calendario_id)?.fecha) && partidos.get(a.partido_calendario_id)?.categoria_id === a.categoria_id)
      const conAcciones = propios.length > 0
      return { jugadorId,
        oficiales: { estado: fuentes.estadisticas.estado === 'disponible' && fuentes.partidos.estado === 'disponible' ? deportivos.length ? 'con_registros' : 'sin_registros_accesibles' : 'no_disponible', registros: fuentes.estadisticas.estado === 'disponible' && fuentes.partidos.estado === 'disponible' ? deportivos : null, partidosConRegistro: fuentes.estadisticas.estado === 'disponible' && fuentes.partidos.estado === 'disponible' ? partidoIds.length : null, participacionValidada: participacion },
        acciones: { estado: !fuentesAccionesCompletas ? 'parcial_o_inaccesible' : conAcciones ? 'con_registros' : 'sin_registros_accesibles',
          resumen: fuentesAccionesCompletas && conAcciones ? resumirAcciones(propios.map(e => e.evento)) : null,
          vinculadas: vinculados.map(e => e.evento), sinVinculo: sinVinculo.map(e => e.evento),
          cantidadObservada: fuentes.eventos.estado === 'disponible' ? propios.length : null,
          analisisConAcciones: ['eventos', 'analisis'].every(k => fuentes[k].estado === 'disponible') ? new Set(propios.map(e => e.analisisId)).size : null,
          partidosDeportivosConAcciones: fuentesAccionesCompletas ? new Set(vinculados.map(e => e.partidoId)).size : null },
        muestra: { partidosConAnalisisEnAlcance: fuentesAccionesCompletas ? new Set(analisisDisponibles.map(a => a.partido_calendario_id)).size : null,
          coberturaIndividual: 'no_acreditada', por90: null, motivoPor90: 'Pendiente definir y verificar el conjunto individual con participación válida.' },
      }
    }),
  }
}
