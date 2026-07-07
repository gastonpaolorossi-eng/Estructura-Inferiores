import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SÁ']

const PALETA_ENTRENAMIENTO = [
  { bg: '#3B2F6B', color: '#C4B5FD' },
  { bg: '#1E4620', color: '#86EFAC' },
  { bg: '#1E3A5F', color: '#7DD3FC' },
  { bg: '#5C3A1E', color: '#FDBA74' },
  { bg: '#5C1E3A', color: '#F9A8D4' },
  { bg: '#1E5C52', color: '#5EEAD4' },
]

function colorParaContenido(contenido) {
  if (!contenido) return { bg: '#1A2332', color: '#8A9BB8' }
  let hash = 0
  for (let i = 0; i < contenido.length; i++) {
    hash = contenido.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETA_ENTRENAMIENTO[Math.abs(hash) % PALETA_ENTRENAMIENTO.length]
}

function primerDiaDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
}

function ultimoDiaDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)
}

function aISO(fecha) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function formatearFechaLarga(fechaStr) {
  const [anio, mes, dia] = fechaStr.split('-')
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia))
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return `${diasSemana[fecha.getDay()]} ${dia}/${mes}`
}

function agruparPartidosPorRival(eventos) {
  const mapa = new Map()
  const resultado = []
  eventos.forEach((e) => {
    if (e.tipo !== 'partido') {
      resultado.push(e)
      return
    }
    const clave = `${e.fecha}|${(e.rival || e.titulo).toLowerCase().trim()}`
    if (mapa.has(clave)) {
      const existente = mapa.get(clave)
      if (e.categoria && !existente.categorias.includes(e.categoria)) {
        existente.categorias.push(e.categoria)
      }
      existente.categoriaIds.push(e.categoriaId)
    } else {
      const nuevo = {
        ...e,
        categorias: e.categoria ? [e.categoria] : [],
        categoriaIds: [e.categoriaId],
      }
      mapa.set(clave, nuevo)
      resultado.push(nuevo)
    }
  })
  return resultado
}

