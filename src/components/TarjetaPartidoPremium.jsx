import { useEffect, useId, useRef, useState } from 'react'
import { fechaHora } from '../utils/formatoFecha'

const NIVEL = { Victoria: 'victoria', Empate: 'empate', Derrota: 'derrota' }

function Escudo({ imagen, equipo }) {
  const [fallo, setFallo] = useState(false)
  return imagen && !fallo ? <img src={imagen} alt={`Escudo de ${equipo}`} loading="lazy" onError={() => setFallo(true)} /> : <span className="partido-escudo-vacio" aria-hidden="true">{equipo?.[0] || '—'}</span>
}

// Tarjeta compacta: franja de color según el resultado, acciones al pasar el mouse y Eliminar dentro de "···"
// con confirmación en pantalla. El borrado lo ejecuta el padre (onEliminar) sin cambios.
export default function TarjetaPartidoPremium({ partido: p, resultado, onAbrir, onPDF, onImagen, onEstadisticas, onEditar, onEliminar, eliminando = false }) {
  const [menu, setMenu] = useState('cerrado') // cerrado | abierto | confirmando
  const zonaMenu = useRef(null)
  const menuId = useId()
  const rival = p.rival || 'Rival por confirmar'
  const condicion = p.local_visitante === 'visitante' ? 'Visitante' : p.local_visitante === 'local' ? 'Local' : null
  const accion = (e, callback) => { e.stopPropagation(); callback(p.id) }

  useEffect(() => {
    if (menu === 'cerrado') return
    const afuera = e => { if (!zonaMenu.current?.contains(e.target)) setMenu('cerrado') }
    const teclado = e => { if (e.key === 'Escape') setMenu('cerrado') }
    document.addEventListener('pointerdown', afuera)
    document.addEventListener('keydown', teclado)
    return () => { document.removeEventListener('pointerdown', afuera); document.removeEventListener('keydown', teclado) }
  }, [menu])

  return <article className="partido-premium" data-partido-id={p.id} data-resultado={NIVEL[resultado?.etiqueta] || 'pendiente'} onClick={() => onAbrir(p.id)}>
    <div className="partido-contexto">
      <span>{p.fecha ? fechaHora(p.fecha, p.hora) : 'Fecha por confirmar'}</span>
      {condicion && <span className="partido-condicion">{condicion}</span>}
    </div>
    <button type="button" className="partido-marcador" aria-label={`Abrir partido vs ${rival}${resultado ? ', ' + resultado.texto : ''}`}>
      <Escudo key={p.escudo_url || rival} imagen={p.escudo_url} equipo={rival} />
      <span className="partido-rival"><strong>{rival}</strong><small>{p.numero_fecha ? `Fecha ${p.numero_fecha}` : resultado?.etiqueta || 'Resultado pendiente'}{p.lugar ? ' · ' + p.lugar : ''}</small></span>
      <span className="partido-goles">{resultado ? `${resultado.golesPropios}-${resultado.golesRivales}` : '—'}</span>
    </button>
    {resultado?.penales && <p className="partido-penales">Penales {resultado.penales}</p>}
    <footer className="partido-acciones" aria-label={`Acciones del partido vs ${rival}`} onClick={e => e.stopPropagation()}>
      {p.link && <a href={p.link} target="_blank" rel="noreferrer">Video</a>}
      <button type="button" onClick={e => accion(e, onPDF)}>PDF citación</button>
      <button type="button" onClick={e => accion(e, onImagen)}>Imagen citación</button>
      <button type="button" onClick={e => accion(e, onEstadisticas)}>Estadísticas</button>
      <button type="button" onClick={e => accion(e, onEditar)}>Editar</button>
      <div className="partido-menu" ref={zonaMenu}>
        <button type="button" className="partido-menu-boton" aria-label={`Más acciones del partido vs ${rival}`} aria-haspopup="true"
          aria-expanded={menu !== 'cerrado'} aria-controls={menuId} onClick={() => setMenu(m => m === 'cerrado' ? 'abierto' : 'cerrado')}>···</button>
        {menu === 'abierto' && <div id={menuId} className="partido-menu-panel">
          <button type="button" className="partido-eliminar" onClick={() => setMenu('confirmando')}>Eliminar partido</button>
        </div>}
        {menu === 'confirmando' && <div id={menuId} className="partido-menu-panel partido-confirmar" role="alertdialog" aria-labelledby={menuId + '-titulo'}>
          <p id={menuId + '-titulo'}><strong>¿Eliminar vs {rival}?</strong> También se borran sus citaciones y estadísticas.</p>
          <div>
            <button type="button" onClick={() => setMenu('cerrado')} autoFocus>Cancelar</button>
            <button type="button" className="partido-eliminar-confirmar" disabled={eliminando} aria-busy={eliminando}
              onClick={() => { setMenu('cerrado'); onEliminar(p.id) }}>{eliminando ? 'Eliminando…' : 'Eliminar'}</button>
          </div>
        </div>}
      </div>
    </footer>
  </article>
}
