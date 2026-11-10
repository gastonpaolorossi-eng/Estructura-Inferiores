import './panelDeportivo.css'

const VARIANTES = ['principal', 'secundario', 'peligro']

/** principal: amarillo · secundario: con borde · peligro: rojo, solo para borrar. */
export default function Boton({ variante = 'principal', type = 'button', className = '', children, ...props }) {
  const tipo = VARIANTES.includes(variante) ? variante : 'principal'
  return <button type={type} className={`dp-btn dp-btn-${tipo}${className ? ' ' + className : ''}`} {...props}>
    {children}
  </button>
}
