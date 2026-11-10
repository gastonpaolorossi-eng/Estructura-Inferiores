// Formatos de fecha para mostrar en pantalla. No cambian cómo se guardan ni cómo se consultan.
// Las fechas 'AAAA-MM-DD' son civiles: se leen sin pasar por UTC para no correr el día.

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function aFecha(valor) {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor
  if (typeof valor !== 'string' || !valor.trim()) return null
  const civil = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim())
  if (civil) return new Date(Number(civil[1]), Number(civil[2]) - 1, Number(civil[3]))
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

const mayuscula = texto => texto.charAt(0).toUpperCase() + texto.slice(1)

/** 'JUE 29 OCT 2026'. Devuelve '' si la fecha no es válida. */
export function fechaLarga(valor) {
  const d = aFecha(valor)
  if (!d) return ''
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`.toUpperCase()
}

/** '29 oct'. Devuelve '' si la fecha no es válida. */
export function fechaCorta(valor) {
  const d = aFecha(valor)
  return d ? `${d.getDate()} ${MESES[d.getMonth()]}` : ''
}

/** 'Dom 31 may · 15:15'. La hora puede venir como '15:15:00'; sin hora, solo la fecha. */
export function fechaHora(valor, hora) {
  const d = aFecha(valor)
  if (!d) return ''
  const base = `${mayuscula(DIAS[d.getDay()])} ${d.getDate()} ${MESES[d.getMonth()]}`
  const hhmm = typeof hora === 'string' ? /^(\d{1,2}):(\d{2})/.exec(hora.trim()) : null
  return hhmm ? `${base} · ${hhmm[1].padStart(2, '0')}:${hhmm[2]}` : base
}