function construirMatrizSemanas(mesActual) {
  const primero = primerDiaDelMes(mesActual)
  const ultimo = ultimoDiaDelMes(mesActual)

  const inicioGrilla = new Date(primero)
  inicioGrilla.setDate(inicioGrilla.getDate() - primero.getDay())

  const finGrilla = new Date(ultimo)
  finGrilla.setDate(finGrilla.getDate() + (6 - ultimo.getDay()))

  const semanas = []
  let semana = []
  const cursor = new Date(inicioGrilla)
  while (cursor <= finGrilla) {
    semana.push({
      fecha: new Date(cursor),
      iso: aISO(cursor),
      delMes: cursor.getMonth() === mesActual.getMonth(),
    })
    if (semana.length === 7) {
      semanas.push(semana)
      semana = []
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return semanas
}

function CalendarioSection({ perfil }) {
  const [mesActual, setMesActual] = useState(() => primerDiaDelMes(new Date()))
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [categorias, setCategorias] = useState([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => aISO(new Date()))

  useEffect(() => {
    async function cargarCategorias() {
      const { data } = await supabase.from('categorias').select('*').order('orden')
      setCategorias(data || [])
    }
    cargarCategorias()
  }, [])

  useEffect(() => {
    async function cargarEventos() {
      setCargando(true)
      const semanas = construirMatrizSemanas(mesActual)
      const desde = semanas[0][0].iso
      const hasta = semanas[semanas.length - 1][6].iso

      const { data: partidosData } = await supabase
        .from('partidos')
        .select('*, categorias(nombre)')
        .gte('fecha', desde)
        .lte('fecha', hasta)

      const { data: entrenamientosData } = await supabase
        .from('videos')
        .select('*, categorias(nombre)')
        .eq('tipo', 'entrenamiento')
        .gte('fecha', desde)
        .lte('fecha', hasta)

      const items = [
        ...(partidosData || []).map((p) => ({
          id: `partido-${p.id}`,
          fecha: p.fecha,
          tipo: 'partido',
          titulo: `vs ${p.rival}`,
          rival: p.rival,
          detalle: p.hora ? `${p.hora}${p.lugar ? ` · ${p.lugar}` : ''}` : p.lugar || '',
          categoria: p.categorias?.nombre,
          categoriaId: p.categoria_id,
          escudo: p.escudo_url,
        })),
        ...(entrenamientosData || []).map((e) => ({
          id: `entrenamiento-${e.id}`,
          fecha: e.fecha,
          tipo: 'entrenamiento',
          titulo: e.contenido || 'Entrenamiento',
          detalle: e.descripcion || '',
          categoria: e.categorias?.nombre,
          categoriaId: e.categoria_id,
        })),
      ].sort((a, b) => a.fecha.localeCompare(b.fecha))

      setEventos(items)
      setCargando(false)
    }
    cargarEventos()
  }, [mesActual])

  const eventosFiltrados = eventos.filter((e) => !categoriaFiltro || e.categoriaId === categoriaFiltro)
  const eventosParaMostrar = agruparPartidosPorRival(eventosFiltrados)

  const eventosPorDia = eventosParaMostrar.reduce((acc, e) => {
    if (!acc[e.fecha]) acc[e.fecha] = []
    acc[e.fecha].push(e)
    return acc
  }, {})

  const hoyISO = aISO(new Date())
  const semanas = construirMatrizSemanas(mesActual)
  const eventosDelDiaSeleccionado = diaSeleccionado ? eventosPorDia[diaSeleccionado] || [] : []

  const inputStyle = {
    backgroundColor: '#1A2332',
    border: '1px solid #2A3548',
    color: '#F0F2F5',
  }

  function irAHoy() {
    setMesActual(primerDiaDelMes(new Date()))
    setDiaSeleccionado(hoyISO)
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <h1
          className="text-3xl md:text-4xl mb-6"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
        >
          Calendario
        </h1>

        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMesActual((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="text-sm px-3 py-1.5 rounded-lg hover:opacity-80"
              style={{ backgroundColor: '#1A2332', color: '#8A9BB8', border: '1px solid #2A3548' }}
            >
              ←
            </button>
            <p className="text-sm font-medium min-w-[140px] text-center" style={{ color: '#F0F2F5' }}>
              {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
            </p>
            <button
              onClick={() => setMesActual((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="text-sm px-3 py-1.5 rounded-lg hover:opacity-80"
              style={{ backgroundColor: '#1A2332', color: '#8A9BB8', border: '1px solid #2A3548' }}
            >
              →
            </button>
            <button
              onClick={irAHoy}
              className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80"
              style={{ backgroundColor: '#1A2332', color: '#4ADE80', border: '1px solid #2A3548' }}
            >
              Hoy
            </button>
          </div>

          {perfil.rol !== 'tecnico' && (
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="p-2 rounded-xl outline-none text-sm"
              style={inputStyle}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        {cargando && <p style={{ color: '#5B6B85' }}>Cargando...</p>}

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2A3548' }}>
          <div className="grid grid-cols-7" style={{ backgroundColor: '#1A2332' }}>
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] uppercase tracking-wide py-2"
                style={{ color: '#5B6B85' }}
              >
                {d}
              </div>
            ))}
          </div>

          {semanas.map((semana, i) => (
            <div key={i} className="grid grid-cols-7" style={{ borderTop: '1px solid #2A3548' }}>
              {semana.map((dia) => {
                const eventosDia = eventosPorDia[dia.iso] || []
                const esHoy = dia.iso === hoyISO
                const esSeleccionado = dia.iso === diaSeleccionado
                const visibles = eventosDia.slice(0, 3)
                const restantes = eventosDia.length - visibles.length

                return (
                  <div
                    key={dia.iso}
                    onClick={() => setDiaSeleccionado(dia.iso)}
                    className="min-h-[84px] p-1.5 cursor-pointer"
                    style={{
                      borderLeft: '1px solid #2A3548',
                      backgroundColor: esSeleccionado ? '#1A2332' : 'transparent',
                      opacity: dia.delMes ? 1 : 0.35,
                    }}
                  >
                    <div className="flex justify-end mb-1">
                      <span
                        className="w-5 h-5 flex items-center justify-center text-xs rounded-full"
                        style={{
                          backgroundColor: esHoy ? '#4ADE80' : 'transparent',
                          color: esHoy ? '#0F1419' : '#8A9BB8',
                          fontWeight: esHoy ? 700 : 400,
                        }}
                      >
                        {dia.fecha.getDate()}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {visibles.map((e) => {
                        const c =
                          e.tipo === 'partido'
                            ? { bg: '#0F1419', color: '#4ADE80' }
                            : colorParaContenido(e.titulo)
                        return (
                          <div
                            key={e.id}
                            className="text-[9px] px-1 py-0.5 rounded truncate leading-tight"
                            style={{ backgroundColor: c.bg, color: c.color }}
                            title={e.titulo}
                          >
                            {e.tipo === 'partido' ? '🛡️ ' : ''}
                            {e.titulo}
                          </div>
                        )
                      })}
                      {restantes > 0 && (
                        <p className="text-[9px] px-1" style={{ color: '#5B6B85' }}>
                          +{restantes} más
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {diaSeleccionado && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#5B6B85' }}>
              {formatearFechaLarga(diaSeleccionado)}
            </p>

            {eventosDelDiaSeleccionado.length === 0 ? (
              <p className="text-sm" style={{ color: '#5B6B85' }}>
                No hay partidos ni entrenamientos ese día.
              </p>
            ) : (
              <div className="space-y-2">
                {eventosDelDiaSeleccionado.map((e) => (
                  <div
                    key={e.id}
                    className="p-3 rounded-xl flex items-center gap-3"
                    style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}
                  >
                    {e.tipo === 'partido' ? (
                      e.escudo ? (
                        <img
                          src={e.escudo}
                          alt={e.titulo}
                          className="w-8 h-8 rounded object-contain shrink-0"
                          style={{ backgroundColor: '#0F1419' }}
                        />
                      ) : (
                        <span
                          className="w-8 h-8 rounded flex items-center justify-center text-sm shrink-0"
                          style={{ backgroundColor: '#0F1419', color: '#5B6B85' }}
                        >
                          🛡️
                        </span>
                      )
                    ) : (
                      <span
                        className="w-8 h-8 rounded flex items-center justify-center text-sm shrink-0"
                        style={{ backgroundColor: '#0F1419' }}
                      >
                        🏋️
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#F0F2F5' }}>
                        {e.titulo}
                      </p>
                      <p className="text-xs truncate" style={{ color: '#8A9BB8' }}>
                        {e.detalle}
                        {e.categorias?.length > 0 && ` · ${e.categorias.join(', ')}`}
                        {!e.categorias && e.categoria && ` · ${e.categoria}`}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-mono px-2 py-1 rounded-full shrink-0"
                      style={{
                        backgroundColor: '#0F1419',
                        color: e.tipo === 'partido' ? '#4ADE80' : '#8A9BB8',
                      }}
                    >
                      {e.tipo === 'partido' ? 'Partido' : 'Entrenamiento'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CalendarioSection
