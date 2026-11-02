// Simulación de API/RLS para pruebas locales. Nunca importa credenciales.
export function crearClienteIndividual({cantidad=3}={}) {
 const principal={id:'j',nombre:'Principal',apellido:'Ficticia',categoria_id:'c',tambien_reserva:true},segunda={id:'k',nombre:'Segunda',apellido:'Ficticia',categoria_id:'r'}
 const estado={usuario:{id:'u',email:'fixture@invalid.test'},token:'sintetico',visibles:['j','k'],errores:{},perfil:{email:'fixture@invalid.test',rol:'tecnico',categoria_id:'r'},demora:null}
 const tablas={jugadores:[principal,segunda,{id:'ajena',categoria_id:'otra'}],perfiles:[estado.perfil],partidos:[{id:'p',categoria_id:'c',fecha:'2026-01-20',rival:'Fixture'}],
 analisis_partidos:[{id:'a',categoria_id:'c',partido_calendario_id:'p',fecha:'2026-01-20',rival:'Fixture',video_url:'https://www.youtube.com/watch?v=abc123def45'}],
 estadisticas_jugador:[{id:'s',jugador_id:'j',partido_id:'p',minutos_jugados:80,titular:true}],
 analisis_eventos:Array.from({length:cantidad},(_,i)=>({id:'e'+String(i).padStart(5,'0'),jugador_id:'j',partido_id:'a',tipo:i%2?'Pase incorrecto':'Pase correcto',resultado:i%3===0?'Neutro':null,segundo:i,periodo:1,coordenada_x:i%2?null:40,coordenada_y:30}))}
 tablas.analisis_eventos.push({id:'z',jugador_id:'k',partido_id:'a',tipo:'Despeje',resultado:'Exitoso',segundo:62})
 const llamadas=[],listeners=new Set()
 const cliente={auth:{getUser:async()=>({data:{user:estado.usuario}}),getSession:async()=>({data:{session:estado.usuario?{user:estado.usuario,access_token:estado.token}:null}}),onAuthStateChange:fn=>{listeners.add(fn);return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}}}},
 from(tabla){const filtros=[],campos={valor:''};const q={select(v){campos.valor=v;return q},eq(c,v){filtros.push([c,[v]]);return q},in(c,v){filtros.push([c,v]);return q},order(){return q},range:async(inicio,fin)=>{
 llamadas.push({tabla,filtros:structuredClone(filtros),inicio,fin,campos:campos.valor})
 if(estado.demora)await estado.demora(tabla)
 if(estado.errores[tabla])return {data:null,error:estado.errores[tabla]}
 const filas=(tabla==='perfiles'?[estado.perfil]:tablas[tabla] || []).filter(f=>tabla!=='jugadores' || estado.visibles.includes(f.id)).filter(f=>filtros.every(([c,vs])=>vs.includes(f[c]))).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))).slice(inicio,fin+1)
 return {data:structuredClone(filas)}},maybeSingle:async()=>({data:tabla==='perfiles'?structuredClone(estado.perfil):null,error:estado.errores[tabla]})};return q}}
 const emitir=evento=>listeners.forEach(fn=>fn(evento,estado.usuario?{user:estado.usuario,access_token:estado.token}:null))
 return {cliente,estado,tablas,llamadas,principal,segunda,emitir}
}
