import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CategoriaFiltro from './CategoriaFiltro'

const estadoConfig = {
  disponible: { color: '#4ADE80', label: 'Disponible' },
  lesionado: { color: '#FBBF24', label: 'Lesionado' },
}

function iniciales(nombre, apellido) {
  return `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase()
}

function MedicosSection({ jugadorInicialId, onConsumirJugadorInicial }) {
  const [jugadores, setJugadores] = useState([])
  const [categoriaId, setCategoriaId] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null)
  const [fichas, setFichas] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [fecha, setFecha] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tiempoRecuperacion, setTiempoRecuperacion] = useState('')
  const [recuperado, setRecuperado] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [estado, setEstado] = useState('disponible')
  const [estadoDetalle, setEstadoDetalle] = useState('')
  const [guardandoEstado, setGuardandoEstado] = useState(false)

 useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('jugadores')
        .select('*, categorias(nombre)')
        .order('apellido')
      setJugadores(data || [])

      if (jugadorInicialId) {
        const encontrado = data?.find((j) => j.id === jugadorInicialId)
        if (encontrado) {
          abrirJugador(encontrado)
        }
        onConsumirJugadorInicial()
      }
    }
    cargar()
  }, [jugadorInicialId])

  async function cargarFichas(jugadorId) {
    const { data } = await supabase
      .from('fichas_medicas')
      .select('*')
      .eq('jugador_id', jugadorId)
      .order('fecha', { ascending: false })
    setFichas(data || [])
  }

  function abrirJugador(j) {
    setJugadorSeleccionado(j)
    setMostrarForm(false)
    setEstado(j.estado || 'disponible')
    setEstadoDetalle(j.estado_detalle || '')
    cargarFichas(j.id)
  }

  async function handleGuardar() {
    if (!fecha) return
    setGuardando(true)
    await supabase.from('fichas_medicas').insert({
      jugador_id: jugadorSeleccionado.id,
      fecha,
      descripcion,
      tiempo_recuperacion: tiempoRecuperacion || null,
      recuperado,
    })

    if (recuperado) {
      await supabase
        .from('jugadores')
        .update({ estado: 'disponible', estado_detalle: null })
        .eq('id', jugadorSeleccionado.id)

      setEstado('disponible')
      setEstadoDetalle('')
      setJugadorSeleccionado((prev) => ({ ...prev, estado: 'disponible', estado_detalle: null }))
      setJugadores((prev) =>
        prev.map((j) =>
          j.id === jugadorSeleccionado.id ? { ...j, estado: 'disponible', estado_detalle: null } : j
        )
      )
    }

    setGuardando(false)
    setFecha('')
    setDescripcion('')
    setTiempoRecuperacion('')
    setRecuperado(false)
    setMostrarForm(false)
    cargarFichas(jugadorSeleccionado.id)
  }

  async function handleGuardarEstado() {
    setGuardandoEstado(true)
    await supabase
      .from('jugadores')
      .update({ estado, estado_detalle: estadoDetalle || null })
      .eq('id', jugadorSeleccionado.id)
    setGuardandoEstado(false)

    setJugadorSeleccionado((prev) => ({ ...prev, estado, estado_detalle: estadoDetalle }))
    setJugadores((prev) =>
      prev.map((j) =>
        j.id === jugadorSeleccionado.id ? { ...j, estado, estado_detalle: estadoDetalle } : j
      )
    )
  }

  const filtrados = jugadores.filter((j) => {
    const coincideCategoria = !categoriaId || j.categoria_id === categoriaId
    const nombreCompleto = `${j.nombre} ${j.apellido}`.toLowerCase()
    const coincideBusqueda = !busqueda || nombreCompleto.includes(busqueda.toLowerCase())
    return coincideCategoria && coincideBusqueda
  })

  const inputStyle = {
    backgroundColor: '#1A2332',
    border: '1px solid #2A3548',
    color: '#F0F2F5',
  }

  if (jugadorSeleccionado) {
    const estadoActual = estadoConfig[jugadorSeleccionado.estado] || estadoConfig.disponible

    return (
      <div className="p-6 md:p-10">
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => setJugadorSeleccionado(null)}
            className="text-sm mb-6 flex items-center gap-1 hover:opacity-70 transition-opacity"
            style={{ color: '#8A9BB8' }}
          >
            ← Volver
          </button>

          <div className="flex items-center gap-3 mb-6">
            <p className="text-3xl">🩺</p>
            <div>
              <h1
                className="text-2xl"
                style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
              >
                {jugadorSeleccionado.apellido}, {jugadorSeleccionado.nombre}
              </h1>
              <p className="text-xs" style={{ color: estadoActual.color }}>
                {estadoActual.label}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}>
            <p className="text-xs uppercase tracking-wide mb-3" style={{ color: '#5B6B85' }}>
              Estado del jugador
            </p>
            <div className="flex gap-2 mb-3">
              {Object.entries(estadoConfig).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setEstado(key)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: estado === key ? cfg.color : '#0F1419',
                    color: estado === key ? '#0F1419' : '#8A9BB8',
                    border: `1px solid ${estado === key ? cfg.color : '#2A3548'}`,
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Detalle (ej: esguince de tobillo)"
              value={estadoDetalle}
              onChange={(e) => setEstadoDetalle(e.target.value)}
              className="w-full p-2.5 rounded-xl outline-none text-sm mb-3"
              style={inputStyle}
            />
            <button
              onClick={handleGuardarEstado}
              disabled={guardandoEstado}
              className="w-full p-2.5 rounded-xl font-medium text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#4ADE80', color: '#0F1419' }}
            >
              {guardandoEstado ? 'Guardando...' : 'Actualizar estado'}
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wide" style={{ color: '#5B6B85' }}>
              Historial médico
            </p>
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="text-sm font-medium px-4 py-2 rounded-xl transition-opacity hover:opacity-80 shrink-0"
              style={{ backgroundColor: '#4ADE80', color: '#0F1419' }}
            >
              {mostrarForm ? 'Cancelar' : '+ Agregar registro'}
            </button>
          </div>

          {mostrarForm && (
            <div className="space-y-3 mb-6 p-4 rounded-xl" style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full p-2.5 rounded-xl outline-none text-sm"
                style={inputStyle}
              />
              <textarea
                placeholder="Descripción / diagnóstico / tratamiento"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl outline-none text-sm resize-none"
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Tiempo estimado de recuperación (ej: 2 semanas)"
                value={tiempoRecuperacion}
                onChange={(e) => setTiempoRecuperacion(e.target.value)}
                className="w-full p-2.5 rounded-xl outline-none text-sm"
                style={inputStyle}
              />
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#F0F2F5' }}>
                <input
                  type="checkbox"
                  checked={recuperado}
                  onChange={(e) => setRecuperado(e.target.checked)}
                />
                Ya está recuperado
              </label>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="w-full p-2.5 rounded-xl font-medium text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: '#4ADE80', color: '#0F1419' }}
              >
                {guardando ? 'Guardando...' : 'Guardar registro'}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {fichas.map((f) => (
              <div key={f.id} className="p-3.5 rounded-xl" style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-mono" style={{ color: '#8A9BB8' }}>{f.fecha}</p>
                  <div className="flex items-center gap-2">
                    {f.tiempo_recuperacion && (
                      <span
                        className="text-xs font-mono px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#0F1419', color: '#FBBF24' }}
                      >
                        {f.tiempo_recuperacion}
                      </span>
                    )}
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: '#0F1419',
                        color: f.recuperado ? '#4ADE80' : '#F87171',
                      }}
                    >
                      {f.recuperado ? 'Recuperado' : 'Activo'}
                    </span>
                  </div>
                </div>
                <p className="text-sm" style={{ color: '#F0F2F5' }}>{f.descripcion}</p>
              </div>
            ))}
            {fichas.length === 0 && (
              <p className="text-sm" style={{ color: '#5B6B85' }}>Sin registros médicos todavía.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-3xl md:text-4xl mb-6 flex items-center gap-3"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
        >
          <span>🩺</span> Médicos
        </h1>

        <CategoriaFiltro
          categoriaId={categoriaId}
          onCategoriaChange={setCategoriaId}
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
        />

        <div className="space-y-2">
          {filtrados.map((j) => (
            <div
              key={j.id}
              onClick={() => abrirJugador(j)}
              className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer hover:-translate-y-0.5 transition-all duration-200"
              style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-xs font-bold"
                style={{ backgroundColor: '#0F1419', border: '2px solid #2A3548', color: '#8A9BB8', fontFamily: "'Archivo Black', sans-serif" }}
              >
                {iniciales(j.nombre, j.apellido)}
              </div>
              <p className="flex-1 text-sm" style={{ color: '#F0F2F5' }}>
                {j.apellido}, {j.nombre}
              </p>
              <span className="text-xs font-mono px-2 py-1 rounded-full shrink-0" style={{ backgroundColor: '#0F1419', color: '#8A9BB8' }}>
                {j.categorias?.nombre}
              </span>
            </div>
          ))}
        </div>

        {filtrados.length === 0 && (
          <p className="text-sm" style={{ color: '#5B6B85' }}>No se encontraron jugadores con ese filtro.</p>
        )}
      </div>
    </div>
  )
}

export default MedicosSection