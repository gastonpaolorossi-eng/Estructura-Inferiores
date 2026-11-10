import { useState } from 'react'
import IconoNavegacion from '../IconoNavegacion'
import { iniciales, calcularEdad, pieHabilLabel, estadoConfig } from './presentacionPerfil'
import { puestoPlantel } from '../plantel/posicionesPlantel'

// Portada del perfil: foto grande, dorsal gigante en amarillo y apellido enorme. Solo presentación.
export default function CabeceraPerfil({ jugador, onVolver, onEditar, onPDF, onEliminar, eliminando }) {
  const [fallo, setFallo] = useState(false)
  const estado = estadoConfig[jugador.estado]?.label || 'Estado sin confirmar'
  const edad = calcularEdad(jugador.fecha_nacimiento)
  const tieneDorsal = jugador.dorsal != null && jugador.dorsal !== ''
  return <header className="perfil-cabecera">
    <div className="perfil-navegacion"><button type="button" onClick={onVolver}>← Plantel</button></div>
    <div className="perfil-identidad">
      <div className="perfil-foto-marco">
        {jugador.foto_url && !fallo ? <img className="perfil-foto" src={jugador.foto_url} alt={`${jugador.apellido}, ${jugador.nombre}`} onError={() => setFallo(true)} />
          : <div className="perfil-foto perfil-iniciales" aria-label="Fotografía no disponible">{iniciales(jugador.nombre, jugador.apellido)}</div>}
      </div>
      <div className="perfil-nombre">
        <span className="perfil-dorsal" aria-label={tieneDorsal ? 'Dorsal ' + jugador.dorsal : undefined} aria-hidden={tieneDorsal ? undefined : true}>
          {tieneDorsal ? jugador.dorsal : puestoPlantel(jugador.posicion).abreviatura}
        </span>
        <p className="dp-eyebrow">{jugador.nombre} · <b>{jugador.posicion || 'Posición sin cargar'}</b></p>
        <h1><span className="perfil-apellido">{jugador.apellido || jugador.nombre}</span><span className="sr-only">, {jugador.nombre}</span></h1>
        <div className="perfil-insignias"><span>{jugador.categorias?.nombre || 'Sin categoría'}</span>
          <span data-estado={jugador.estado || 'sin_dato'}>{estado}</span></div>
        <dl className="perfil-datos-deportivos">
          {[['Alternativa', jugador.posicion_secundaria], ['Edad', edad == null ? null : `${edad} años`], ['Pie hábil', pieHabilLabel[jugador.pie_habil]]]
            .filter(([, v]) => v != null && v !== '').map(([etiqueta, valor]) => <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor}</dd></div>)}
        </dl>
      </div>
      <div className="perfil-acciones"><button type="button" onClick={() => onEditar(jugador.id)}><IconoNavegacion nombre="evaluaciones" />Editar</button>
        <button type="button" className="perfil-primario" onClick={onPDF}><IconoNavegacion nombre="informes" />Descargar PDF</button>
        <details className="perfil-acciones-secundarias"><summary>Más acciones</summary><button type="button" className="perfil-eliminar" disabled={eliminando} onClick={onEliminar}>{eliminando ? 'Eliminando…' : 'Eliminar jugadora'}</button></details>
      </div>
    </div>
  </header>
}
