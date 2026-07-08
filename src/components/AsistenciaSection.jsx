import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { obtenerFechaHoy } from '../utils/fecha'

const ESTADOS = [
  { valor: 'presente', label: 'Presente', color: '#4ADE80' },
  { valor: 'tarde', label: 'Tarde', color: '#FBBF24' },
  { valor: 'ausente', label: 'Ausente', color: '#F87171' },
  { valor: 'lesionado', label: 'Lesionado', color: '#FB923C' },
  { valor: 'enfermo', label: 'Enfermo', color: '#7DD3FC' },
]

function AsistenciaSection({ perfil }) {
  const esTecnico = perfil.rol === 'tecnico'
  const [categorias, setCategorias] = useState([])
  const [categoriaId, setCategoriaId] = useState(esTecnico ? perfil.categoria_id : '')
  const [fecha, setFecha] = useState(obtenerFechaHoy())
  const [jugadores, setJugadores] = useState([])
  const [asistencias, setAsistencias] = useState({})
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (esTecnico) return
    async function cargarCategorias() {
      const { data } = await supabase.from('categorias').select('*').order('orden')
      setCategorias(data || [])
    }
    cargarCategorias()
  }, [esTecnico])

  useEffect(() => {
    async function cargar() {
      if (!categoriaId || !fecha) {
        setJugadores([])
        return
      }
      setCargando(true)
      setMensaje('')

      const { data: jugadoresData } = await supabase
        .from('jugadores')
        .select('*')
        .eq('categoria_id', categoriaId)
        .order('apellido')
      setJugadores(jugadoresData || [])

      const ids = (jugadoresData || []).map((j) => j.id)
      if (ids.length > 0) {
        const { data: asistenciasData } = await supabase
          .from('asistencias')
          .select('*')
          .eq('fecha', fecha)
          .in('jugador_id', ids)
        const mapa = {}
        ;(asistenciasData || []).forEach((a) => {
          mapa[a.jugador_id] = a.estado
        })
        // Por defecto todos presentes; el técnico marca las excepciones.
        ;(jugadoresData || []).forEach((j) => {
          if (!mapa[j.id]) mapa[j.id] = 'presente'
        })
        setAsistencias(mapa)
      } else {
        setAsistencias({})
      }

      setCargando(false)
    }
    cargar()
  }, [categoriaId, fecha])

  function marcar(jugadorId, estado) {
    setAsistencias((prev) => ({
      ...prev,
      [jugadorId]: prev[jugadorId] === estado ? undefined : estado,
    }))
  }

  function marcarTodos(estado) {
    const nuevo = {}
    jugadores.forEach((j) => {
      nuevo[j.id] = estado
    })
    setAsistencias(nuevo)
  }

  async function handleGuardar() {
    setGuardando(true)
    setMensaje('')

    const filas = Object.entries(asistencias)
      .filter(([, estado]) => !!estado)
      .map(([jugadorId, estado]) => ({
        fecha,
        jugador_id: jugadorId,
        estado,
      }))

    if (filas.length > 0) {
      const { error } = await supabase.from('asistencias').upsert(filas, { onConflict: 'fecha,jugador_id' })
      if (error) {
        setMensaje('Error al guardar: ' + error.message)
        setGuardando(false)
        return
      }
    }

    const idsSinMarcar = jugadores.map((j) => j.id).filter((id) => !asistencias[id])
    if (idsSinMarcar.length > 0) {
      await supabase.from('asistencias').delete().eq('fecha', fecha).in('jugador_id', idsSinMarcar)
    }

    setGuardando(false)
    setMensaje('Listo, asistencia guardada.')
  }

  const inputStyle = {
    backgroundColor: '#1A2332',
    border: '1px solid #2A3548',
    color: '#F0F2F5',
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-xl mx-auto">
        <h1
          className="text-3xl md:text-4xl mb-6"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
        >
          Asistencia
        </h1>

        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full p-2.5 rounded-xl outline-none text-sm"
            style={inputStyle}
          />
          {!esTecnico && (
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full p-2.5 rounded-xl outline-none text-sm"
              style={inputStyle}
            >
              <option value="">Elegí una categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        {cargando && <p style={{ color: '#5B6B85' }}>Cargando...</p>}

        {!cargando && categoriaId && jugadores.length === 0 && (
          <p className="text-sm" style={{ color: '#5B6B85' }}>
            No hay jugadores cargados en esta categoría.
          </p>
        )}

        {!categoriaId && !esTecnico && (
          <p className="text-sm" style={{ color: '#5B6B85' }}>
            Elegí una categoría para ver el plantel.
          </p>
        )}

        {jugadores.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs" style={{ color: '#5B6B85' }}>
                Marcar todos:
              </span>
              {ESTADOS.map((e) => (
                <button
                  key={e.valor}
                  onClick={() => marcarTodos(e.valor)}
                  className="text-xs px-2.5 py-1 rounded-full hover:opacity-80"
                  style={{ backgroundColor: '#1A2332', color: e.color, border: '1px solid #2A3548' }}
                >
                  {e.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 mb-6">
              {jugadores.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl flex-wrap"
                  style={inputStyle}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {j.foto_url ? (
                      <img
                        src={j.foto_url}
                        alt={`${j.apellido}, ${j.nombre}`}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ backgroundColor: '#0F1419', color: '#8A9BB8' }}
                      >
                        {`${j.nombre?.[0] || ''}${j.apellido?.[0] || ''}`.toUpperCase()}
                      </span>
                    )}
                    <p className="text-sm truncate" style={{ color: '#F0F2F5' }}>
                      {j.apellido}, {j.nombre}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap">
                    {ESTADOS.map((e) => {
                      const activo = asistencias[j.id] === e.valor
                      return (
                        <button
                          key={e.valor}
                          onClick={() => marcar(j.id, e.valor)}
                          className="text-[10px] px-2 py-1 rounded-full transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: activo ? e.color : '#0F1419',
                            color: activo ? '#0F1419' : '#8A9BB8',
                            fontWeight: activo ? 700 : 400,
                          }}
                        >
                          {e.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {mensaje && (
              <p className="text-sm mb-4" style={{ color: mensaje.startsWith('Listo') ? '#4ADE80' : '#F87171' }}>
                {mensaje}
              </p>
            )}

            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="w-full p-3 rounded-xl font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#4ADE80', color: '#0F1419' }}
            >
              {guardando ? 'Guardando...' : 'Guardar asistencia'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default AsistenciaSection
