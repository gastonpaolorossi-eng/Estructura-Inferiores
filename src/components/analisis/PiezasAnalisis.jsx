import { ANALISIS as A } from '../../appearance/analisis'

export function Boton({
  children,
  onClick,
  disabled = false,
  secundario = false,
  submit = false,
}) {
  return (
    <button
      type={submit ? 'submit' : 'button'}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-4 py-2.5 text-sm font-bold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
      style={secundario
        ? { backgroundColor: A.control, color: A.texto, border: `1px solid ${A.borde}` }
        : { backgroundColor: 'var(--ui-acento)', color: 'var(--ui-texto-sobre-acento)' }}
    >
      {children}
    </button>
  )
}

export function Campo({ label, children }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium" style={{ color: A.texto }}>{label}</span>
      {children}
    </label>
  )
}

export function Panel({ children, className = '', style = {}, id }) {
  return (
    <section
      id={id}
      className={`rounded-xl border p-4 md:p-5 ${className}`}
      style={{ backgroundColor: A.panel, borderColor: A.borde, ...style }}
    >
      {children}
    </section>
  )
}
