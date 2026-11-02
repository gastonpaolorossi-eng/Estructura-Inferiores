import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ids, prepararAnalisisSintetico, sesionSintetica } from './helpers/analisisSintetico.mjs'
const { PGlite } = await import(pathToFileURL(join(tmpdir(), 'comunicaciones-planificacion-pg/node_modules/@electric-sql/pglite/dist/index.js')).href)

test('PostgreSQL aislado: RLS, dos administradores, Reserva, RPC, clientes antiguos y atomicidad', async () => {
  const db = new PGlite()
  try {
    await prepararAnalisisSintetico(db)
    let sql = readFileSync('supabase/migrations/202611010001_permisos_definitivos_analisis.sql', 'utf8')
    // Identidades totalmente ficticias: solo se sustituye la configuración de la lista en memoria.
    // Los UUID definitivos del archivo original se verifican en permisosAnalisis.test.mjs.
    sql = sql.replaceAll('f7562d52-a16a-48b5-95a0-efbcc70080d3', ids.a).replaceAll('b2c65c50-8772-45a4-b2e0-c0e53c66253b', ids.b)
    // Otra adaptación en memoria: huellas de las RPC ANTERIORES sintéticas. No
    // se omite la precondición; no se copian datos ni definiciones de producción.
    for (const [firma, huella] of [['guardar_detalle_pase(uuid,text,uuid,bigint)','40a9917e10d7c87dcf14d06b1a4e10b1'],['guardar_destino_pase(uuid,double precision,double precision,bigint)','9e44772fe9c7dd2c01ae7a7e4829c9a8']]) {
      const r = await db.query('SELECT md5(pg_get_functiondef($1::regprocedure)) AS h', ['public.' + firma])
      sql = sql.replace(huella, r.rows[0].h)
    }
    await db.exec(sql)
    const ejecutar = async n => sesionSintetica(db,n)
    for (const n of ['a','b']) {
      await ejecutar(n)
      assert.equal((await db.query('select public.puede_administrar_analisis() as ok')).rows[0].ok,true)
      const nuevo = (await db.query('insert into public.analisis_partidos(categoria_id) values($1) returning id',[ids.cat])).rows[0].id
      assert.equal((await db.query('update public.analisis_partidos set notas=$1 where id=$2 returning id',['Sintético',nuevo])).rows.length,1)
      await db.query('delete from public.analisis_partidos where id=$1',[nuevo])
    }
    for (const n of ['otro','tecnico','medico','pf','reserva']) {
      await ejecutar(n)
      assert.equal((await db.query('select public.puede_administrar_analisis() as ok')).rows[0].ok,false)
      await assert.rejects(db.query('insert into public.analisis_eventos(partido_id,jugador_id,tipo) values($1,$2,$3)',[ids.an,ids.j,'Gol']),e=>e.code==='42501')
      assert.equal((await db.query('update public.analisis_eventos set resultado=$1 where id=$2 returning id',['Gol',ids.e])).rows.length,0)
      assert.equal((await db.query('delete from public.analisis_eventos where id=$1 returning id',[ids.e])).rows.length,0)
      await assert.rejects(db.query("select public.guardar_detalle_pase($1,'desconocida',null,null)",[ids.e]),e=>e.code==='42501')
    }
    await ejecutar('tecnico')
    assert.deepEqual((await db.query('select id from public.analisis_eventos order by id')).rows.map(r=>r.id),[ids.e,ids.er])
    await ejecutar('reserva')
    assert.deepEqual((await db.query('select id from public.analisis_eventos order by id')).rows.map(r=>r.id),[ids.e2,ids.er])
    await ejecutar('medico'); assert.equal((await db.query('select * from public.analisis_eventos')).rows.length,3)
    await ejecutar(null); await assert.rejects(db.query('select * from public.analisis_eventos'),e=>e.code==='42501')
    // Claims renovados conservan identidad; ausencia de sesión no autoriza escrituras.
    await ejecutar('a'); assert.equal((await db.query('select public.puede_administrar_analisis() as ok')).rows[0].ok,true)
    await ejecutar(null)
    await assert.rejects(db.query("select public.guardar_destino_pase($1,10,20,null)",[ids.e]),e=>e.code==='42501')
    await ejecutar('a')
    let detalle = (await db.query("select * from public.guardar_detalle_pase($1,'desconocida',null,null)",[ids.e])).rows[0]
    assert.equal(Number(detalle.revision),1)
    detalle = (await db.query('select * from public.guardar_destino_pase($1,20,30,1)',[ids.e])).rows[0]
    assert.equal(Number(detalle.revision),2); assert.equal(detalle.destinataria_estado,'desconocida')
    await assert.rejects(db.query("select public.guardar_detalle_pase($1,'pendiente',null,1)",[ids.e]),e=>e.code==='40001')
    await db.exec('RESET ROLE'); await db.query("update public.perfiles set rol='tecnico' where email='a@fixture.invalid'")
    await ejecutar('a'); await assert.rejects(db.query('select public.guardar_destino_pase($1,10,20,2)',[ids.e]),e=>e.code==='42501')
    await db.exec('RESET ROLE'); await db.query("update public.perfiles set rol='coordinacion' where email='a@fixture.invalid'")
    // Clientes antiguos: el primer DELETE/UPDATE real es rechazado sin tocar hijos.
    for (const n of ['a','tecnico']) {
      await sesionSintetica(db,n,false)
      for (const tabla of ['citaciones','estadisticas_jugador']) await assert.rejects(db.query(`delete from public.${tabla} where partido_id=$1`,[ids.p]),e=>e.code==='42501')
      await assert.rejects(db.query('update public.videos set partido_id=null where partido_id=$1',[ids.p]),e=>e.code==='42501')
    }
    await ejecutar('tecnico')
    await assert.rejects(db.query('select public.eliminar_partido_deportivo_seguro($1)',[ids.p]),e=>e.code==='42501')
    assert.equal((await db.query('select * from public.citaciones where partido_id=$1',[ids.p])).rows.length,1)
    assert.equal((await db.query('select * from public.estadisticas_jugador where partido_id=$1',[ids.p])).rows.length,1)
    // Las ediciones deportivas modernas conservan RLS y no son bloqueadas por protocolo.
    assert.equal((await db.query('update public.estadisticas_jugador set minutos_jugados=80 where partido_id=$1 returning id',[ids.p])).rows.length,1)
    await ejecutar('b')
    assert.equal((await db.query('select public.eliminar_partido_deportivo_seguro($1) as id',[ids.p])).rows[0].id,ids.p)
    assert.equal((await db.query('select partido_calendario_id from public.analisis_partidos where id=$1',[ids.an])).rows[0].partido_calendario_id,null)
    assert.equal((await db.query('select * from public.analisis_eventos where id=$1',[ids.e])).rows.length,1)
    await db.exec('RESET ROLE')
    const rollback = readFileSync('supabase/rollback/202611010001_permisos_definitivos_analisis.sql','utf8')
    await assert.rejects(db.exec(rollback), /no aprobada/)
    await db.exec('ROLLBACK')
    await db.exec("SET club.aprobar_reversion_amplia='SI_REVISADO'; CREATE POLICY ajena ON public.analisis_eventos FOR SELECT TO authenticated USING(false)")
    await assert.rejects(db.exec(rollback), /Deriva detectada/)
    await db.exec('ROLLBACK; DROP POLICY ajena ON public.analisis_eventos')
    assert.equal((await db.query("select to_regprocedure('public.puede_administrar_analisis()') is not null as ok")).rows[0].ok,true)
    const definicion = (await db.query("select pg_get_functiondef('public.puede_administrar_analisis()'::regprocedure) as d")).rows[0].d
    await db.exec("ALTER FUNCTION public.puede_administrar_analisis() SECURITY INVOKER")
    await assert.rejects(db.exec(rollback), /Deriva detectada/)
    await db.exec('ROLLBACK')
    await db.exec(definicion)
    await db.exec(rollback)
    assert.equal((await db.query('select count(*)::int as n from public.analisis_eventos')).rows[0].n,3)
  } finally { await db.close() }
})
