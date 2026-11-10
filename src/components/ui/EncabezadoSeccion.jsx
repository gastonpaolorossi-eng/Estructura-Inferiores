import './panelDeportivo.css'

/**
 * Encabezado editorial de sección. Solo presentación: el padre proporciona las acciones ya autorizadas.
 * eyebrow + eyebrowResaltado: línea chica superior (la parte resaltada va en amarillo).
 * titulo + resaltado: título grande en mayúsculas (la parte resaltada va en amarillo).
 * imagenFondo: foto opcional oscurecida con degradado.
 */
export default function EncabezadoSeccion({
  titulo, resaltado, eyebrow, eyebrowResaltado, descripcion, acciones, children,
  nivel = 1, id, imagenFondo, posicionImagen = '50% 40%',
}) {
  const Titulo = `h${[1, 2, 3, 4, 5, 6].includes(nivel) ? nivel : 1}`
  return <header className={'dp-encabezado' + (imagenFondo ? ' dp-encabezado-foto' : '')}>
    {imagenFondo && <img className="dp-encabezado-imagen" src={imagenFondo} alt="" aria-hidden="true" decoding="async" style={{ objectPosition: posicionImagen }} />}
    <div className="dp-encabezado-fila">
      <div className="dp-encabezado-textos">
        {(eyebrow || eyebrowResaltado) && <p className="dp-eyebrow">
          {eyebrow}{eyebrow && eyebrowResaltado && ' · '}{eyebrowResaltado && <b>{eyebrowResaltado}</b>}
        </p>}
        <Titulo id={id} className="dp-titulo">{titulo}{resaltado && <em>{resaltado}</em>}</Titulo>
        {descripcion && <p className="dp-descripcion">{descripcion}</p>}
      </div>
      {acciones && <div className="dp-acciones" role="group" aria-label="Acciones de la sección">{acciones}</div>}
    </div>
    {children && <div className="dp-encabezado-extra">{children}</div>}
  </header>
}
