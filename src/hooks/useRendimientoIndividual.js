import { useEffect, useState } from 'react'
import { leerRendimientoIndividual, errorLecturaIndividual } from '../utils/rendimiento/lecturaIndividual'

/** Un solo lector para gráficos/mapas/explorador; no lee pestañas ocultas.
 * La clave retira datos viejos durante cambios de usuario, jugadora o categoría.
 */
export default function useRendimientoIndividual(cliente,{activo,principalId,segundaId,perfil}) {
  const [sesion,setSesion]=useState({lista:false,id:null,token:null})
  const [recarga,setRecarga]=useState(0),[resultado,setResultado]=useState(null)
  const contexto=JSON.stringify([perfil?.email,perfil?.rol,perfil?.categoria_id])
  const clave=JSON.stringify([sesion.id,sesion.token,principalId,segundaId,contexto,recarga])
  useEffect(()=>{
    let vigente=true,recibido=false
    const aplicar=s=>{if(vigente)setSesion(p=>p.lista && p.id===(s?.user?.id || null) && p.token===(s?.access_token || null)?p:{lista:true,id:s?.user?.id || null,token:s?.access_token || null})}
    if(!cliente.auth?.getSession || !cliente.auth?.onAuthStateChange)return
    const {data}=cliente.auth.onAuthStateChange((_evento,s)=>{recibido=true;aplicar(s)})
    cliente.auth.getSession().then(({data,error})=>{if(!recibido)aplicar(error?null:data?.session)}).catch(()=>{if(!recibido)aplicar(null)})
    return ()=>{vigente=false;data.subscription.unsubscribe()}
  },[cliente])
  useEffect(()=>{
    if(!activo || !sesion.lista || !sesion.id || !principalId)return
    let vigente=true
    Promise.resolve().then(async()=>{
      if(!vigente)return
      try{
        const datos=await leerRendimientoIndividual(cliente,{principalId,segundaId,usuarioId:sesion.id,vigente:()=>vigente})
        if(vigente)setResultado({clave,datos})
      }catch(e){if(vigente)setResultado({clave,datos:{...errorLecturaIndividual(e),jugadoras:[],fuentes:{}}})}
    })
    return ()=>{vigente=false}
  },[cliente,activo,principalId,segundaId,sesion.lista,sesion.id,clave])
  // Revalidar al recuperar el foco también recoge cambios de rol/categoría remotos.
  useEffect(()=>{
    if(!activo)return
    const actualizar=()=>setRecarga(n=>n+1)
    window.addEventListener('focus',actualizar)
    return ()=>window.removeEventListener('focus',actualizar)
  },[activo])
  const datos=activo && sesion.lista && sesion.id && resultado?.clave===clave?resultado.datos:null
  const cargando=Boolean(activo && (!sesion.lista || sesion.id && !datos))
  return {datos,estado:!activo?'no_consultada':!sesion.lista?'cargando':!sesion.id?'sin_sesion':datos?.estado || 'cargando',cargando,
    actualizar:()=>{if(!cargando)setRecarga(n=>n+1)}}
}
