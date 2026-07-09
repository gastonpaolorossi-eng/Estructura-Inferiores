import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { obtenerFechaHoy } from '../utils/fecha'
import { obtenerJugadoresDeCategoria } from '../utils/jugadoresCategoria'

const CAMPOS = [
  { clave: 'sueno', label: 'Sueño' },
  { clave: 'dolor_muscular', label: 'Dolor muscular' },
  { clave: 'fatiga', label: 'Fatiga' },
  { clave: 'estres', label: 'Estrés' },
]

function BienestarSection({ perfil }) {
  const esTecnico = perfil.rol === 'tecnico'
  const [categorias, setCategorias] = useState([])
  const [categoriaId, setCategoriaId] = useState(esTecnico ? perfil.categoria_id : '')
  const [fecha, setFecha] = useState(obtenerFechaHoy())
  const [jugadores, setJugadores] = useState([])
  const [datos, setDatos] = useState({})
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    async function cargarCategorias() {
      const { data } = await supabase.from('categorias').select('*').order('orden')
      setCategorias(data || [])
    }
    cargarCategorias()
  }, [])

  useEffect(() => {
    async function cargar() {
      if (!categoriaId || !fecha) {
        setJugadores([])
        return
      }
      setCargando(true)
      setMensaje('')

      const { data: jugadoresData } = await obtenerJugadoresDeCategoria(supabase, categoriaId, categorias)
      setJugadores(jugadoresData || [])

      const ids = (jugadoresData || []).map((j) => j.id)
      if (ids.length > 0) {
        const { data: bienestarData } = await supabase
          .from('bienestar')
          .select('*')
          .eq('fecha', fecha)
          .in('jugador_id', ids)
        const mapa = {}
        ;(bienestarData || []).forEach((b) => {
          mapa[b.jugador_id] = b
        })
        setDatos(mapa)
      } else {
        setDatos({})
      }

      setCargando(false)
    }
    cargar()
  }, [categoriaId, fecha, categorias])

  function marcar(jugadorId, campo, valor) {
    setDatos((prev) => ({
      ...prev,
      [jugadorId]: {
        ...(prev[jugadorId] || {}),
        [campo]: prev[jugadorId]?.[campo] === valor ? null : valor,
      },
    }))
  }

  function tieneAlgunValor(fila) {
    if (!fila) return false
    return CAMPOS.some((c) => fila[c.clave] !== undefined && fila[c.clave] !== null)
  }

  async function handleGuardar() {
    setGuardando(true)
    setMensaje('')

    const filas = jugadores
      .filter((j) => tieneAlgunValor(datos[j.id]))
      .map((j) => {
        const fila = datos[j.id] || {}
        const registro = { fecha, jugador_id: j.id }
        CAMPOS.forEach((c) => {
          registro[c.clave] = fila[c.clave] ?? null
        })
        return registro
      })

    if (filas.length > 0) {
      const { error } = await supabase.from('bienestar').upsert(filas, { onConflict: 'fecha,jugador_id' })
      if (error) {
        setMensaje('Error al guardar: ' + error.message)
        setGuardando(false)
        return
      }
    }

    const idsSinDatos = jugadores.map((j) => j.id).filter((id) => !tieneAlgunValor(datos[id]))
    if (idsSinDatos.length > 0) {
      await supabase.from('bienestar').delete().eq('fecha', fecha).in('jugador_id', idsSinDatos)
    }

    setGuardando(false)
    setMensaje('Listo, bienestar guardado.')
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
          className="text-3xl md:text-4xl mb-2 flex items-center gap-3"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
        >
          <span>🧠</span> Bienestar
        </h1>
        <p className="text-sm mb-6" style={{ color: '#5B6B85' }}>
          Chequeo rápido antes del entrenamiento: 1 (mejor) a 5 (peor).
        </p>

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
            <div className="space-y-3 mb-6">
              {jugadores.map((j) => {
                const fila = datos[j.id] || {}
                return (
                  <div key={j.id} className="p-3 rounded-xl" style={inputStyle}>
                    <div className="flex items-center gap-2 mb-2.5">
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
                      <p className="text-sm font-medium truncate" style={{ color: '#F0F2F5' }}>
                        {j.apellido}, {j.nombre}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {CAMPOS.map((c) => (
                        <div key={c.clave}>
                          <p className="text-[10px] uppercase mb-1" style={{ color: '#5B6B85' }}>
                            {c.label}
                          </p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((v) => {
                              const activo = fila[c.clave] === v
                              return (
                                <button
                                  key={v}
                                  onClick={() => marcar(j.id, c.clave, v)}
                                  className="flex-1 py-1 rounded-md text-[11px] font-mono transition-opacity hover:opacity-80"
                                  style={{
                                    backgroundColor: activo ? '#7DD3FC' : '#0F1419',
                                    color: activo ? '#0F1419' : '#8A9BB8',
                                    fontWeight: activo ? 700 : 400,
                                  }}
                                >
                                  {v}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
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
              {guardando ? 'Guardando...' : 'Guardar bienestar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default BienestarSection
