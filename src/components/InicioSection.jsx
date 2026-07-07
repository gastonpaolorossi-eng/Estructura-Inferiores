import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function InicioSection({ perfil, onCambiarSeccion }) {
  const [lesionados, setLesionados] = useState([])
  const [proximoPartido, setProximoPartido] = useState(null)
  const [alertasNutricion, setAlertasNutricion] = useState([])
  const [ultimosVideos, setUltimosVideos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      setCargando(true)

      const { data: lesionadosData } = await supabase
        .from('jugadores')
        .select('*, categorias(nombre)')
        .eq('estado', 'lesionado')
        .order('apellido')
      setLesionados(lesionadosData || [])

      if (perfil.rol !== 'medico') {
        const hoy = new Date().toISOString().slice(0, 10)
        const { data: partidosData } = await supabase
          .from('partidos')
          .select('*, categorias(nombre)')
          .gte('fecha', hoy)
          .order('fecha', { ascending: true })

        if (partidosData && partidosData.length > 0) {
          const primeraFecha = partidosData[0].fecha
          const delMismoDia = partidosData.filter((p) => p.fecha === primeraFecha)
          const rivalPrincipal = delMismoDia[0].rival
          const delMismoPartido = delMismoDia.filter(
            (p) => p.rival.toLowerCase().trim() === rivalPrincipal.toLowerCase().trim()
          )
          setProximoPartido({
            ...delMismoPartido[0],
            categoriasNombres: delMismoPartido
              .map((p) => p.categorias?.nombre)
              .filter(Boolean),
          })
        } else {
          setProximoPartido(null)
        }

        const { data: videosData } = await supabase
          .from('videos')
          .select('*, categorias(nombre), jugadores(nombre, apellido)')
          .order('fecha', { ascending: false })
          .limit(5)
        setUltimosVideos(videosData || [])
      }

      if (perfil.rol !== 'tecnico') {
        const { data: nutricionData } = await supabase
          .from('fichas_nutricion')
          .select('*, jugadores(nombre, apellido, categorias(nombre))')
          .eq('alerta_peso', true)
          .order('fecha', { ascending: false })
        // solo la más reciente por jugador
        const vistos = new Set()
        const alertasUnicas = (nutricionData || []).filter((f) => {
          if (vistos.has(f.jugador_id)) return false
          vistos.add(f.jugador_id)
          return true
        })
        setAlertasNutricion(alertasUnicas)
      }

      setCargando(false)
    }
    cargar()
  }, [perfil.rol])

  if (cargando) {
    return (
      <div className="p-6 md:p-10">
        <p style={{ color: '#5B6B85' }}>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-3xl md:text-4xl mb-8"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
        >
          Inicio
        </h1>

        <div className="grid sm:grid-cols-2 gap-4">
          {perfil.rol !== 'medico' && (
            <div
              onClick={() => onCambiarSeccion('partidos')}
              className="p-4 rounded-xl cursor-pointer hover:-translate-y-0.5 transition-all duration-200"
              style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}
            >
              <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#5B6B85' }}>
                Próximo partido
              </p>
              {proximoPartido ? (
                <div className="flex items-center gap-2.5">
                  {proximoPartido.escudo_url ? (
                    <img
                      src={proximoPartido.escudo_url}
                      alt={proximoPartido.rival}
                      className="w-9 h-9 rounded object-contain shrink-0"
                      style={{ backgroundColor: '#0F1419' }}
                    />
                  ) : (
                    <span
                      className="w-9 h-9 rounded flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: '#0F1419', color: '#5B6B85' }}
                    >
                      🛡️
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#F0F2F5' }}>
                      vs {proximoPartido.rival}
                    </p>
                    <p className="text-xs" style={{ color: '#8A9BB8' }}>
                      {proximoPartido.fecha} {proximoPartido.hora && `· ${proximoPartido.hora}`}
                      {proximoPartido.categoriasNombres?.length > 0
                        ? ` · ${proximoPartido.categoriasNombres.join(', ')}`
                        : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: '#5B6B85' }}>No hay partidos próximos cargados.</p>
              )}
            </div>
          )}

          <div
            onClick={() => onCambiarSeccion(perfil.rol === 'medico' ? 'medicos' : 'plantel')}
            className="p-4 rounded-xl cursor-pointer hover:-translate-y-0.5 transition-all duration-200"
            style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}
          >
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#5B6B85' }}>
              Lesionados activos
            </p>
            {lesionados.length === 0 ? (
              <p className="text-sm" style={{ color: '#5B6B85' }}>No hay jugadores lesionados.</p>
            ) : (
              <div className="space-y-1">
                {lesionados.slice(0, 5).map((j) => (
                  <p key={j.id} className="text-sm" style={{ color: '#FBBF24' }}>
                    {j.apellido}, {j.nombre}
                    {j.categorias?.nombre && (
                      <span style={{ color: '#5B6B85' }}> · {j.categorias.nombre}</span>
                    )}
                  </p>
                ))}
                {lesionados.length > 5 && (
                  <p className="text-xs" style={{ color: '#5B6B85' }}>
                    +{lesionados.length - 5} más
                  </p>
                )}
              </div>
            )}
          </div>

          {perfil.rol !== 'tecnico' && (
            <div
              onClick={() => onCambiarSeccion('nutricion')}
              className="p-4 rounded-xl cursor-pointer hover:-translate-y-0.5 transition-all duration-200"
              style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}
            >
              <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#5B6B85' }}>
                Alertas de nutrición
              </p>
              {alertasNutricion.length === 0 ? (
                <p className="text-sm" style={{ color: '#5B6B85' }}>Sin alertas de peso activas.</p>
              ) : (
                <div className="space-y-1">
                  {alertasNutricion.slice(0, 5).map((f) => (
                    <p key={f.id} className="text-sm" style={{ color: '#F87171' }}>
                      {f.jugadores?.apellido}, {f.jugadores?.nombre}
                      {f.jugadores?.categorias?.nombre && (
                        <span style={{ color: '#5B6B85' }}> · {f.jugadores.categorias.nombre}</span>
                      )}
                    </p>
                  ))}
                  {alertasNutricion.length > 5 && (
                    <p className="text-xs" style={{ color: '#5B6B85' }}>
                      +{alertasNutricion.length - 5} más
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {perfil.rol !== 'medico' && (
            <div
              onClick={() => onCambiarSeccion('video')}
              className="p-4 rounded-xl cursor-pointer hover:-translate-y-0.5 transition-all duration-200"
              style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}
            >
              <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#5B6B85' }}>
                Últimos videos
              </p>
              {ultimosVideos.length === 0 ? (
                <p className="text-sm" style={{ color: '#5B6B85' }}>Todavía no hay videos cargados.</p>
              ) : (
                <div className="space-y-1">
                  {ultimosVideos.map((v) => (
                    <p key={v.id} className="text-sm truncate" style={{ color: '#8A9BB8' }}>
                      {v.descripcion || v.contenido || (v.jugadores ? `${v.jugadores.apellido}, ${v.jugadores.nombre}` : 'Video')}
                      <span style={{ color: '#5B6B85' }}> · {v.fecha}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InicioSection
