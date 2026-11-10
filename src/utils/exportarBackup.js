import * as XLSX from 'xlsx'
import { supabase } from '../supabaseClient'

const TAMANO_PAGINA = 1000

function hojaDesdeFilas(filas) {
  return XLSX.utils.json_to_sheet(filas)
}

// Supabase devuelve como máximo 1000 filas por consulta: se pide en bloques
// hasta que una página llega incompleta. Devuelve { data, error } como una consulta normal.
async function leerTodasLasFilas(crearConsulta) {
  const filas = []
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await crearConsulta().range(desde, desde + TAMANO_PAGINA - 1)
    if (error) return { data: null, error }
    filas.push(...(data || []))
    if (!data || data.length < TAMANO_PAGINA) return { data: filas, error: null }
  }
}

export async function exportarBackupCompleto() {
  const libro = XLSX.utils.book_new()

  // --- Jugadores ---
  const { data: jugadoresData } = await leerTodasLasFilas(() => supabase
    .from('jugadores')
    .select('*, categorias(nombre)')
    .order('apellido')
    .order('id'))

  const filasJugadores = (jugadoresData || []).map((j) => ({
    Apellido: j.apellido,
    Nombre: j.nombre,
    Categoría: j.categorias?.nombre || '',
    Posición: j.posicion || '',
    'Fecha nacimiento': j.fecha_nacimiento || '',
    Estado: j.estado || '',
    'Pie hábil': j.pie_habil || '',
    Nacionalidad: j.nacionalidad || '',
  }))

  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(filasJugadores), 'Jugadores')

  // --- Partidos ---
  const { data: partidosData } = await leerTodasLasFilas(() => supabase
    .from('partidos')
    .select('*, categorias(nombre)')
    .order('fecha', { ascending: false })
    .order('id'))

  const filasPartidos = (partidosData || []).map((p) => ({
    Fecha: p.fecha,
    Hora: p.hora || '',
    Categoría: p.categorias?.nombre || '',
    Rival: p.rival || '',
    'Local/Visitante': p.local_visitante || '',
    Lugar: p.lugar || '',
    'Goles local': p.goles_local ?? '',
    'Goles visitante': p.goles_visitante ?? '',
    'Nro. fecha': p.numero_fecha || '',
  }))

  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(filasPartidos), 'Partidos')

  // --- Estadísticas ---
  const { data: statsData } = await leerTodasLasFilas(() => supabase
    .from('estadisticas_jugador')
    .select('*, jugadores(nombre, apellido), partidos(fecha, rival)')
    .order('id'))

  const filasStats = (statsData || []).map((s) => ({
    Jugadora: s.jugadores ? `${s.jugadores.apellido}, ${s.jugadores.nombre}` : '',
    Partido: s.partidos ? `vs ${s.partidos.rival} (${s.partidos.fecha})` : '',
    Titular: s.titular ? 'Sí' : 'No',
    Minutos: s.minutos_jugados ?? '',
    Goles: s.goles ?? '',
    Asistencias: s.asistencias ?? '',
    Amarillas: s.tarjetas_amarillas ?? '',
    Rojas: s.tarjetas_rojas ?? '',
  }))

  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(filasStats), 'Estadisticas')

  // --- Asistencia ---
  const { data: asistenciasData } = await leerTodasLasFilas(() => supabase
    .from('asistencias')
    .select('*, jugadores(nombre, apellido, categorias(nombre))')
    .order('fecha', { ascending: false })
    .order('id'))

  const filasAsistencias = (asistenciasData || []).map((a) => ({
    Fecha: a.fecha,
    Jugadora: a.jugadores ? `${a.jugadores.apellido}, ${a.jugadores.nombre}` : '',
    Categoría: a.jugadores?.categorias?.nombre || '',
    Estado: a.estado,
  }))

  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(filasAsistencias), 'Asistencia')

  // --- Bienestar original ---
  const { data: bienestarData } = await leerTodasLasFilas(() => supabase
    .from('bienestar')
    .select('*, jugadores(nombre, apellido)')
    .order('fecha', { ascending: false })
    .order('id'))

  const filasBienestar = (bienestarData || []).map((b) => ({
    Fecha: b.fecha,
    Jugadora: b.jugadores ? `${b.jugadores.apellido}, ${b.jugadores.nombre}` : '',
    Sueño: b.sueno ?? '',
    'Dolor muscular': b.dolor_muscular ?? '',
    Fatiga: b.fatiga ?? '',
    Estrés: b.estres ?? '',
    'Ánimo entrenar': b.animo_entrenar ?? '',
  }))

  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(filasBienestar), 'Bienestar')

  // --- RPE ---
  const { data: rpeData, error: rpeError } = await leerTodasLasFilas(() => supabase
    .from('sesiones_fisicas')
    .select('*, jugadores(nombre, apellido)')
    .order('fecha', { ascending: false })
    .order('id'))

  if (rpeError) throw rpeError

  const filasRPE = (rpeData || []).map((r) => ({
    Fecha: r.fecha,
    Jugadora: r.jugadores ? `${r.jugadores.apellido}, ${r.jugadores.nombre}` : '',
    Actividad: r.tipo || '',
    RPE: r.rpe ?? '',
    'ID partido': r.partido_id ?? '',
  }))

  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(filasRPE), 'RPE')

  // --- CMJ ---
  const { data: cmjData, error: cmjError } = await leerTodasLasFilas(() => supabase
    .from('cmj')
    .select('*, jugadores(nombre, apellido)')
    .order('fecha', { ascending: false })
    .order('id'))

  if (cmjError) throw cmjError

  const filasCMJ = (cmjData || []).map((c) => ({
    Fecha: c.fecha,
    Jugadora: c.jugadores ? `${c.jugadores.apellido}, ${c.jugadores.nombre}` : '',
    'Valor CMJ (cm)': c.valor_cm ?? '',
  }))

  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(filasCMJ), 'CMJ')

  // --- Wellness adicional ---
  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(filasBienestar), 'Wellness')

  // --- Descargar backup ---
  const hoy = new Date()
  const fechaArchivo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  XLSX.writeFile(libro, `Backup_ClubComunicaciones_${fechaArchivo}.xlsx`)
}
