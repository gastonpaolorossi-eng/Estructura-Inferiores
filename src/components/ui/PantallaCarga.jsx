import { ESCUDO_URL, NOMBRE_CLUB } from '../../config/club'
import './panelDeportivo.css'

/** Pantalla de carga con el escudo (pulso suave y barra amarilla) mientras se verifica la sesión. */
export default function PantallaCarga({ mensaje = 'Cargando…' }) {
  return <div className="dp-carga" role="status" aria-live="polite">
    <img src={ESCUDO_URL} alt="" aria-hidden="true" />
    <p>{NOMBRE_CLUB}<br />{mensaje}</p>
    <span className="dp-vacio-barra" aria-hidden="true"><i /></span>
  </div>
}
