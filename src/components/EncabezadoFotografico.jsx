import './fotografiasClub.css'

// Solo presentación: las fotografías se sirven completas desde public, sin variantes.
// eyebrow + eyebrowResaltado y titulo + resaltado siguen el mismo criterio que EncabezadoSeccion.
export default function EncabezadoFotografico({ titulo, resaltado, eyebrow = 'Comunicaciones', eyebrowResaltado, imagen, descripcionImagen, children, posicion = 'centro' }) {
  return <header className={`club-foto-encabezado club-foto-${posicion}`}>
    <img src={imagen} alt={descripcionImagen} decoding="async" />
    <div className="club-foto-contenido">
      <p>{eyebrow}{eyebrow && eyebrowResaltado && ' · '}{eyebrowResaltado && <b>{eyebrowResaltado}</b>}</p>
      <h1>{titulo}{resaltado && <em>{resaltado}</em>}</h1>
      {children && <div className="club-foto-acciones">{children}</div>}
    </div>
  </header>
}
