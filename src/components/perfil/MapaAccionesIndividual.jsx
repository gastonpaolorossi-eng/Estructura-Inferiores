import { useId } from 'react'
import { puntoEventoIndividual } from '../../utils/rendimiento/presentacionIndividual'
import { colorTipoIndividual } from '../../utils/rendimiento/presentacionIndividual'
const bordeResultado = resultado => ['Exitoso','Gol','Atajada'].includes(resultado) ? '#6CE9AD' : ['Fallido','Fuera','Bloqueado'].includes(resultado) ? '#FF7777' : resultado === 'Neutro' ? '#FFFFFF' : '#F2C230'
export default function MapaAccionesIndividual({ eventos, seleccion, onSeleccionar, nombre }) {
  const id = useId(), validos = eventos.map(evento => ({ evento, punto: puntoEventoIndividual(evento) })).filter(e => e.punto)
  return <section className="ri-mapa" aria-label={'Mapa de eventos de '+nombre}>
    <div className="ri-panel-cabecera"><div><p className="ri-sobretitulo">TERRITORIO / EVENTOS ETIQUETADOS</p><h3>Mapa de acciones</h3><p className="ri-mapa-autora">{nombre}</p></div><span className="ri-etiqueta-fuente"><strong>{validos.length}</strong> ubicadas / {eventos.length} registradas</span></div>
    <svg viewBox="-4 -5 108 74" role="group" aria-labelledby={id}>
      <title id={id}>{'Eventos etiquetados de '+nombre+'. Coordenadas originales, sin normalizar por ataque.'}</title>
      <defs><linearGradient id={id+'-cesped'} x2="0" y2="1"><stop stopColor="#1E6142"/><stop offset="1" stopColor="#0B3527"/></linearGradient></defs>
      <rect x="-4" y="-5" width="108" height="74" rx="3" fill={'url(#'+id+'-cesped)'}/><rect x="-1.7" y="28" width="1.7" height="8" fill="none" stroke="#C7E0CE" strokeWidth=".35"/><rect x="100" y="28" width="1.7" height="8" fill="none" stroke="#C7E0CE" strokeWidth=".35"/>
      {[0,20,40,60,80].map(x => <rect key={x} x={x} y="0" width="10" height="64" fill="#FFFFFF" opacity=".035" />)}
      <g fill="none" stroke="#C7E0CE" strokeWidth=".35" aria-hidden="true"><rect width="100" height="64" /><path d="M50 0V64" /><circle cx="50" cy="32" r="9.15" /><circle cx="50" cy="32" r=".4" fill="#C7E0CE" />
        <path d="M0 12H16.5V52H0M100 12H83.5V52H100M0 23H5.5V41H0M100 23H94.5V41H100" />
        <path d="M16.5 24.7A9.15 9.15 0 0 1 16.5 39.3M83.5 24.7A9.15 9.15 0 0 0 83.5 39.3M0 1A1 1 0 0 0 1 0M99 0A1 1 0 0 0 100 1M0 63A1 1 0 0 1 1 64M99 64A1 1 0 0 1 100 63"/>
        <circle cx="11" cy="32" r=".35" fill="#C7E0CE" /><circle cx="89" cy="32" r=".35" fill="#C7E0CE" /></g>
      {validos.map(({evento:e,punto:p},i) => <g key={e.id} role="button" tabIndex={0} aria-pressed={seleccion===e.id}
        aria-label={e.tipo+', '+(e.resultado || 'Pendiente')+', período '+(e.periodo ?? 'sin registrar')+', acción '+(i+1)}
        onClick={() => onSeleccionar(e.id)} onKeyDown={ev => { if (['Enter',' '].includes(ev.key)) { ev.preventDefault(); onSeleccionar(e.id) } }}>
        <title>{e.tipo+' · '+(e.resultado || 'Pendiente')+' · X '+p.x+', Y '+p.y}</title>
        <circle cx={p.x} cy={p.y*.64} r="2.4" fill="transparent" />
        <circle cx={p.x} cy={p.y*.64} r={seleccion===e.id?2:1.6} fill={colorTipoIndividual(e.tipo)} opacity={seleccion===e.id ? .28 : .12} pointerEvents="none"/>
        <circle cx={p.x} cy={p.y*.64} r={seleccion===e.id ? 1.35 : .9} fill={colorTipoIndividual(e.tipo)} stroke={bordeResultado(e.resultado)} strokeWidth={seleccion===e.id ? .55 : .3} />
      </g>)}
    </svg>
    <p className="ri-nota">Mapa de eventos, no de desplazamientos. Coordenadas originales: la orientación histórica no está verificada y no se invierte.</p>
    {eventos.length > validos.length && <p className="ri-nota">{eventos.length-validos.length} acciones sin ubicación exacta válida; se conservan en el explorador.</p>}
    <ul className="ri-leyenda">{[...new Set(eventos.map(e=>e.tipo))].map(tipo => <li key={tipo}><span style={{background:colorTipoIndividual(tipo)}} />{tipo}</li>)}</ul>
    <p className="ri-nota">Borde: verde = exitoso; rojo = fallido; blanco = neutro; amarillo = pendiente u otro resultado.</p>
    {!validos.length && <p role="status">Sin coordenadas exactas disponibles para estos filtros.</p>}
  </section>
}
