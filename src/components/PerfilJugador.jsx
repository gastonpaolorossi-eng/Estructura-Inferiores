import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const estadoConfig = {
  disponible: { color: '#4ADE80', label: 'Disponible' },
  lesionado: { color: '#FBBF24', label: 'Lesionado' },
  suspendido: { color: '#F87171', label: 'Suspendido' },
}

const pieHabilLabel = {
  derecho: 'Derecho',
  izquierdo: 'Izquierdo',
  ambidiestro: 'Ambidiestro',
}

function iniciales(nombre, apellido) {
  return `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase()
}

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const mes = hoy.getMonth() - nacimiento.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--
  }
  return edad
}

function formatearFecha(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const [anio, mes, dia] = fechaNacimiento.split('-')
  return `${dia}/${mes}/${anio}`
}

function PerfilJugador({ jugadorId, onVolver, onVerFichaMedica }) {
  const [jugador, setJugador] = useState(null)
  const [estadisticas, setEstadisticas] = useState([])
  const [fichasMedicas, setFichasMedicas] = useState([])

  useEffect(() => {
    async function cargarDatos() {
      const { data: jugadorData } = await supabase
        .from('jugadores')
        .select('*, categorias(nombre)')
        .eq('id', jugadorId)
        .single()
      setJugador(jugadorData)

      const { data: statsData } = await supabase
        .from('estadisticas_jugador')
        .select('*')
        .eq('jugador_id', jugadorId)
      setEstadisticas(statsData || [])

      const { data: fichasData } = await supabase
        .from('fichas_medicas')
        .select('*')
        .eq('jugador_id', jugadorId)
        .order('fecha', { ascending: false })
      setFichasMedicas(fichasData || [])
    }
    cargarDatos()
  }, [jugadorId])

  if (!jugador) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F1419' }}>
        <p style={{ color: '#5B6B85' }}>Cargando...</p>
      </div>
    )
  }

  const estado = estadoConfig[jugador.estado] || estadoConfig.disponible
  const edad = calcularEdad(jugador.fecha_nacimiento)

  const totales = estadisticas.reduce(
    (acc, e) => ({
      partidos: acc.partidos + 1,
      minutos: acc.minutos + (e.minutos_jugados || 0),
      goles: acc.goles + (e.goles || 0),
      asistencias: acc.asistencias + (e.asistencias || 0),
      amarillas: acc.amarillas + (e.tarjetas_amarillas || 0),
      rojas: acc.rojas + (e.tarjetas_rojas || 0),
    }),
    { partidos: 0, minutos: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0 }
  )

  const ultimaFicha = fichasMedicas[0]
  const lesionesActivas = fichasMedicas.filter((f) => !f.recuperado).length

  const datosPersonales = [
    { label: 'Posición', valor: jugador.posicion },
    { label: 'Fecha nac.', valor: formatearFecha(jugador.fecha_nacimiento), extra: edad !== null ? `${edad} años` : null },
    { label: 'Pie hábil', valor: pieHabilLabel[jugador.pie_habil] },
  ].filter((d) => d.valor)

  const disciplinas = [
    {
      nombre: 'Kinesiología / Médica',
      icono: '🩺',
      resumen:
        fichasMedicas.length === 0
          ? 'Sin datos cargados'
          : `${fichasMedicas.length} registro${fichasMedicas.length > 1 ? 's' : ''}${
              lesionesActivas > 0 ? ` · ${lesionesActivas} activo${lesionesActivas > 1 ? 's' : ''}` : ''
            }`,
      detalle: ultimaFicha ? `Último: ${ultimaFicha.descripcion || ultimaFicha.fecha}` : null,
    },
    { nombre: 'Nutrición', icono: '🥗', resumen: 'Sin datos cargados' },
    { nombre: 'Psicología', icono: '🧠', resumen: 'Sin datos cargados' },
    { nombre: 'Videoanálisis', icono: '🎥', resumen: 'Sin datos cargados' },
  ]

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#0F1419' }}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onVolver}
          className="text-sm mb-6 flex items-center gap-1 hover:opacity-70 transition-opacity"
          style={{ color: '#8A9BB8' }}
        >
          ← Volver al plantel
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full shrink-0 text-lg font-bold"
            style={{
              backgroundColor: '#1A2332',
              border: `2px solid ${estado.color}`,
              color: estado.color,
              fontFamily: "'Archivo Black', sans-serif",
            }}
          >
            {iniciales(jugador.nombre, jugador.apellido)}
          </div>
          <div>
            <h1
              className="text-2xl md:text-3xl"
              style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
            >
              {jugador.apellido}, {jugador.nombre}
            </h1>
            <p className="text-sm" style={{ color: estado.color }}>
              {estado.label}
              {jugador.estado_detalle && ` — ${jugador.estado_detalle}`}
            </p>
          </div>
          <span
            className="ml-auto text-xs font-mono px-2.5 py-1 rounded-full shrink-0"
            style={{ backgroundColor: '#1A2332', color: '#8A9BB8', border: '1px solid #2A3548' }}
          >
            {jugador.categorias?.nombre}
          </span>
        </div>

        {datosPersonales.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {datosPersonales.map((d) => (
              <div
                key={d.label}
                className="px-3 py-2 rounded-xl"
                style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}
              >
                <p className="text-[10px] uppercase tracking-wide" style={{ color: '#5B6B85' }}>
                  {d.label}
                </p>
                <p className="text-sm" style={{ color: '#F0F2F5' }}>
                  {d.valor}
                  {d.extra && <span style={{ color: '#5B6B85' }}> · {d.extra}</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#5B6B85' }}>
          Estadísticas
        </p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Partidos', valor: totales.partidos },
            { label: 'Minutos', valor: totales.minutos },
            { label: 'Goles', valor: totales.goles },
            { label: 'Asist.', valor: totales.asistencias },
            { label: 'Amar.', valor: totales.amarillas },
            { label: 'Rojas', valor: totales.rojas },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-3 rounded-xl text-center"
              style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}
            >
              <p
                className="text-xl"
                style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
              >
                {stat.valor}
              </p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: '#5B6B85' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#5B6B85' }}>
          Áreas
        </p>
        <div className="grid grid-cols-2 gap-3">
          {disciplinas.map((d) => (
            <div
              key={d.nombre}
              onClick={() => {
                if (d.nombre === 'Kinesiología / Médica') onVerFichaMedica(jugadorId)
              }}
              className="p-4 rounded-xl cursor-pointer hover:-translate-y-0.5 transition-all duration-200"
              style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}
            >
              <p className="text-2xl mb-2">{d.icono}</p>
              <p className="text-sm font-medium" style={{ color: '#F0F2F5' }}>
                {d.nombre}
              </p>
              <p className="text-xs mt-1" style={{ color: d.resumen === 'Sin datos cargados' ? '#5B6B85' : '#8A9BB8' }}>
                {d.resumen}
              </p>
              {d.detalle && (
                <p className="text-xs mt-1 truncate" style={{ color: '#5B6B85' }}>
                  {d.detalle}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PerfilJugador