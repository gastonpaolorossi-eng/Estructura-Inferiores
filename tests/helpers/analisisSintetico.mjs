// Esquema exclusivamente sintético en PostgreSQL WASM. No importa supabaseClient.
export const ids = {
  a: '10000000-0000-4000-8000-000000000001', b: '10000000-0000-4000-8000-000000000002',
  otro: '10000000-0000-4000-8000-000000000003', tecnico: '10000000-0000-4000-8000-000000000004',
  reserva: '10000000-0000-4000-8000-000000000005', medico: '10000000-0000-4000-8000-000000000006', pf: '10000000-0000-4000-8000-000000000007',
  cat: '20000000-0000-4000-8000-000000000001', cat2: '20000000-0000-4000-8000-000000000002',
  j: '30000000-0000-4000-8000-000000000001', j2: '30000000-0000-4000-8000-000000000002', jr: '30000000-0000-4000-8000-000000000003',
  p: '40000000-0000-4000-8000-000000000001', p2: '40000000-0000-4000-8000-000000000002',
  an: '50000000-0000-4000-8000-000000000001', an2: '50000000-0000-4000-8000-000000000002',
  e: '60000000-0000-4000-8000-000000000001', e2: '60000000-0000-4000-8000-000000000002', er: '60000000-0000-4000-8000-000000000003',
}
export async function prepararAnalisisSintetico(db) {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA analisis_privado;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,banned_until timestamptz);
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(auth.jwt()->>'sub','')::uuid$$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT auth.jwt()->>'role'$$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;
    CREATE TABLE public.categorias(id uuid PRIMARY KEY, es_reserva boolean DEFAULT false);
    CREATE TABLE public.perfiles(email text PRIMARY KEY,rol text,categoria_id uuid REFERENCES public.categorias);
    CREATE FUNCTION public.mi_rol() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT rol FROM public.perfiles WHERE lower(email)=lower(auth.jwt()->>'email')$$;
    CREATE FUNCTION public.mi_categoria() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT categoria_id FROM public.perfiles WHERE email=auth.jwt()->>'email'$$;
    CREATE TABLE public.jugadores(id uuid PRIMARY KEY,categoria_id uuid REFERENCES public.categorias,tambien_reserva boolean DEFAULT false);
    CREATE FUNCTION public.mi_categoria_es_reserva() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT coalesce((SELECT es_reserva FROM public.categorias WHERE id=public.mi_categoria()),false)$$;
    CREATE FUNCTION public.jugador_tambien_reserva(jid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT coalesce((SELECT tambien_reserva FROM public.jugadores WHERE id=jid),false)$$;
    CREATE TABLE public.partidos(id uuid PRIMARY KEY,categoria_id uuid REFERENCES public.categorias);
    CREATE TABLE public.citaciones(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),partido_id uuid REFERENCES public.partidos,jugador_id uuid REFERENCES public.jugadores);
    CREATE TABLE public.estadisticas_jugador(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),partido_id uuid REFERENCES public.partidos,jugador_id uuid REFERENCES public.jugadores,minutos_jugados int);
    CREATE TABLE public.videos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),partido_id uuid REFERENCES public.partidos,categoria_id uuid REFERENCES public.categorias);
    CREATE TABLE public.analisis_partidos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),categoria_id uuid REFERENCES public.categorias,partido_calendario_id uuid REFERENCES public.partidos ON DELETE SET NULL,notas text);
    CREATE TABLE public.analisis_eventos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),partido_id uuid REFERENCES public.analisis_partidos ON DELETE CASCADE,jugador_id uuid REFERENCES public.jugadores,tipo text,resultado text,segundo int,periodo smallint,coordenada_x double precision,coordenada_y double precision);
    CREATE TABLE public.analisis_pases_detalle(evento_id uuid PRIMARY KEY REFERENCES public.analisis_eventos ON DELETE CASCADE,destinataria_id uuid REFERENCES public.jugadores ON DELETE RESTRICT,destinataria_estado text,version_formato int,revision bigint,creado_en timestamptz,actualizado_en timestamptz,creado_por uuid,actualizado_por uuid,destino_x double precision,destino_y double precision,
      CHECK((destino_x IS NULL AND destino_y IS NULL) OR (destino_x IS NOT NULL AND destino_y IS NOT NULL AND destino_x BETWEEN 0 AND 100 AND destino_y BETWEEN 0 AND 100)));
    CREATE FUNCTION analisis_privado.proteger_evento_con_detalle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN
      IF EXISTS(SELECT 1 FROM public.analisis_pases_detalle WHERE evento_id=OLD.id) AND (NEW.tipo NOT IN ('Pase correcto','Pase incorrecto') OR EXISTS(SELECT 1 FROM public.analisis_pases_detalle WHERE evento_id=OLD.id AND destinataria_id=NEW.jugador_id)) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Detalle incompatible'; END IF; RETURN NEW; END$$;
    REVOKE ALL ON FUNCTION analisis_privado.proteger_evento_con_detalle() FROM PUBLIC;
    CREATE TRIGGER proteger_evento_con_detalle BEFORE UPDATE OF tipo,jugador_id ON public.analisis_eventos FOR EACH ROW EXECUTE FUNCTION analisis_privado.proteger_evento_con_detalle();
    CREATE FUNCTION public.guardar_detalle_pase(p_evento_id uuid,p_destinataria_estado text,p_destinataria_id uuid,p_revision_esperada bigint) RETURNS public.analisis_pases_detalle LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN RETURN NULL; END$$;
    CREATE FUNCTION public.guardar_destino_pase(p_evento_id uuid,p_destino_x double precision,p_destino_y double precision,p_revision_esperada bigint) RETURNS public.analisis_pases_detalle LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN RETURN NULL; END$$;
    REVOKE ALL ON FUNCTION public.guardar_detalle_pase(uuid,text,uuid,bigint),public.guardar_destino_pase(uuid,double precision,double precision,bigint) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.guardar_detalle_pase(uuid,text,uuid,bigint),public.guardar_destino_pase(uuid,double precision,double precision,bigint) TO authenticated;
  `)
  for (const tabla of ['jugadores','partidos','citaciones','estadisticas_jugador','videos','analisis_partidos','analisis_eventos','analisis_pases_detalle']) await db.exec(`ALTER TABLE public.${tabla} ENABLE ROW LEVEL SECURITY; GRANT ALL ON public.${tabla} TO anon,authenticated`)
  await db.exec(`
    ALTER TABLE public.analisis_pases_detalle FORCE ROW LEVEL SECURITY;
    REVOKE ALL ON public.analisis_pases_detalle FROM anon,authenticated; GRANT SELECT ON public.analisis_pases_detalle TO authenticated;
    CREATE POLICY "select jugadores" ON public.jugadores FOR SELECT TO authenticated USING(public.mi_rol() IN ('coordinacion','medico','preparador_fisico') OR public.mi_rol()='tecnico' AND (categoria_id=public.mi_categoria() OR public.mi_categoria_es_reserva() AND public.jugador_tambien_reserva(id)));
    CREATE POLICY "acceso partidos" ON public.partidos FOR ALL TO authenticated USING(public.mi_rol()='coordinacion' OR public.mi_rol()='tecnico' AND categoria_id=public.mi_categoria()) WITH CHECK(public.mi_rol()='coordinacion' OR public.mi_rol()='tecnico' AND categoria_id=public.mi_categoria());
    CREATE POLICY "lectura pf" ON public.partidos FOR SELECT TO authenticated USING(public.mi_rol()='preparador_fisico');
    CREATE POLICY "acceso citaciones" ON public.citaciones FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.partidos p WHERE p.id=partido_id AND (public.mi_rol()='coordinacion' OR public.mi_rol()='tecnico' AND p.categoria_id=public.mi_categoria()))) WITH CHECK(EXISTS(SELECT 1 FROM public.partidos p WHERE p.id=partido_id AND (public.mi_rol()='coordinacion' OR public.mi_rol()='tecnico' AND p.categoria_id=public.mi_categoria())));
    CREATE POLICY "acceso estadisticas" ON public.estadisticas_jugador FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.partidos p WHERE p.id=partido_id AND (public.mi_rol()='coordinacion' OR public.mi_rol()='tecnico' AND p.categoria_id=public.mi_categoria()))) WITH CHECK(EXISTS(SELECT 1 FROM public.partidos p WHERE p.id=partido_id AND (public.mi_rol()='coordinacion' OR public.mi_rol()='tecnico' AND p.categoria_id=public.mi_categoria())));
    CREATE POLICY "acceso videos" ON public.videos FOR ALL TO authenticated USING(public.mi_rol()='coordinacion' OR public.mi_rol()='tecnico' AND (categoria_id=public.mi_categoria() OR EXISTS(SELECT 1 FROM public.partidos p WHERE p.id=partido_id AND p.categoria_id=public.mi_categoria()))) WITH CHECK(public.mi_rol()='coordinacion' OR public.mi_rol()='tecnico' AND (categoria_id=public.mi_categoria() OR EXISTS(SELECT 1 FROM public.partidos p WHERE p.id=partido_id AND p.categoria_id=public.mi_categoria())));
    CREATE POLICY pases_detalle_lectura ON public.analisis_pases_detalle FOR SELECT TO authenticated USING(true);
  `)
  for (const tabla of ['analisis_partidos','analisis_eventos']) {
    await db.exec(`CREATE POLICY ${tabla}_read ON public.${tabla} FOR SELECT TO authenticated USING(true)`)
    for (const [operacion, sufijo] of [['INSERT','insert'],['UPDATE','update'],['DELETE','delete']]) await db.exec(`CREATE POLICY ${tabla}_${sufijo}_admin ON public.${tabla} FOR ${operacion} TO authenticated ${operacion==='INSERT'?'':"USING(public.mi_rol()='coordinacion')"} ${operacion==='DELETE'?'':"WITH CHECK(public.mi_rol()='coordinacion')"}`)
  }
  await db.exec(`INSERT INTO public.categorias VALUES('${ids.cat}',false),('${ids.cat2}',true)`)
  for (const [n, rol, cat] of [['a','coordinacion',ids.cat],['b','coordinacion',ids.cat],['otro','coordinacion',ids.cat],['tecnico','tecnico',ids.cat],['reserva','tecnico',ids.cat2],['medico','medico',ids.cat],['pf','preparador_fisico',ids.cat]]) {
    await db.query('INSERT INTO auth.users VALUES($1,$2,now(),null)',[ids[n],`${n}@fixture.invalid`])
    await db.query('INSERT INTO public.perfiles VALUES($1,$2,$3)',[`${n}@fixture.invalid`,rol,cat])
  }
  await db.exec(`INSERT INTO public.jugadores VALUES('${ids.j}','${ids.cat}',false),('${ids.j2}','${ids.cat2}',false),('${ids.jr}','${ids.cat}',true);
    INSERT INTO public.partidos VALUES('${ids.p}','${ids.cat}'),('${ids.p2}','${ids.cat2}');
    INSERT INTO public.analisis_partidos(id,categoria_id,partido_calendario_id) VALUES('${ids.an}','${ids.cat}','${ids.p}'),('${ids.an2}','${ids.cat2}','${ids.p2}');
    INSERT INTO public.analisis_eventos(id,partido_id,jugador_id,tipo) VALUES('${ids.e}','${ids.an}','${ids.j}','Pase correcto'),('${ids.e2}','${ids.an2}','${ids.j2}','Pase incorrecto'),('${ids.er}','${ids.an}','${ids.jr}','Recuperación');
    INSERT INTO public.citaciones(partido_id,jugador_id) VALUES('${ids.p}','${ids.j}');
    INSERT INTO public.estadisticas_jugador(partido_id,jugador_id,minutos_jugados) VALUES('${ids.p}','${ids.j}',90);
    INSERT INTO public.videos(partido_id,categoria_id) VALUES('${ids.p}','${ids.cat}');`)
}

export async function sesionSintetica(db, nombre, moderno = true) {
  await db.exec('RESET ROLE')
  const claims = nombre ? { sub: ids[nombre], email: `${nombre}@fixture.invalid`, role: 'authenticated' } : {}
  await db.query("SELECT set_config('request.jwt.claims',$1,false),set_config('request.headers',$2,false)",[JSON.stringify(claims),JSON.stringify(moderno ? { 'x-client-info': 'club-comunicaciones/permisos-analisis-v2' } : {})])
  await db.exec(`SET ROLE ${nombre ? 'authenticated' : 'anon'}`)
}
