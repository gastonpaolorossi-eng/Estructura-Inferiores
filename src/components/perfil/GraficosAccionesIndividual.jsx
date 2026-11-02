import { useId } from 'react'
import { distribucionIndividual, evolucionIndividual } from '../../utils/rendimiento/presentacionIndividual'

const valor = n => n === null ? 'N/D' : n.toLocaleString('es-AR',{ maximumFractionDigits:1 })+'%'
const resultados = [['exitosos','Exitosas','#279663'],['fallidos','Fallidas','#D35555'],['neutros','Neutras','#92928A'],['pendientes','Pendientes','#F2C230'],['desconocidos','Otros','#9A7CC5']]

export default function GraficosAccionesIndividual({ series, analisis, onTipo }) {
  const id = useId(), tipos = [...new Set(series.flatMap(s => s.eventos.map(e=>e.tipo)))].sort()
  const distribuciones = series.map(s => ({...s, datos:distribucionIndividual(s.eventos)}))
  const maximo = Math.max(1,...distribuciones.flatMap(s=>s.datos.map(d=>d.cantidad)))
  const evoluciones = series.map(s=>({...s, filas:evolucionIndividual(s.eventos,analisis)}))
  // Geometría de presentación: misma escala para ambas series; no altera métricas.
  const maxEvolucion=Math.max(1,...evoluciones.flatMap(s=>s.filas.map(f=>f.resumen.total)))
  const partidos=[...new Map(evoluciones.flatMap(s=>s.filas).map(f=>[f.id,f])).values()].sort((a,b)=>a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id))
  const ancho=Math.max(440,partidos.length*96+80)
  const x=i=>70+(partidos.length===1?(ancho-120)/2:i*(ancho-120)/Math.max(1,partidos.length-1))
  const y=v=>205-v/maxEvolucion*155
  const leyenda=<ul className="ri-leyenda ri-leyenda-series">{series.map(s=><li key={s.id}><span style={{background:s.color}}/>{s.nombre}</li>)}</ul>
  return <div className="ri-graficos">
    <section className="ri-panel ri-distribucion-panel">
      <div className="ri-panel-cabecera"><div><p className="ri-sobretitulo">VOLUMEN OBSERVADO</p><h3>Distribución de acciones</h3></div><span className="ri-etiqueta-fuente">0 — {maximo} registros</span></div>
      {leyenda}
      <p className="ri-nota">Seleccioná una acción para filtrar. La longitud de las barras comparte la misma escala entre jugadoras.</p>
      <div className="ri-distribucion">{tipos.map(tipo=><div key={tipo} className="ri-fila-barra"><button onClick={()=>onTipo(tipo)} type="button">{tipo}<span aria-hidden="true">↗</span></button>{distribuciones.map(s=>{
        const d=s.datos.find(d=>d.tipo===tipo)
        return <div key={s.id} className="ri-barra-serie"><span className="ri-barra-nombre">{s.nombre}</span><strong>{d?.cantidad ?? 0}<small> registradas</small></strong><div className="ri-pista" aria-hidden="true"><span style={{width:((d?.cantidad || 0)/maximo*100)+'%',background:s.color}}/></div></div>
      })}</div>)}</div>
      {!tipos.length && <div className="ri-vacio-grafico" role="status"><span aria-hidden="true">—</span><p>Sin acciones registradas para estos filtros; no acredita ausencia de acciones durante el partido.</p></div>}
    </section>

    <section className="ri-panel ri-efectividad-panel">
      <div className="ri-panel-cabecera"><div><p className="ri-sobretitulo">RESULTADOS ETIQUETADOS</p><h3>Efectividad por acción</h3></div><span className="ri-etiqueta-fuente">Con denominadores visibles</span></div>
      <ul className="ri-leyenda ri-leyenda-resultados">{resultados.map(([clave,nombre,color])=><li key={clave}><span style={{background:color}}/>{nombre}</li>)}</ul>
      <div className="ri-efectividad-lista">{tipos.map(tipo=><article key={tipo} className="ri-efectividad-grupo"><h4>{tipo}</h4>{distribuciones.map(s=>{
        const d=s.datos.find(d=>d.tipo===tipo)
        return <div key={s.id} className="ri-resultado-serie"><div className="ri-resultado-cabecera"><span><i style={{background:s.color}}/>{s.nombre}</span><strong>{d?valor(d.efectividad.porcentaje):'N/D'}</strong></div>{d?<><div className="ri-efectividad" aria-hidden="true">{resultados.map(([clave,,color])=><span key={clave} style={{width:(d.resultados[clave]/d.total*100)+'%',background:color}}/>)}</div><div className="ri-resultado-contexto"><span>{d.efectividad.exitosos}/{d.efectividad.evaluadas} acciones evaluadas</span><span>{d.resultados.neutros} neutras · {d.resultados.pendientes} pendientes</span></div></>:<p className="ri-nota">Sin acciones de este tipo registradas para estos filtros.</p>}</div>
      })}</article>)}</div>
      {!tipos.length && <p role="status">Sin resultados disponibles con estos filtros.</p>}
      <p className="ri-nota">Neutras, pendientes y resultados no reconocidos no forman parte del denominador. Precisión de pases se calcula separadamente por tipos correcto/incorrecto.</p>
      <details className="ri-desplegable"><summary>Ver cantidades y denominadores por resultado</summary><div className="ri-tabla-scroll"><table><caption>Porcentajes con numeradores y denominadores del motor compartido</caption><thead><tr><th>Acción / jugadora</th><th>Efectividad</th><th>Exitosas</th><th>Fallidas</th><th>Neutras</th><th>Pendientes</th><th>Otros</th></tr></thead><tbody>{distribuciones.flatMap(s=>s.datos.map(d=><tr key={s.id+d.tipo}><th>{d.tipo}<small>{s.nombre}</small></th><td>{valor(d.efectividad.porcentaje)}<small>{d.efectividad.exitosos}/{d.efectividad.evaluadas} acciones evaluadas</small></td><td>{d.resultados.exitosos}</td><td>{d.resultados.fallidos}</td><td>{d.resultados.neutros}</td><td>{d.resultados.pendientes}</td><td>{d.resultados.desconocidos}</td></tr>))}</tbody></table></div></details>
    </section>

    <section className="ri-panel ri-evolucion-panel">
      <div className="ri-panel-cabecera"><div><p className="ri-sobretitulo">PARTIDO A PARTIDO</p><h3>Evolución de acciones registradas</h3></div><span className="ri-etiqueta-fuente">Escala compartida</span></div>
      {leyenda}
      {partidos.length?<><div className="ri-timeline-scroll" role="region" tabIndex={0} aria-label="Gráfico de evolución; desplazamiento horizontal si es necesario"><svg className="ri-evolucion" viewBox={'0 0 '+ancho+' 300'} style={{minWidth:ancho}} role="img" aria-labelledby={id}>
        <title id={id}>{'Acciones por partido. Puntos discretos, sin unir partidos sin cobertura acreditada. Misma escala de 0 a '+maxEvolucion+' para ambas jugadoras.'}</title>
        {[...new Set([0,Math.ceil(maxEvolucion/2),maxEvolucion])].map(v=><g key={v} className="ri-guia-eje"><line x1="45" x2={ancho-25} y1={y(v)} y2={y(v)}/><text x="35" y={y(v)+4} textAnchor="end">{v}</text></g>)}
        {partidos.map((p,i)=><g key={p.id}><text className="ri-fecha-eje" x={x(i)} y="238" textAnchor="middle">{p.fecha.slice(5).split('-').reverse().join('/')}</text><text x={x(i)} y="258" textAnchor="middle">{(p.rival || 'Rival s/d').slice(0,13)}</text><title>{p.fecha+' · '+(p.rival || 'Rival no disponible')}</title></g>)}
        {evoluciones.map((s,n)=><g key={s.id}>{s.filas.map(f=>{const i=partidos.findIndex(p=>p.id===f.id),px=x(i)+(series.length>1?(n===0?-7:7):0);return <g key={f.id}><title>{s.nombre+': '+f.resumen.total+' acciones · '+f.fecha+' · '+(f.rival || 'Rival no disponible')}</title><line x1={px} x2={px} y1={y(0)} y2={y(f.resumen.total)} stroke={s.color} strokeOpacity=".25" strokeWidth="3"/><circle cx={px} cy={y(f.resumen.total)} r="6" fill={s.color} stroke="var(--ui-superficie)" strokeWidth="2"/><text className="ri-valor-punto" x={px} y={y(f.resumen.total)+(series.length>1 && n===1?20:-13)} textAnchor="middle">{f.resumen.total}</text></g>})}</g>)}
      </svg></div><p className="ri-nota">Fecha y rival identifican cada encuentro. En pantallas pequeñas podés desplazar solo el gráfico para conservar etiquetas legibles.</p><details className="ri-desplegable"><summary>Ver valores completos por partido y jugadora</summary>{evoluciones.map(s=><div key={s.id}><h4>{s.nombre}</h4><ol className="ri-partidos">{s.filas.map(f=><li key={f.id}>{f.fecha} · {f.rival || 'Rival no disponible'}: <strong>{f.resumen.total} acciones registradas</strong></li>)}</ol>{!s.filas.length && <p>Sin series fechadas disponibles.</p>}</div>)}</details></>:<div className="ri-vacio-grafico" role="status"><span aria-hidden="true">—</span><p>Sin series fechadas disponibles.</p></div>}
      <p className="ri-nota">Cada punto agrupa los análisis vinculados al mismo partido deportivo y fechado, sin duplicar eventos por ID. No se completan partidos sin datos con ceros ni se conectan vacíos. Los registros sin vínculo verificable permanecen en el explorador.</p>
    </section>
  </div>
}
