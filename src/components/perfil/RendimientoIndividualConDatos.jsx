import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import useRendimientoIndividual from '../../hooks/useRendimientoIndividual'
import { presentarLecturaIndividual, temporadasLecturaIndividual } from '../../utils/rendimiento/lecturaIndividual'
import RendimientoIndividual from './RendimientoIndividual'

export default function RendimientoIndividualConDatos({activo,perfil,...props}) {
  const [segundaId,setSegunda]=useState(''),[anio,setAnio]=useState('')
  const lectura=useRendimientoIndividual(supabase,{activo,principalId:props.jugador.id,segundaId,perfil})
  const anios=[...new Set([...props.temporadas.map(t=>t.anio).filter(a=>/^\d{4}$/.test(a)),...temporadasLecturaIndividual(lectura.datos)])].sort().reverse()
  const elegido=anios.includes(anio)?anio:anios[0] || ''
  const datos=lectura.datos?presentarLecturaIndividual(lectura.datos,elegido):{estado:lectura.estado}
  return <RendimientoIndividual {...props} lecturaAcciones={datos} jugadorasAutorizadas={lectura.datos?.jugadoras || []}
    aniosLectura={anios} anioSeleccionado={elegido} onAnio={setAnio} segundaSeleccionada={segundaId} onSegunda={setSegunda}
    cargandoAcciones={lectura.cargando} onActualizar={lectura.actualizar} />
}
