import { useState } from 'react'
import FuentePerfil from './FuentePerfil'
import EstadoContenido from '../ui/EstadoContenido'
import MapaAccionesIndividual from './MapaAccionesIndividual'
import GraficosAccionesIndividual from './GraficosAccionesIndividual'
import { enlaceVideoIndividual } from '../../utils/rendimiento/lecturaIndividual'
import { resumirAcciones } from '../../utils/rendimiento/metricas'
import { accionesDeContrato, FILTROS_INDIVIDUALES, filtrarEventosIndividual, nombreIndividual } from '../../utils/rendimiento/presentacionIndividual'
import './rendimientoIndividual.css'

const etiquetas = { partido: 'Partido / rival', tipo: 'Tipo de acción', resultado: 'Resultado', periodo: 'Período', zona: 'Zona' }
const porcentaje = n => n === null ? 'N/D' : n.toLocaleString('es-AR', {maximumFractionDigits:1})+'%'
function Foto({ jugadora }) {
  const [fallo,setFallo]=useState(false)
  return jugadora.foto_url && !fallo ? <img src={jugadora.foto_url} alt="" onError={()=>setFallo(true)} /> : <span className="ri-avatar" aria-hidden="true">{jugadora.nombre?.slice(0,1)}{jugadora.apellido?.slice(0,1)}</span>
}
/** Presentación sin consultas: el contenedor entrega resultados del lector bajo RLS. */
export default function RendimientoIndividual({ jugador, temporadas, fuenteOficial, historico, detalle, onDetalle, sinRegistros = false, indicadoresOficiales = null,
  lecturaAcciones = null, jugadorasAutorizadas = [], onAbrirAccion, aniosLectura = [], anioSeleccionado, onAnio, segundaSeleccionada, onSegunda, cargandoAcciones = false, onActualizar }) {
  const anioContrato = lecturaAcciones?.contrato?.anio
  const anios = [...new Set([...temporadas.filter(t=>/^\d{4}$/.test(t.anio)).map(t=>t.anio),...aniosLectura,...(/^\d{4}$/.test(String(anioContrato)) ? [String(anioContrato)] : [])])].sort().reverse()
  const [anioElegido,setAnio]=useState('')
  const anio=anioSeleccionado ?? (anios.includes(anioElegido) ? anioElegido : anios[0] || '')
  const [segundaLocal,setSegundaLocal]=useState(''), [busqueda,setBusqueda]=useState('')
  const segundaId=segundaSeleccionada ?? segundaLocal
  const setSegunda=id=>{setSegundaLocal(id);onSegunda?.(id)}
  const [jugadoraListado,setJugadoraListado]=useState('')
  const [filtros,setFiltros]=useState({...FILTROS_INDIVIDUALES}), [seleccion,setSeleccion]=useState(null)
  const temporada=temporadas.find(t=>t.anio===anio)
  const principal=accionesDeContrato(lecturaAcciones,jugador.id,anio)
  const disponibles=jugadorasAutorizadas.filter(j=>j.id!==jugador.id)
  const segunda=disponibles.find(j=>j.id===segundaId)
  const adicionales=segunda ? accionesDeContrato(lecturaAcciones,segunda.id,anio) : null
  const serie = (j,eventos,color)=>({ id:j.id,nombre:nombreIndividual(j),eventos:filtrarEventosIndividual(eventos,{...filtros,analisisPartido:(lecturaAcciones?.analisis || []).filter(a=>a.partido_deportivo && 'deportivo:'+a.partido_deportivo.id===filtros.partido).map(a=>a.id)}),color })
  const series=principal === null ? [] : [serie(jugador,principal,'#F2C230'),...(segunda && adicionales!==null ? [serie(segunda,adicionales,'#64B5F6')] : [])]
  const todas=[...(principal || []),...(adicionales || [])]
  const metadatos=lecturaAcciones?.analisis || []
  const opciones={partido:[...new Map(todas.map(e=>{const a=metadatos.find(a=>a.id===e.partido_id),p=a?.partido_deportivo;const id=p?'deportivo:'+p.id:e.partido_id;return [id,{id,nombre:(p?.fecha || a?.fecha || 'Fecha no disponible')+' · '+(p?.rival || a?.rival || 'Rival no disponible')+(p?'':' · análisis sin vínculo deportivo verificado')}] })).values()],
    tipo:[...new Set(todas.map(e=>e.tipo).filter(Boolean))].sort().map(id=>({id,nombre:id})),
    resultado:[...new Set(todas.map(e=>e.resultado || '__pendiente'))].sort().map(id=>({id,nombre:id==='__pendiente'?'Pendiente':id})),
    periodo:[...new Set(todas.map(e=>e.periodo).filter(v=>v!=null))].map(id=>({id:String(id),nombre:String(id)})),
    zona:[...new Set(todas.map(e=>e.zona).filter(Boolean))].sort().map(id=>({id,nombre:id}))}
  const eventos=series.flatMap(s=>s.eventos.map(e=>({...e,nombreJugadora:s.nombre})))
  const listado=eventos.filter(e=>!series.some(s=>s.id===jugadoraListado) || e.jugador_id===jugadoraListado)
  const elegida=eventos.find(e=>e.id===seleccion)
  const resumen=series.map(s=>({...s,resumen:resumirAcciones(s.eventos)}))
  const errorAcciones=lecturaAcciones?.estado==='error', denegado=lecturaAcciones?.estado==='denegado'
  const cambiar=(clave,valor)=>{setFiltros(f=>({...f,[clave]:valor}));setSeleccion(null)}
  return <section className="ri-premium" aria-label="Centro de rendimiento individual">
    <header className="ri-cabecera ri-sin-foto">
      <div className="ri-hero-texto"><p className="ri-sobretitulo">COMUNICACIONES / CENTRO DE RENDIMIENTO</p><h2>RENDIMIENTO <span>INDIVIDUAL</span></h2></div>
      <div className="ri-hero-controles"><label>Temporada · año calendario<select value={anio} onChange={e=>{setAnio(e.target.value);onAnio?.(e.target.value);setSeleccion(null);setFiltros({...FILTROS_INDIVIDUALES})}} disabled={!anios.length}>{!anios.length && <option value="">Sin temporadas fechadas</option>}{anios.map(a=><option key={a}>{a}</option>)}</select></label><span className="ri-chip-temporada">{anio || 'Temporada sin fecha'} · acciones y comparación</span><p>Estadísticas oficiales y acciones etiquetadas, siempre separadas.</p></div>
    </header>
    <div className="ri-identidades"><div className="ri-comparador-contexto"><p className="ri-sobretitulo">COMPARACIÓN DIRECTA</p><h3>Dos miradas al juego</h3><p>Misma temporada y filtros. Cada jugadora conserva su muestra; más acciones no implican mejor rendimiento.</p></div>
      <div className="ri-comparador"><label>Comparar con otra jugadora<input type="search" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar jugadora autorizada" disabled={!disponibles.length}/></label>
        <label>Segunda jugadora<select value={segundaId} disabled={!disponibles.length} onChange={e=>{setSegunda(e.target.value);setSeleccion(null)}}><option value="">Vista individual</option>{disponibles.filter(j=>j.id===segundaId || nombreIndividual(j).toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())).map(j=><option key={j.id} value={j.id}>{nombreIndividual(j)} · {j.posicion || 'Sin puesto'}</option>)}</select></label>
        {!cargandoAcciones && segundaId && !segunda && disponibles.length>0 && <p role="status">La segunda selección ya no está entre las jugadoras accesibles; no se muestran sus datos.</p>}
        {segunda && <><div className="ri-segunda-elegida"><Foto key={segunda.id} jugadora={segunda}/><span><strong>{nombreIndividual(segunda)}</strong><small>{segunda.posicion || 'Posición sin registrar'}</small></span></div><button type="button" onClick={()=>{setSegunda('');setSeleccion(null)}}>Quitar comparación</button></>}
        {principal!==null && busqueda && !disponibles.some(j=>nombreIndividual(j).toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())) && <p role="status">No se encontraron jugadoras con esa búsqueda.</p>}
        {!disponibles.length && <small>{cargandoAcciones ? 'Consultando jugadoras visibles para esta sesión…' : 'No hay otras jugadoras accesibles confirmadas para comparar.'}</small>}
      </div></div>
    <FuentePerfil fuente={fuenteOficial} titulo="Registros deportivos oficiales"><section className="ri-panel ri-oficiales"><div className="ri-panel-cabecera"><div><p className="ri-sobretitulo">REGISTROS OFICIALES</p><h3>Histórico oficial</h3></div><span className="ri-etiqueta-fuente">Todos los períodos</span></div>
      {sinRegistros && <EstadoContenido estado="vacio" titulo="Sin estadísticas registradas" mensaje="No acredita ausencia de participación deportiva." />}
      <details className="ri-desplegable" open={detalle ? true : undefined}><summary>Indicadores, temporadas y detalle oficial</summary>
      <nav className="ri-accesos-oficiales" aria-label="Detalles de estadísticas oficiales">{[['partidos','Partidos'],['titularidades','Titularidades'],['minutos','Minutos'],['goles','Goles'],['asistencias','Asistencias'],['amarillas','Amarillas'],['rojas','Rojas']].map(([id,nombre])=><button key={id} type="button" onClick={()=>onDetalle(id)}><span>{nombre}</span><strong>{sinRegistros ? 'N/D' : indicadoresOficiales?.[id] ?? 'N/D'}</strong><span className="ri-ver-detalle">Ver detalle ↗</span></button>)}</nav><p className="ri-nota">Los accesos de detalle y el histórico conservan todos sus períodos; el selector delimita la temporada de acciones y comparación. No se suman goles oficiales y etiquetados.</p>
        {temporada && <p className="ri-muestra"><strong>{anio} · Acumulados existentes:</strong> {temporada.partidos} registros deportivos · {temporada.minutos} minutos acumulados · {temporada.goles} goles oficiales · {temporada.asistencias} asistencias.</p>}
        {detalle || historico}
      </details>
    </section></FuentePerfil>
    <section className="ri-panel ri-intro-acciones"><div className="ri-panel-cabecera"><div><p className="ri-sobretitulo">LECTURA DEL JUEGO</p><h3>Acciones y territorio</h3></div><span className="ri-etiqueta-fuente">{anio || 'Sin temporada'} · filtros compartidos</span></div>
      {onActualizar && <button type="button" onClick={onActualizar} disabled={cargandoAcciones}>{cargandoAcciones ? 'Actualizando datos…' : 'Actualizar datos'}</button>}
      {principal===null ? <div className="ri-integracion" role={errorAcciones || denegado ? 'alert' : 'status'}><strong>{cargandoAcciones ? 'Cargando acciones registradas…' : errorAcciones ? 'No se pudieron consultar las acciones' : denegado ? 'Acceso denegado a las acciones' : lecturaAcciones?.estado==='sin_sesion' ? 'Iniciá sesión para consultar acciones' : lecturaAcciones?.estado==='no_disponible' ? 'No se pudo confirmar el alcance de lectura' : 'Integración de Análisis pendiente de activación segura'}</strong><p>{lecturaAcciones?.mensaje || (cargandoAcciones ? 'Consultas paginadas de solo lectura. No se muestran resultados anteriores mientras cambia el contexto.' : errorAcciones || denegado ? 'Este estado no significa que no existan registros.' : 'Las políticas preparadas todavía no están aplicadas ni verificadas con sesiones reales. Esta versión local no debe publicarse todavía.')}</p><p>No se muestran métricas ficticias, puntos de ejemplo ni porcentajes sin fuente. Los registros deportivos anteriores siguen disponibles.</p></div> : <>
        <div className="ri-filtros" role="group" aria-label="Filtros compartidos de acciones">{Object.entries(etiquetas).map(([clave,etiqueta])=><label key={clave}>{etiqueta}<select value={filtros[clave]} onChange={e=>cambiar(clave,e.target.value)}><option value="">Todos</option>{opciones[clave].map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>)}
          <label>Desde minuto<input type="number" min="0" value={filtros.minutoDesde} onChange={e=>cambiar('minutoDesde',e.target.value)}/></label><label>Hasta minuto<input type="number" min="0" value={filtros.minutoHasta} onChange={e=>cambiar('minutoHasta',e.target.value)}/></label>
          <button type="button" onClick={()=>{setFiltros({...FILTROS_INDIVIDUALES});setSeleccion(null)}}>Limpiar filtros</button></div>
        <div className={'ri-comparacion-resumen'+(series.length>1?' ri-doble':'')}>{resumen.map(s=>{const j=s.id===jugador.id?jugador:segunda;return <article key={s.id} className="ri-jugadora-resumen" style={{'--ri-serie':s.color}}><div className="ri-resumen-identidad"><Foto key={s.id} jugadora={j}/><div><p className="ri-sobretitulo">{s.id===jugador.id?'PRINCIPAL':'COMPARACIÓN'}</p><h4>{s.nombre}</h4><span>{j?.posicion || 'Posición sin registrar'}</span></div></div><dl className="ri-metricas-acciones"><div><dt>Eventos · filtros activos</dt><dd>{s.eventos.length}</dd></div><div><dt>Partidos con acciones · temporada</dt><dd>{lecturaAcciones?.contrato?.jugadoras.find(j=>j.jugadorId===s.id)?.acciones?.partidosDeportivosConAcciones ?? 'N/D'}</dd></div><div><dt>Precisión de pases · filtros</dt><dd>{porcentaje(s.resumen.pases.precision)}</dd><small>{s.resumen.pases.correctos}/{s.resumen.pases.total} pases registrados</small></div><div><dt>Efectividad · filtros</dt><dd>{porcentaje(s.resumen.efectividad.porcentaje)}</dd><small>{s.resumen.efectividad.exitosos}/{s.resumen.efectividad.evaluadas} acciones evaluadas</small></div></dl><p className="ri-nota">{new Set(s.eventos.map(e=>e.partido_id)).size} análisis con acciones bajo los filtros actuales.</p></article>})}</div>
        {lecturaAcciones?.contrato && <details className="ri-desplegable ri-calidad"><summary>Cobertura y contexto de la muestra · no acreditada como completa</summary><p className="ri-nota">Partidos deportivos con análisis accesible en el alcance compartido: {lecturaAcciones.contrato.jugadoras[0]?.muestra?.partidosConAnalisisEnAlcance ?? 'N/D'}. Solo encuentros referenciados por eventos o registros deportivos accesibles de las seleccionadas; no es el inventario de toda la categoría ni acredita participación o cobertura completa.</p></details>}
        {segunda && adicionales===null && <p role="status">No hay una fuente disponible para comparar a {nombreIndividual(segunda)} en esta temporada. No se reemplaza por ceros.</p>}
        {Object.entries(lecturaAcciones?.fuentes || {}).filter(([,f])=>f.estado!=='disponible').map(([nombre,f])=><p key={nombre} className="ri-nota" role="status">Fuente {nombre}: {f.estado==='denegado'?'acceso denegado':'lectura no disponible'}. No se reemplaza por ceros.</p>)}
        {lecturaAcciones?.contrato?.estado==='parcial' && <p className="ri-nota" role="status">Datos parciales: hay fuentes no disponibles o eventos excluidos por vínculos, fechas o identificadores inconsistentes. Los gráficos representan únicamente los registros válidos incluidos.</p>}
        <p className="ri-nota">Cobertura del etiquetado no acreditada. No se calculan tasas por 90 ni se asume que todos los partidos oficiales estén analizados. La muestra visible no es la totalidad de la temporada.</p>
      </>}
    </section>
    {principal!==null && <><div className={'ri-analitica'+(series.length>1?' ri-comparando':'')}><div className="ri-territorio"><div className="ri-mapas">{series.map(s=><MapaAccionesIndividual key={s.id} eventos={s.eventos} nombre={s.nombre} seleccion={seleccion} onSeleccionar={setSeleccion}/>)}</div>
      {elegida && <aside className="ri-panel ri-detalle-accion" aria-live="polite"><h3>Acción seleccionada</h3><p>{elegida.nombreJugadora} · {elegida.tipo} · {elegida.resultado || 'Pendiente'} · Período {elegida.periodo ?? 'sin registrar'}</p><p>{typeof elegida.segundo==='number' ? 'Segundo '+elegida.segundo : 'Sin tiempo válido'} · Zona: {elegida.zona || 'sin registrar'}</p>{onAbrirAccion && lecturaAcciones?.videosSincronizados?.includes(elegida.partido_id) ? <button type="button" onClick={()=>onAbrirAccion(elegida)}>Abrir momento de video verificado</button> : enlaceVideoIndividual(elegida,metadatos.find(a=>a.id===elegida.partido_id)) ? <><a className="ri-enlace-video" href={enlaceVideoIndividual(elegida,metadatos.find(a=>a.id===elegida.partido_id))} target="_blank" rel="noopener noreferrer">Abrir video en el segundo registrado ↗</a><p className="ri-nota">Se utiliza el tiempo almacenado por Análisis, sin ajustar el video ni inferir offsets. La sincronización efectiva requiere revisión si el video fue reemplazado.</p></> : <p className="ri-nota">Sin vínculo de video sincronizado verificado. No se genera un enlace.</p>}</aside>}
      </div><GraficosAccionesIndividual series={series} analisis={metadatos} onTipo={tipo=>cambiar('tipo',tipo)}/></div>
      <section className="ri-panel ri-explorador"><p className="ri-sobretitulo">TRAZABILIDAD</p><h3>Explorador de acciones</h3><label>Jugadora en el listado<select value={series.some(s=>s.id===jugadoraListado) ? jugadoraListado : ''} onChange={e=>setJugadoraListado(e.target.value)}><option value="">Todas las seleccionadas</option>{series.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label><div className="ri-tabla-scroll"><table><caption>Registros incluidos en los gráficos con los filtros activos</caption><thead><tr><th>Jugadora</th><th>Partido</th><th>Acción</th><th>Resultado</th><th>Tiempo</th><th>Período</th><th>Zona</th><th>Detalle</th></tr></thead><tbody>{listado.map(e=><tr key={e.id}><td>{e.nombreJugadora}</td><td>{metadatos.find(a=>a.id===e.partido_id)?.rival || 'No disponible'}</td><td>{e.tipo}</td><td>{e.resultado || 'Pendiente'}</td><td>{typeof e.segundo==='number' && Number.isFinite(e.segundo) && e.segundo>=0 ? Math.floor(e.segundo/60)+':'+String(Math.floor(e.segundo%60)).padStart(2,'0') : 'N/D'}</td><td>{e.periodo ?? 'N/D'}</td><td>{e.zona || 'N/D'}</td><td><button type="button" onClick={()=>setSeleccion(e.id)}>Seleccionar acción</button></td></tr>)}</tbody></table></div>{!listado.length && <p role="status">Sin acciones visibles con estos filtros. No implica ausencia de actividad deportiva.</p>}</section></>}
  </section>
}
