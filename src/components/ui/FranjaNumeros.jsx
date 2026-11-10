import { useEffect, useRef, useState } from 'react'
import './panelDeportivo.css'

const DURACION_MS = 900

function sinMovimiento() {
  return typeof window === 'undefined' || typeof window.matchMedia !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const esNumero = valor => typeof valor === 'number' && Number.isFinite(valor)

/** Cuenta hasta el valor al aparecer o cambiar. Los valores no numéricos se muestran tal cual. */
function NumeroAnimado({ valor }) {
  // null = mostrar el valor final; un número = cuadro intermedio de la animación.
  const [cuadro, setCuadro] = useState(() => esNumero(valor) && !sinMovimiento() ? 0 : null)
  const anterior = useRef(0)

  useEffect(() => {
    if (!esNumero(valor) || sinMovimiento()) { anterior.current = valor; return }
    const desde = esNumero(anterior.current) ? anterior.current : 0
    const decimales = Number.isInteger(valor) ? 0 : 1
    const inicio = performance.now()
    let pedido
    const paso = ahora => {
      const avance = Math.min(1, (ahora - inicio) / DURACION_MS)
      if (avance < 1) {
        setCuadro(Number((desde + (valor - desde) * (1 - Math.pow(1 - avance, 3))).toFixed(decimales)))
        pedido = requestAnimationFrame(paso)
      } else {
        anterior.current = valor
        setCuadro(null)
      }
    }
    pedido = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(pedido)
  }, [valor])

  return cuadro ?? valor
}

/**
 * Franja de 3 o 4 números grandes con su etiqueta. Recibe valores ya calculados.
 * items: [{ etiqueta, valor, unidad?, nivel? }]. Un valor ausente (null/undefined) se muestra como "—".
 * nivel ('verde' | 'amarillo' | 'rojo') colorea el valor, por ejemplo para el semáforo.
 */
export default function FranjaNumeros({ items = [], etiqueta = 'Resumen en números' }) {
  return <dl className="dp-franja" aria-label={etiqueta} data-columnas={Math.min(Math.max(items.length, 1), 4)}>
    {items.map(item => {
      const ausente = item.valor == null || (typeof item.valor === 'number' && !Number.isFinite(item.valor))
      return <div key={item.etiqueta} className="dp-franja-item" data-nivel={item.nivel}>
        <dt className="dp-franja-etiqueta">{item.etiqueta}</dt>
        <dd className="dp-franja-valor">
          {ausente ? '—' : <><NumeroAnimado valor={item.valor} />{item.unidad && <small>{item.unidad}</small>}</>}
        </dd>
      </div>
    })}
  </dl>
}
