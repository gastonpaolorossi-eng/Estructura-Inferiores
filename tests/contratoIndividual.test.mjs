import test from 'node:test'
import assert from 'node:assert/strict'
import { validarAlcanceIndividual, construirContratoIndividual, ESTADO_INTEGRACION_INDIVIDUAL } from '../src/utils/rendimiento/contratoIndividual.js'
const parametros = { usuarioId: 'u', sesionId: 's', proyectoId: 'proyecto', jugadoraIds: ['a'], categoriaIds: ['primera', 'reserva'], anio: 2026 }
const evidenciaSimulada = { estado: 'verificado', usuarioId: 'u', sesionId: 's', proyectoId: 'proyecto', lecturaAnalisis: true, jugadoraIds: ['a', 'b'], categoriaIds: ['primera', 'reserva'] }
const alcance = () => validarAlcanceIndividual({ ...parametros, verificacion: evidenciaSimulada })
const fuente = filas => ({ estado: 'disponible', filas })
function datos() { return {
  partidos: fuente([{ id: 'p', fecha: '2026-01-02', categoria_id: 'reserva' }]),
  analisis: fuente([{ id: 'an', partido_calendario_id: 'p', categoria_id: 'reserva', fecha: '2026-01-02' }]),
  eventos: fuente([{ id: 'e', jugador_id: 'a', partido_id: 'an', tipo: 'Pase correcto', resultado: null }]),
  estadisticas: fuente([{ jugador_id: 'a', partido_id: 'p', minutos_jugados: 90, titular: true }]),
} }

test('Contrato individual: sin sesión, permiso no probado, denegado y alcance simulado válido', () => {
  assert.equal(ESTADO_INTEGRACION_INDIVIDUAL, 'pendiente_verificacion_permisos')
  assert.equal(validarAlcanceIndividual().estado, 'sin_sesion')
  assert.equal(validarAlcanceIndividual(parametros).estado, 'no_verificado')
  assert.equal(validarAlcanceIndividual({ ...parametros, verificacion: { ...evidenciaSimulada, lecturaAnalisis: false } }).estado, 'denegado')
  for (const cambios of [{ usuarioId: 'otro' }, { sesionId: 'otra' }, { proyectoId: 'otro' }]) assert.equal(validarAlcanceIndividual({ ...parametros, verificacion: { ...evidenciaSimulada, ...cambios } }).estado, 'no_verificado')
  assert.equal(validarAlcanceIndividual({ ...parametros, categoriaIds: ['otra'], verificacion: evidenciaSimulada }).estado, 'denegado')
  assert.equal(alcance().estado, 'verificado')
  assert.deepEqual(construirContratoIndividual({ estado: 'no_verificado' }, datos()).jugadoras, [])
})

test('Contrato individual: identidad estable y categoría histórica autorizada, año calendario', () => {
  const d = datos(); d.eventos.filas.push({ id: 'otra', jugador_id: 'b', partido_id: 'an', tipo: 'Gol' })
  const r = construirContratoIndividual(alcance(), d).jugadoras[0]
  assert.equal(r.acciones.cantidadObservada, 1); assert.equal(r.oficiales.participacionValidada.minutos, 90)
  assert.equal(r.muestra.coberturaIndividual, 'no_acreditada')
  d.partidos.filas[0].fecha = '2025-12-31'
  assert.equal(construirContratoIndividual(alcance(), d).jugadoras[0].acciones.cantidadObservada, 0)
})

test('Contrato individual: ausencia, denegación y error nunca equivalen a rendimiento cero', () => {
  const d = datos(); d.eventos.filas = []
  const vacio = construirContratoIndividual(alcance(), d).jugadoras[0]
  assert.equal(vacio.acciones.estado, 'sin_registros_accesibles'); assert.equal(vacio.acciones.resumen, null)
  for (const estado of ['denegado', 'error', 'no_consultada']) {
    d.eventos = { estado, filas: [{ id: 'dato-que-no-debe-usarse' }] }
    const r = construirContratoIndividual(alcance(), d)
    assert.equal(r.fuentes.eventos.estado, estado); assert.equal(r.jugadoras[0].acciones.cantidadObservada, null)
    assert.equal(r.jugadoras[0].acciones.resumen, null)
    d.estadisticas = { estado }
    assert.equal(construirContratoIndividual(alcance(), d).jugadoras[0].oficiales.partidosConRegistro, null)
  }
})

test('Contrato individual: sin vínculo, huérfanos y fechas desconocidas conservan diagnóstico', () => {
  const d = datos(); d.analisis.filas[0].partido_calendario_id = null
  d.eventos.filas.push({ id: 'huerfano', jugador_id: 'a', partido_id: 'inexistente' })
  let r = construirContratoIndividual(alcance(), d)
  assert.equal(r.jugadoras[0].acciones.sinVinculo.length, 1); assert.equal(r.jugadoras[0].acciones.vinculadas.length, 0)
  assert.deepEqual(r.incidencias.eventosSinAnalisisAccesible, ['huerfano'])
  d.analisis.filas[0].fecha = null
  r = construirContratoIndividual(alcance(), d)
  assert.deepEqual(r.incidencias.eventosSinFechaValida, ['e'])
})

test('Contrato individual: varios análisis no duplican minutos; participaciones duplicadas no se suman', () => {
  const d = datos(); d.analisis.filas.push({ ...d.analisis.filas[0], id: 'an2' })
  d.eventos.filas.push({ ...d.eventos.filas[0], id: 'e2', partido_id: 'an2' })
  const original = structuredClone(d)
  let r = construirContratoIndividual(alcance(), d).jugadoras[0]
  assert.equal(r.oficiales.participacionValidada.minutos, 90); assert.equal(r.acciones.analisisConAcciones, 2)
  assert.equal(r.acciones.partidosDeportivosConAcciones, 1)
  assert.deepEqual(d, original)
  d.estadisticas.filas.push({ ...d.estadisticas.filas[0] })
  r = construirContratoIndividual(alcance(), d).jugadoras[0]
  assert.equal(r.oficiales.registros.length, 2); assert.equal(r.oficiales.participacionValidada.minutos, null)
  assert.equal(r.oficiales.participacionValidada.incidencias[0].motivo, 'participacion_duplicada')
})

test('Contrato individual: fórmulas reutilizadas, pendientes/neutros, duplicados e identidades independientes', () => {
  const d = datos()
  d.eventos.filas.push({ id: 'e2', jugador_id: 'a', partido_id: 'an', tipo: 'Pase incorrecto', resultado: 'Fallido' }, { id: 'e3', jugador_id: 'a', partido_id: 'an', tipo: 'Recuperación', resultado: 'Neutro' })
  d.eventos.filas.push({ ...d.eventos.filas[0] })
  const a = validarAlcanceIndividual({ ...parametros, jugadoraIds: ['a', 'b'], verificacion: evidenciaSimulada })
  const r = construirContratoIndividual(a, d)
  assert.equal(r.jugadoras[0].acciones.resumen.pases.precision, 50)
  assert.equal(r.jugadoras[0].acciones.resumen.efectividad.evaluadas, 1)
  assert.equal(r.jugadoras[1].acciones.resumen, null)
  d.eventos.filas.push({ ...d.eventos.filas[0], tipo: 'Gol' })
  assert.deepEqual(construirContratoIndividual(a, d).incidencias.idsConflictivos, ['e'])
})
