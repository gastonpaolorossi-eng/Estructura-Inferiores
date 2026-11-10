import { useState } from 'react'
import { puestoPlantel } from './posicionesPlantel'
import './plantel.css'

const ESTADOS = { lesionado: 'Lesionada', suspendido: 'Suspendida', no_disponible: 'No disponible' }

/** Valores y estado proceden del listado; no consulta ni calcula estadísticas. dorsal: último dorsal citado (opcional). */
export default function TarjetaJugadora({ jugadora, dorsal, onAbrir }) {
  const [fotoRota, setFotoRota] = useState(null)
  const conFoto = jugadora.foto_url && fotoRota !== jugadora.foto_url
  const puesto = puestoPlantel(jugadora.posicion)
  const tieneDorsal = dorsal != null && dorsal !== ''
  const estado = ESTADOS[jugadora.estado]
  const iniciales = `${jugadora.nombre?.[0] || ''}${jugadora.apellido?.[0] || ''}`.toUpperCase()

  return <button type="button" className="plantel-carta" data-jugadora-id={jugadora.id} onClick={() => onAbrir(jugadora.id)}
    aria-label={[[jugadora.nombre, jugadora.apellido].filter(Boolean).join(' '), jugadora.posicion, estado].filter(Boolean).join(', ')}
    title={[jugadora.posicion, jugadora.posicion_secundaria].filter(Boolean).join(' · ') || 'Abrir perfil'}>
    {conFoto
      ? <img className="plantel-carta-foto" src={jugadora.foto_url} alt="" loading="lazy" decoding="async" onError={() => setFotoRota(jugadora.foto_url)} />
      : <span className="plantel-carta-iniciales" aria-hidden="true">{iniciales || '?'}</span>}
    {estado && <span className="plantel-carta-estado" data-estado={jugadora.estado}>{estado}</span>}
    <span className="plantel-carta-texto">
      <span className="plantel-carta-dorsal" title={tieneDorsal ? 'Dorsal' : jugadora.posicion || 'Posición sin cargar'}>{tieneDorsal ? dorsal : puesto.abreviatura}</span>
      <span className="plantel-carta-nombre">{jugadora.nombre}</span>
      <strong className="plantel-carta-apellido">{jugadora.apellido || jugadora.nombre}</strong>
      <small>{jugadora.posicion || 'Posición sin cargar'}</small>
    </span>
  </button>
}
