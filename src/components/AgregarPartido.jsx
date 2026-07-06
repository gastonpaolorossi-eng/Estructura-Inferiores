import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { obtenerFechaHoy } from '../utils/fecha'

function AgregarPartido({ categoriaId, onVolver, onGuardado, partidoIdEditar }) {
  const [rival, setRival] = useState('')
  const [fecha, setFecha] = useState(() => (partidoIdEditar ? '' : obtenerFechaHoy()))
  const [hora, setHora] = useState('')
  const [lugar, setLugar] = useState('')
  const [localVisitante, setLocalVisitante] = useState('local')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [cargando, setCargando] = useState(!!partidoIdEditar)

  const esEdicion = !!partidoIdEditar

  const inputStyle = {
    backgroundColor: '#1A2332',
    border: '1px solid #2A3548',
    color: '#F0F2F5',
  }

  useEffect(() => {
    async function cargarPartido() {
      if (!partidoIdEditar) return
      const { data } = await supabase
        .from('partidos')
        .select('*')
        .eq('id', partidoIdEditar)
        .single()
      if (data) {
        setRival(data.rival || '')
        setFecha(data.fecha || '')
        setHora(data.hora || '')
        setLugar(data.lugar || '')
        setLocalVisitante(data.local_visitante || 'local')
      }
      setCargando(false)
    }
    cargarPartido()
  }, [partidoIdEditar])

  async function handleGuardar() {
    setErrorMsg('')
    if (!rival || !fecha) {
      setErrorMsg('Rival y fecha son obligatorios.')
      return
    }
    setGuardando(true)

    const datos = {
      rival,
      fecha,
      hora: hora || null,
      lugar: lugar || null,
      local_visitante: localVisitante,
      categoria_id: categoriaId,
    }

    const { error } = esEdicion
      ? await supabase.from('partidos').update(datos).eq('id', partidoIdEditar)
      : await supabase.from('partidos').insert(datos)

    setGuardando(false)
    if (error) {
      setErrorMsg('Error al guardar: ' + error.message)
    } else {
      onGuardado()
    }
  }

  if (cargando) {
    return (
      <div className="p-6 md:p-10">
        <p style={{ color: '#5B6B85' }}>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-xl mx-auto">
        <button
          onClick={onVolver}
          className="text-sm mb-6 flex items-center gap-1 hover:opacity-70 transition-opacity"
          style={{ color: '#8A9BB8' }}
        >
          ← Volver
        </button>

        <h1
          className="text-2xl md:text-3xl mb-8"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
        >
          {esEdicion ? 'Editar partido' : 'Nuevo partido'}
        </h1>

        <div className="space-y-3 mb-6">
          <input
            type="text"
            placeholder="Rival"
            value={rival}
            onChange={(e) => setRival(e.target.value)}
            className="w-full p-2.5 rounded-xl outline-none text-sm"
            style={inputStyle}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="p-2.5 rounded-xl outline-none text-sm"
              style={inputStyle}
            />
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="p-2.5 rounded-xl outline-none text-sm"
              style={inputStyle}
            />
          </div>
          <input
            type="text"
            placeholder="Lugar / cancha"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            className="w-full p-2.5 rounded-xl outline-none text-sm"
            style={inputStyle}
          />
          <select
            value={localVisitante}
            onChange={(e) => setLocalVisitante(e.target.value)}
            className="w-full p-2.5 rounded-xl outline-none text-sm"
            style={inputStyle}
          >
            <option value="local">Local</option>
            <option value="visitante">Visitante</option>
          </select>
        </div>

        {errorMsg && (
          <p className="text-sm mb-4" style={{ color: '#F87171' }}>
            {errorMsg}
          </p>
        )}

        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="w-full p-3 rounded-xl font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: '#4ADE80', color: '#0F1419' }}
        >
          {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Guardar partido'}
        </button>
      </div>
    </div>
  )
}

export default AgregarPartido