import { jsPDF } from 'jspdf'
import { supabase } from '../supabaseClient'
import { FORMACIONES } from '../data/formaciones'

const NAVY = [26, 35, 50]
const VERDE = [74, 222, 128]
const VERDE_OSCURO = [21, 61, 44]
const CANCHA_LINEA = [255, 255, 255]
const GRIS = [90, 100, 115]
const GRIS_CLARO = [235, 238, 243]
const BLANCO = [255, 255, 255]

const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']

function formatearFecha(fechaStr) {
  if (!fechaStr) return { diaSemana: '', fechaCorta: '' }
  const [anio, mes, dia] = fechaStr.split('-')
  const d = new Date(Number(anio), Number(mes) - 1, Number(dia))
  const diaSemana = DIAS[d.getDay()] || ''
  return { diaSemana, fechaCorta: `${dia}/${mes}` }
}

export async function generarCitacionPDF(partidoId) {
  const { data: partido } = await supabase
    .from('partidos')
    .select('*, categorias(nombre)')
    .eq('id', partidoId)
    .single()

  const { data: citaciones } = await supabase
    .from('citaciones')
    .select('*, jugadores(nombre, apellido)')
    .eq('partido_id', partidoId)

  if (!partido || !citaciones || citaciones.length === 0) {
    alert('Todavía no hay convocatoria cargada para este partido.')
    return
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 34

  // ===== Barra superior (acento navy + verde) =====
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageWidth, 9, 'F')
  doc.setFillColor(...VERDE)
  doc.rect(0, 9, pageWidth, 3, 'F')

  // ===== Encabezado: club / categoría =====
  let y = 34
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('ESTRUCTURA INFERIORES', margin, y)

  if (partido.categorias?.nombre) {
    const etiqueta = `${partido.categorias.nombre.toUpperCase()} DIVISIÓN`
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    const w = doc.getTextWidth(etiqueta) + 20
    doc.setFillColor(...NAVY)
    doc.roundedRect(pageWidth - margin - w, y - 13, w, 19, 9, 9, 'F')
    doc.setTextColor(...BLANCO)
    doc.text(etiqueta, pageWidth - margin - w / 2, y, { align: 'center' })
  }

  // ===== Card principal: rival + datos del partido =====
  const cajaY = y + 18
  const cajaH = 54
  doc.setFillColor(...NAVY)
  doc.roundedRect(margin, cajaY, pageWidth - margin * 2, cajaH, 8, 8, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...BLANCO)
  doc.text(`vs ${partido.rival}`, margin + 18, cajaY + 33)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(200, 208, 220)
  const subtitulo = [
    partido.local_visitante ? (partido.local_visitante === 'local' ? 'Partido de local' : 'Partido de visitante') : null,
    partido.categorias?.nombre ? `Categoría ${partido.categorias.nombre}` : null,
  ]
    .filter(Boolean)
    .join('   ·   ')
  doc.text(subtitulo, margin + 18, cajaY + 33 + 15)

  // ===== Franja de datos rápidos: FECHA / HORA / LUGAR =====
  const { diaSemana, fechaCorta } = formatearFecha(partido.fecha)
  const franjaY = cajaY + cajaH + 14
  const franjaH = 44
  const gap = 10
  const franjaW = (pageWidth - margin * 2 - gap * 2) / 3
  const datosFranja = [
    { label: 'FECHA', valor: fechaCorta ? `${diaSemana} ${fechaCorta}` : '—' },
    { label: 'HORA', valor: partido.hora ? `${partido.hora} hs` : '—' },
    { label: 'LUGAR', valor: partido.lugar || '—' },
  ]
  datosFranja.forEach((d, i) => {
    const bx = margin + i * (franjaW + gap)
    doc.setFillColor(...GRIS_CLARO)
    doc.roundedRect(bx, franjaY, franjaW, franjaH, 6, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRIS)
    doc.text(d.label, bx + 10, franjaY + 15)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text(String(d.valor), bx + 10, franjaY + 32, { maxWidth: franjaW - 20 })
  })

  // ===== Layout: suplentes a la izquierda, cancha a la derecha =====
  const contenidoY = franjaY + franjaH + 20
  const colIzqX = margin
  const colIzqW = 148
  const canchaX = colIzqX + colIzqW + 18
  const canchaW = pageWidth - margin - canchaX
  const canchaY = contenidoY
  const footerReserva = 34
  const canchaH = pageHeight - footerReserva - 30 - canchaY

  const ordenados = [...citaciones].sort((a, b) => (a.dorsal || 99) - (b.dorsal || 99))
  const suplentes = ordenados.filter((c) => !c.titular)

  // --- Columna suplentes ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...NAVY)
  doc.text('SUPLENTES', colIzqX, contenidoY)

  doc.setDrawColor(...VERDE)
  doc.setLineWidth(2)
  doc.line(colIzqX, contenidoY + 6, colIzqX + 28, contenidoY + 6)

  let ySup = contenidoY + 26
  const filaAltura = 22
  suplentes.forEach((c, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...GRIS_CLARO)
      doc.roundedRect(colIzqX - 4, ySup - 14, colIzqW + 4, filaAltura, 4, 4, 'F')
    }
    doc.setFillColor(...NAVY)
    doc.circle(colIzqX + 9, ySup - 4, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...BLANCO)
    doc.text(c.dorsal ? String(c.dorsal) : '-', colIzqX + 9, ySup - 1, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 35, 45)
    const nombreCompleto = `${c.jugadores?.apellido || ''}, ${c.jugadores?.nombre || ''}`
    doc.text(nombreCompleto, colIzqX + 24, ySup, { maxWidth: colIzqW - 26 })
    ySup += filaAltura
  })
  if (suplentes.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...GRIS)
    doc.text('Sin suplentes cargados', colIzqX, ySup)
  }

  // --- Cancha ---
  doc.setFillColor(...VERDE_OSCURO)
  doc.roundedRect(canchaX, canchaY, canchaW, canchaH, 10, 10, 'F')

  doc.setDrawColor(...CANCHA_LINEA)
  doc.setLineWidth(0.7)
  doc.roundedRect(canchaX + 10, canchaY + 10, canchaW - 20, canchaH - 20, 4, 4)
  doc.line(canchaX + 10, canchaY + canchaH / 2, canchaX + canchaW - 10, canchaY + canchaH / 2)
  doc.circle(canchaX + canchaW / 2, canchaY + canchaH / 2, canchaW * 0.15)
  doc.setFillColor(...CANCHA_LINEA)
  doc.circle(canchaX + canchaW / 2, canchaY + canchaH / 2, 1.6, 'F')

  // arco propio (abajo) + área chica
  const arcoW = canchaW * 0.42
  const areaW = canchaW * 0.26
  doc.rect(canchaX + (canchaW - arcoW) / 2, canchaY + canchaH - 10 - canchaH * 0.09, arcoW, canchaH * 0.09)
  doc.rect(canchaX + (canchaW - areaW) / 2, canchaY + canchaH - 10 - canchaH * 0.035, areaW, canchaH * 0.035)

  // arco rival (arriba) + área chica
  doc.rect(canchaX + (canchaW - arcoW) / 2, canchaY + 10, arcoW, canchaH * 0.09)
  doc.rect(canchaX + (canchaW - areaW) / 2, canchaY + 10 + canchaH * 0.09 - canchaH * 0.005, areaW, canchaH * 0.005)

  const slots = FORMACIONES[partido.formacion] || []
  const radioCirculo = 15
  slots.forEach((slot) => {
    const citacion = citaciones.find(
      (c) => String(c.posicion_cancha) === String(slot.codigo) && c.titular
    )
    const px = canchaX + (slot.x / 100) * canchaW
    const py = canchaY + (slot.y / 100) * canchaH

    doc.setFillColor(...BLANCO)
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(1.4)
    doc.circle(px, py, radioCirculo, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...NAVY)
    const numeroCirculo = citacion?.dorsal ? String(citacion.dorsal) : '–'
    doc.text(numeroCirculo, px, py + 4.2, { align: 'center' })

    const etiqueta = citacion ? `${citacion.jugadores?.apellido || ''}`.toUpperCase() : slot.label.toUpperCase()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    const anchoTexto = doc.getTextWidth(etiqueta) + 10
    doc.setFillColor(...NAVY)
    doc.roundedRect(px - anchoTexto / 2, py + radioCirculo + 5, anchoTexto, 12, 3, 3, 'F')
    doc.setTextColor(...BLANCO)
    doc.text(etiqueta.slice(0, 18), px, py + radioCirculo + 13.5, { align: 'center' })
  })

  // ===== Pie de página =====
  const footerY = pageHeight - footerReserva
  doc.setFillColor(...NAVY)
  doc.rect(0, footerY, pageWidth, footerReserva, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BLANCO)
  doc.text('ESTRUCTURA INFERIORES', margin, footerY + footerReserva / 2 + 3)

  if (partido.formacion) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...VERDE)
    doc.text(partido.formacion, pageWidth - margin, footerY + footerReserva / 2 + 3, { align: 'right' })
  }

  doc.save(`Citacion_vs_${partido.rival.replace(/\s+/g, '_')}.pdf`)
}
