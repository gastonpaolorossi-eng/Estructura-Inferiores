import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { obtenerCategoriaPrimeraDivision } from '../../utils/categoriaPrimera'
import { obtenerJugadoresDeCategoria } from '../../utils/jugadoresCategoria'
import { fechaArgentina, fechaValida } from '../../utils/planificacion'
import { mensajeErrorWellness, puedeConsultarWellnessInicio, resumirWellnessInicio } from '../../utils/inicioWellness'
import { fechaLarga } from '../../utils/formatoFecha'

// Escala 1-5 donde más alto es peor: mismo umbral (4) que usan las alertas del día.
const nivelMetrica = valor => valor >= 4 ? 'alto' : valor > 3 ? 'medio' : 'bajo'

function Foto({ jugadora }) {
  const [fallo, setFallo] = useState(false)
  return jugadora.foto_url && !fallo
    ? <img className="inicio-wellness-foto" src={jugadora.foto_url} alt="" loading="lazy" onError={() => setFallo(true)} />
    : <span className="inicio-avatar" aria-hidden="true">{jugadora.nombre?.[0]}{jugadora.apellido?.[0]}</span>
}

export default function WellnessInicio({ perfil, onCambiarSeccion, onVerBienestar }) {
  const [fecha, setFecha] = useState(fechaArgentina)
  const [lectura, setLectura] = useState(null)
  const [intento, setIntento] = useState(0)
  const pendiente = useRef(false)
  const { rol, categoria_id } = perfil
  const clave = [perfil.id, perfil.rol, perfil.categoria_id, fecha, intento].join(':')
  const candidato = ['coordinacion', 'preparador_fisico', 'tecnico'].includes(perfil.rol)
  useEffect(() => {
    let activo = true
    pendiente.current = true
    async function cargar() {
      if (!candidato || !fechaValida(fecha)) return
      try {
        const primera = await obtenerCategoriaPrimeraDivision({ exigirLectura: true })
        if (!activo) return
        if (!primera || !puedeConsultarWellnessInicio({ rol, categoria_id }, primera.id)) {
          setLectura({ clave, estado: primera ? 'restringido' : 'sin_categoria' }); return
        }
        const categorias = await supabase.from('categorias').select('id, es_reserva')
        if (categorias.error) throw categorias.error
        const jugadoras = await obtenerJugadoresDeCategoria(supabase, primera.id, categorias.data, { select: 'id,nombre,apellido,foto_url' })
        if (jugadoras.error) throw jugadoras.error
        if (!activo) return
        const ids = (jugadoras.data || []).map(j => j.id)
        const respuesta = ids.length ? await supabase.from('bienestar')
          .select('jugador_id,sueno,dolor_muscular,fatiga,estres,animo_entrenar').eq('fecha', fecha).in('jugador_id', ids) : { data: [] }
        if (respuesta.error) throw respuesta.error
        const resumen = resumirWellnessInicio(jugadoras.data || [], respuesta.data || [])
        if (activo) setLectura({ clave, estado: 'ok', resumen })
      } catch (error) { if (activo) setLectura({ clave, estado: 'error', error: mensajeErrorWellness(error) }) }
      finally { if (activo) pendiente.current = false }
    }
    cargar()
    return () => { activo = false }
  }, [clave, candidato, fecha, rol, categoria_id])
  const vigente = lectura?.clave === clave
  const cargando = candidato && fechaValida(fecha) && !vigente
  const resumen = vigente && lectura.estado === 'ok' ? lectura.resumen : null
  const abrir = () => onCambiarSeccion(perfil.rol === 'medico' ? 'bienestar' : 'fisico')
  return <section className="inicio-bloque inicio-wellness" aria-labelledby="inicio-wellness-titulo">
    <div className="inicio-titulo"><div><p className="dp-eyebrow">Wellness · <b>{fechaValida(fecha) ? fechaLarga(fecha) : 'Primera'}</b></p><h2 id="inicio-wellness-titulo">Wellness de hoy</h2></div>
      {(candidato || perfil.rol === 'medico') && <button type="button" onClick={abrir}>{perfil.rol === 'medico' ? 'Bienestar' : 'Físico'} →</button>}</div>
    {!candidato && <p className="inicio-vacio">Consultalo desde Bienestar.</p>}
    {candidato && !fechaValida(fecha) && <p role="alert">Seleccioná una fecha válida.</p>}
    {cargando && <p role="status" className="inicio-vacio">Consultando respuestas…</p>}
    {vigente && lectura.estado === 'error' && <p role="alert">{lectura.error}</p>}
    {vigente && lectura.estado === 'restringido' && <p className="inicio-vacio">No habilitado para tu categoría. Usá Físico.</p>}
    {vigente && lectura.estado === 'sin_categoria' && <p className="inicio-vacio">Sin categoría Primera accesible.</p>}
    {resumen && <>
      <p className="inicio-wellness-respuestas"><strong>{resumen.respondieron}</strong> de {resumen.total} respondieron
        {resumen.alertas.length > 0 && <span> · {resumen.alertas.length} {resumen.alertas.length === 1 ? 'alerta' : 'alertas'}</span>}</p>
      {resumen.respondieron > 0 && <ul className="inicio-wellness-barras" aria-label="Promedio por métrica, de 1 a 5 (más alto es peor)">
        {resumen.promedios.filter(m => m.promedio != null).map(m => <li key={m.campo} data-nivel={nivelMetrica(m.promedio)}>
          <span>{m.label}</span><span className="inicio-barra" aria-hidden="true"><i style={{ width: (m.promedio / 5 * 100) + '%' }} /></span><b>{m.promedio.toFixed(1)}</b>
        </li>)}
      </ul>}
      {resumen.total === 0 ? <p className="inicio-vacio">Sin jugadoras accesibles.</p>
        : resumen.respondieron === 0 ? <p className="inicio-vacio">Nadie respondió todavía (no significa que estén bien).</p>
          : resumen.alertas.length === 0 && <p className="inicio-vacio">Sin alertas entre las respuestas.</p>}
      {resumen.incompletas > 0 && <p className="inicio-vacio">{resumen.incompletas} respuestas incompletas.</p>}
      {resumen.estresAlto >= 10 && <p role="status">{resumen.estresAlto} jugadoras con estrés alto hoy — conviene revisar el bienestar grupal</p>}
      <div className="inicio-seguimiento">{resumen.alertas.map(({ jugadora, nivel, motivo }) => <article key={jugadora.id} className="inicio-seguimiento-fila" data-nivel={nivel}>
        <Foto jugadora={jugadora} /><div><strong>{jugadora.apellido}, {jugadora.nombre}</strong><p>{motivo}</p></div>
        <span className="inicio-nivel">{nivel === 'alta' ? 'Alerta alta' : 'Seguimiento'}</span><button type="button" onClick={() => onVerBienestar ? onVerBienestar(jugadora.id) : abrir()} aria-label={`Consultar Wellness de ${jugadora.apellido}, ${jugadora.nombre}`}>Ver Wellness →</button>
      </article>)}</div>
      {resumen.pendientes.length > 0 && <details className="inicio-pendientes"><summary>Sin responder ({resumen.pendientes.length})</summary>
        <ul>{resumen.pendientes.map(j => <li key={j.id}>{j.apellido}, {j.nombre}</li>)}</ul></details>}
    </>}
    {candidato && <details className="inicio-wellness-controles"><summary>Otra fecha</summary><div>
      <label>Fecha<input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></label>
      <button type="button" disabled={cargando || !fechaValida(fecha)} onClick={() => { if (!pendiente.current) setIntento(n => n + 1) }}>Actualizar</button>
    </div></details>}
  </section>
}
