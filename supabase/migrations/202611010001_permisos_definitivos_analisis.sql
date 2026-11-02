BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Preparada para revisión. NO ejecutar desde tests ni desde el frontend.
DO $preflight$
BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Requiere revisión y ejecución por postgres.'; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c WHERE c.oid IN ('public.analisis_eventos'::regclass,'public.analisis_partidos'::regclass,'public.analisis_pases_detalle'::regclass,'public.jugadores'::regclass,'public.partidos'::regclass) AND NOT c.relrowsecurity)
     OR NOT (SELECT relforcerowsecurity FROM pg_class WHERE oid='public.analisis_pases_detalle'::regclass) THEN
    RAISE EXCEPTION 'RLS/FORCE RLS no coincide con la configuración auditada.';
  END IF;
  IF to_regclass('analisis_privado.respaldo_permisos_20261101') IS NOT NULL
     OR to_regprocedure('public.puede_administrar_analisis()') IS NOT NULL
     OR to_regprocedure('public.eliminar_partido_deportivo_seguro(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'Migración ya aplicada u objetos inesperados; no continuar.';
  END IF;
  IF md5(pg_get_functiondef('public.guardar_detalle_pase(uuid,text,uuid,bigint)'::regprocedure)) <> '40a9917e10d7c87dcf14d06b1a4e10b1'
     OR md5(pg_get_functiondef('public.guardar_destino_pase(uuid,double precision,double precision,bigint)'::regprocedure)) <> '9e44772fe9c7dd2c01ae7a7e4829c9a8' THEN
    RAISE EXCEPTION 'Las RPC desplegadas cambiaron desde la revisión; revisar antes de reemplazar.';
  END IF;
  IF (SELECT count(*) FROM auth.users u WHERE u.id IN ('f7562d52-a16a-48b5-95a0-efbcc70080d3'::uuid,'b2c65c50-8772-45a4-b2e0-c0e53c66253b'::uuid)
      AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until <= now())
      AND (SELECT count(*) FROM public.perfiles p WHERE lower(p.email)=lower(u.email))=1
      AND EXISTS (SELECT 1 FROM public.perfiles p WHERE lower(p.email)=lower(u.email) AND lower(p.rol)='coordinacion')) <> 2 THEN
    RAISE EXCEPTION 'Las dos identidades deben existir, tener correo confirmado y un único perfil de Coordinación.';
  END IF;
  IF to_regprocedure('public.guardar_detalle_pase(uuid,text,uuid,bigint)') IS NULL OR
     to_regprocedure('public.guardar_destino_pase(uuid,double precision,double precision,bigint)') IS NULL THEN
    RAISE EXCEPTION 'Faltan RPC de pases esperadas.';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('analisis_eventos','analisis_partidos'))<>8
     OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename IN ('analisis_eventos','analisis_partidos') AND policyname NOT IN ('analisis_eventos_read','analisis_eventos_insert_admin','analisis_eventos_update_admin','analisis_eventos_delete_admin','analisis_partidos_read','analisis_partidos_insert_admin','analisis_partidos_update_admin','analisis_partidos_delete_admin'))
     OR (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='analisis_pases_detalle')<>1 THEN
    RAISE EXCEPTION 'Inventario de políticas distinto del auditado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.analisis_partidos'::regclass AND confrelid='public.partidos'::regclass AND contype='f' AND confdeltype='n') THEN
    RAISE EXCEPTION 'No coincide el vínculo deportivo ON DELETE SET NULL.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.analisis_eventos'::regclass AND tgname='proteger_evento_con_detalle' AND tgenabled='O') THEN
    RAISE EXCEPTION 'Falta trigger de consistencia de pases.';
  END IF;
END;
$preflight$;

LOCK TABLE public.partidos, public.analisis_partidos, public.analisis_eventos, public.analisis_pases_detalle IN SHARE ROW EXCLUSIVE MODE;

-- Respaldo de metadatos para reversión exacta: privado, no contiene registros deportivos.
CREATE TABLE analisis_privado.respaldo_permisos_20261101 (orden integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, sentencia text NOT NULL);
REVOKE ALL ON analisis_privado.respaldo_permisos_20261101 FROM PUBLIC, anon, authenticated;
INSERT INTO analisis_privado.respaldo_permisos_20261101(sentencia)
SELECT format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',policyname,schemaname,tablename,permissive,cmd,
  (SELECT string_agg(quote_ident(r),', ') FROM unnest(roles) r),
  CASE WHEN qual IS NULL THEN '' ELSE ' USING ('||qual||')' END,
  CASE WHEN with_check IS NULL THEN '' ELSE ' WITH CHECK ('||with_check||')' END)
FROM pg_policies WHERE schemaname='public' AND tablename IN ('analisis_partidos','analisis_eventos','analisis_pases_detalle') ORDER BY tablename,policyname;
INSERT INTO analisis_privado.respaldo_permisos_20261101(sentencia)
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE oid IN ('public.guardar_detalle_pase(uuid,text,uuid,bigint)'::regprocedure,'public.guardar_destino_pase(uuid,double precision,double precision,bigint)'::regprocedure);
INSERT INTO analisis_privado.respaldo_permisos_20261101(sentencia)
SELECT format('GRANT %s ON TABLE %I.%I TO %I%s;',privilege_type,table_schema,table_name,grantee,CASE WHEN is_grantable='YES' THEN ' WITH GRANT OPTION' ELSE '' END)
FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name IN ('analisis_eventos','analisis_partidos','analisis_pases_detalle') AND grantee IN ('anon','authenticated');

CREATE FUNCTION public.puede_administrar_analisis()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
 SELECT coalesce(auth.role()='authenticated' AND auth.uid() IN
  ('f7562d52-a16a-48b5-95a0-efbcc70080d3'::uuid,'b2c65c50-8772-45a4-b2e0-c0e53c66253b'::uuid)
  AND (SELECT count(*) FROM public.perfiles p JOIN auth.users u ON lower(p.email)=lower(u.email) WHERE u.id=auth.uid())=1
  AND EXISTS (SELECT 1 FROM auth.users u JOIN public.perfiles p ON lower(p.email)=lower(u.email)
    WHERE u.id=auth.uid() AND lower(p.rol)='coordinacion'
      AND (u.banned_until IS NULL OR u.banned_until<=now())),false);
$function$;
ALTER FUNCTION public.puede_administrar_analisis() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.puede_administrar_analisis() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.puede_administrar_analisis() TO authenticated;

DROP POLICY analisis_eventos_read ON public.analisis_eventos;
DROP POLICY analisis_eventos_insert_admin ON public.analisis_eventos;
DROP POLICY analisis_eventos_update_admin ON public.analisis_eventos;
DROP POLICY analisis_eventos_delete_admin ON public.analisis_eventos;
DROP POLICY analisis_partidos_read ON public.analisis_partidos;
DROP POLICY analisis_partidos_insert_admin ON public.analisis_partidos;
DROP POLICY analisis_partidos_update_admin ON public.analisis_partidos;
DROP POLICY analisis_partidos_delete_admin ON public.analisis_partidos;
DROP POLICY pases_detalle_lectura ON public.analisis_pases_detalle;

-- Sin dependencia del padre: evita recursividad con su política SELECT.
CREATE POLICY analisis_eventos_read ON public.analisis_eventos FOR SELECT TO authenticated
USING ((SELECT public.puede_administrar_analisis()) OR EXISTS (SELECT 1 FROM public.jugadores j WHERE j.id=analisis_eventos.jugador_id));
CREATE POLICY analisis_partidos_read ON public.analisis_partidos FOR SELECT TO authenticated
USING ((SELECT public.puede_administrar_analisis()) OR EXISTS (SELECT 1 FROM public.analisis_eventos e WHERE e.partido_id=analisis_partidos.id));
CREATE POLICY pases_detalle_lectura ON public.analisis_pases_detalle FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.analisis_eventos e WHERE e.id=analisis_pases_detalle.evento_id));
CREATE POLICY analisis_eventos_insert_admin ON public.analisis_eventos FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_administrar_analisis()));
CREATE POLICY analisis_eventos_update_admin ON public.analisis_eventos FOR UPDATE TO authenticated USING ((SELECT public.puede_administrar_analisis())) WITH CHECK ((SELECT public.puede_administrar_analisis()));
CREATE POLICY analisis_eventos_delete_admin ON public.analisis_eventos FOR DELETE TO authenticated USING ((SELECT public.puede_administrar_analisis()));
CREATE POLICY analisis_partidos_insert_admin ON public.analisis_partidos FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_administrar_analisis()));
CREATE POLICY analisis_partidos_update_admin ON public.analisis_partidos FOR UPDATE TO authenticated USING ((SELECT public.puede_administrar_analisis())) WITH CHECK ((SELECT public.puede_administrar_analisis()));
CREATE POLICY analisis_partidos_delete_admin ON public.analisis_partidos FOR DELETE TO authenticated USING ((SELECT public.puede_administrar_analisis()));
REVOKE ALL ON public.analisis_eventos, public.analisis_partidos FROM anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.analisis_eventos, public.analisis_partidos TO authenticated;
REVOKE ALL ON public.analisis_pases_detalle FROM anon, authenticated;
GRANT SELECT ON public.analisis_pases_detalle TO authenticated;

CREATE FUNCTION analisis_privado.proteger_borrado_partido_vinculado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
 IF EXISTS (SELECT 1 FROM public.analisis_partidos a WHERE a.partido_calendario_id=OLD.id)
    AND NOT public.puede_administrar_analisis() THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Solo los dos administradores de Análisis pueden eliminar un partido vinculado.';
 END IF;
 RETURN OLD;
END;
$function$;
REVOKE ALL ON FUNCTION analisis_privado.proteger_borrado_partido_vinculado() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER proteger_borrado_partido_vinculado BEFORE DELETE ON public.partidos FOR EACH ROW EXECUTE FUNCTION analisis_privado.proteger_borrado_partido_vinculado();

-- Una única transacción; conserva RLS de cada tabla. Nunca sustituir por varios requests.
CREATE FUNCTION analisis_privado.proteger_cliente_antiguo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
 IF TG_OP='UPDATE' AND NEW.partido_id IS NOT DISTINCT FROM OLD.partido_id THEN RETURN NEW; END IF;
 -- Barrera global de protocolo en operaciones destructivas: no depende de un
 -- análisis que pudiera crearse entre requests de un cliente antiguo.
 IF OLD.partido_id IS NOT NULL
    AND coalesce(current_setting('club.borrado_partido',true),'') <> OLD.partido_id::text
    AND coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-client-info' IS DISTINCT FROM 'club-comunicaciones/permisos-analisis-v2' THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Versión antigua: operación rechazada antes de modificar datos vinculados. Actualizá la aplicación.';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;
REVOKE ALL ON FUNCTION analisis_privado.proteger_cliente_antiguo() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER proteger_cliente_antiguo BEFORE DELETE ON public.citaciones FOR EACH ROW EXECUTE FUNCTION analisis_privado.proteger_cliente_antiguo();
CREATE TRIGGER proteger_cliente_antiguo BEFORE DELETE ON public.estadisticas_jugador FOR EACH ROW EXECUTE FUNCTION analisis_privado.proteger_cliente_antiguo();
CREATE TRIGGER proteger_cliente_antiguo BEFORE UPDATE OF partido_id OR DELETE ON public.videos FOR EACH ROW EXECUTE FUNCTION analisis_privado.proteger_cliente_antiguo();

CREATE FUNCTION public.eliminar_partido_deportivo_seguro(p_partido_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE v_id uuid;
BEGIN
 IF auth.uid() IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Se requiere una sesión autenticada.';
 END IF;
 SELECT p.id INTO v_id FROM public.partidos p WHERE p.id=p_partido_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Partido no disponible para eliminar.'; END IF;
 PERFORM set_config('club.borrado_partido',p_partido_id::text,true);
 DELETE FROM public.citaciones WHERE partido_id=p_partido_id;
 DELETE FROM public.estadisticas_jugador WHERE partido_id=p_partido_id;
 UPDATE public.videos SET partido_id=NULL WHERE partido_id=p_partido_id;
 DELETE FROM public.partidos WHERE id=p_partido_id RETURNING id INTO v_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='El permiso de eliminación no está disponible.'; END IF;
 RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.eliminar_partido_deportivo_seguro(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_partido_deportivo_seguro(uuid) TO authenticated;

-- Las definiciones completas de las RPC de pases siguen a continuación.

CREATE OR REPLACE FUNCTION public.guardar_detalle_pase(
    p_evento_id uuid,
    p_destinataria_estado text,
    p_destinataria_id uuid,
    p_revision_esperada bigint
)
RETURNS public.analisis_pases_detalle
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
    v_usuario uuid := auth.uid();
    v_evento public.analisis_eventos%ROWTYPE;
    v_detalle public.analisis_pases_detalle%ROWTYPE;
    v_existe boolean;
    v_ahora timestamptz;
BEGIN
    IF NOT public.puede_administrar_analisis() THEN
        RAISE EXCEPTION USING ERRCODE = '42501',
            MESSAGE = 'No tenes autorizacion para editar detalles de pases.';
    END IF;
    -- Las lecturas internas del trigger dependen de snapshots frescos.
    IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION USING ERRCODE = '0A000',
            MESSAGE = 'Guardar detalles requiere aislamiento READ COMMITTED.';
    END IF;
    IF p_evento_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Debes indicar una accion.';
    END IF;
    IF p_destinataria_estado IS NULL OR p_destinataria_estado NOT IN (
        'pendiente', 'identificada', 'desconocida', 'no_observable'
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Estado de destinataria invalido.';
    END IF;
    IF (p_destinataria_estado = 'identificada' AND p_destinataria_id IS NULL)
       OR (p_destinataria_estado <> 'identificada' AND p_destinataria_id IS NOT NULL) THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
            MESSAGE = 'La destinataria y su estado son incompatibles.';
    END IF;
    IF p_revision_esperada IS NOT NULL AND p_revision_esperada < 1 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Revision esperada invalida.';
    END IF;

    -- Siempre evento -> detalle. Nunca detalle -> evento.
    SELECT e.* INTO v_evento FROM public.analisis_eventos e
    WHERE e.id = p_evento_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'La accion ya no existe.';
    END IF;
    IF v_evento.tipo IS NULL OR v_evento.tipo NOT IN ('Pase correcto', 'Pase incorrecto') THEN
        RAISE EXCEPTION USING ERRCODE = '23514',
            MESSAGE = 'Solo los pases pueden tener este detalle.';
    END IF;
    IF p_destinataria_id IS NOT NULL THEN
        IF p_destinataria_id = v_evento.jugador_id THEN
            RAISE EXCEPTION USING ERRCODE = '23514',
                MESSAGE = 'La destinataria no puede ser la autora.';
        END IF;
        PERFORM 1 FROM public.jugadores j WHERE j.id = p_destinataria_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'La destinataria no existe.';
        END IF;
    END IF;

    SELECT d.* INTO v_detalle FROM public.analisis_pases_detalle d
    WHERE d.evento_id = p_evento_id FOR UPDATE;
    v_existe := FOUND;
    IF p_revision_esperada IS NULL THEN
        IF v_existe THEN
            RAISE EXCEPTION USING ERRCODE = '40001',
                MESSAGE = 'El detalle ya fue creado. Recargalo antes de guardar.';
        END IF;
    ELSE
        IF NOT v_existe OR v_detalle.revision <> p_revision_esperada THEN
            RAISE EXCEPTION USING ERRCODE = '40001',
                MESSAGE = 'El detalle cambio o ya no existe. Recargalo antes de guardar.';
        END IF;
    END IF;
    v_ahora := clock_timestamp();
    IF NOT v_existe THEN
        INSERT INTO public.analisis_pases_detalle (
            evento_id, destinataria_id, destinataria_estado, version_formato,
            revision, creado_en, actualizado_en, creado_por, actualizado_por
        ) VALUES (
            p_evento_id, p_destinataria_id, p_destinataria_estado, 1,
            1, v_ahora, v_ahora, v_usuario, v_usuario
        ) RETURNING * INTO v_detalle;
    ELSE
        UPDATE public.analisis_pases_detalle d SET
            destinataria_id = p_destinataria_id,
            destinataria_estado = p_destinataria_estado,
            revision = d.revision + 1,
            actualizado_en = v_ahora,
            actualizado_por = v_usuario
        WHERE d.evento_id = p_evento_id RETURNING d.* INTO v_detalle;
    END IF;
    RETURN v_detalle;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guardar_destino_pase(
    p_evento_id uuid,
    p_destino_x double precision,
    p_destino_y double precision,
    p_revision_esperada bigint
)
RETURNS public.analisis_pases_detalle
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
    v_usuario uuid := auth.uid();
    v_tipo text;
    v_detalle public.analisis_pases_detalle%ROWTYPE;
    v_existe boolean;
    v_ahora timestamptz;
BEGIN
    IF NOT public.puede_administrar_analisis() THEN
        RAISE EXCEPTION USING ERRCODE = '42501',
            MESSAGE = 'No tenes autorizacion para guardar destinos de pases.';
    END IF;
    IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION USING ERRCODE = '0A000',
            MESSAGE = 'Guardar destinos requiere aislamiento READ COMMITTED.';
    END IF;
    IF p_evento_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Debes indicar una accion.';
    END IF;
    IF (p_destino_x IS NULL) <> (p_destino_y IS NULL) THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
            MESSAGE = 'El destino requiere ambas coordenadas o ambas NULL.';
    END IF;
    -- BETWEEN rechaza tambien NaN e infinitos en PostgreSQL.
    IF p_destino_x IS NOT NULL AND (
        NOT (p_destino_x BETWEEN 0 AND 100)
        OR NOT (p_destino_y BETWEEN 0 AND 100)
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
            MESSAGE = 'Las coordenadas de destino deben estar entre 0 y 100.';
    END IF;
    IF p_revision_esperada IS NOT NULL AND p_revision_esperada < 1 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Revision esperada invalida.';
    END IF;

    -- Mismo orden que guardar_detalle_pase y borrado en cascada: evento -> detalle.
    SELECT e.tipo INTO v_tipo FROM public.analisis_eventos e
    WHERE e.id = p_evento_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'La accion ya no existe.';
    END IF;
    IF v_tipo IS NULL OR v_tipo NOT IN ('Pase correcto', 'Pase incorrecto') THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'La accion debe ser un pase.';
    END IF;

    SELECT d.* INTO v_detalle FROM public.analisis_pases_detalle d
    WHERE d.evento_id = p_evento_id FOR UPDATE;
    v_existe := FOUND;
    IF p_revision_esperada IS NULL THEN
        IF v_existe THEN
            RAISE EXCEPTION USING ERRCODE = '40001',
                MESSAGE = 'El detalle ya existe. Recarga su revision antes de guardar.';
        END IF;
        IF p_destino_x IS NULL THEN
            RAISE EXCEPTION USING ERRCODE = '22023',
                MESSAGE = 'No existe un detalle con destino para quitar.';
        END IF;
    ELSE
        IF NOT v_existe OR v_detalle.revision <> p_revision_esperada THEN
            RAISE EXCEPTION USING ERRCODE = '40001',
                MESSAGE = 'El detalle cambio o ya no existe. Recarga antes de guardar.';
        END IF;
    END IF;
    v_ahora := clock_timestamp();
    IF NOT v_existe THEN
        INSERT INTO public.analisis_pases_detalle (
            evento_id, destinataria_estado, destinataria_id, version_formato, revision,
            destino_x, destino_y, creado_en, actualizado_en, creado_por, actualizado_por
        ) VALUES (
            p_evento_id, 'pendiente', NULL, 1, 1,
            p_destino_x, p_destino_y, v_ahora, v_ahora, v_usuario, v_usuario
        ) RETURNING * INTO v_detalle;
    ELSE
        -- No se toca destinataria, origen, tipo, periodo, segundo ni version.
        UPDATE public.analisis_pases_detalle d SET
            destino_x = p_destino_x,
            destino_y = p_destino_y,
            revision = d.revision + 1,
            actualizado_en = v_ahora,
            actualizado_por = v_usuario
        WHERE d.evento_id = p_evento_id RETURNING d.* INTO v_detalle;
    END IF;
    RETURN v_detalle;
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_detalle_pase(uuid,text,uuid,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_detalle_pase(uuid,text,uuid,bigint) TO authenticated;
REVOKE ALL ON FUNCTION public.guardar_destino_pase(uuid,double precision,double precision,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_destino_pase(uuid,double precision,double precision,bigint) TO authenticated;
-- Huella privada: la reversión se detiene ante cualquier deriva de permisos/objetos.
CREATE TABLE analisis_privado.manifiesto_permisos_20261101 (huella text NOT NULL, respaldo text NOT NULL);
REVOKE ALL ON analisis_privado.manifiesto_permisos_20261101 FROM PUBLIC,anon,authenticated;
INSERT INTO analisis_privado.manifiesto_permisos_20261101
SELECT (SELECT md5(coalesce(string_agg(v, E'\n' ORDER BY v),'')) FROM (
 SELECT row_to_json(p)::text AS v FROM pg_policies p WHERE schemaname='public' AND tablename IN ('analisis_partidos','analisis_eventos','analisis_pases_detalle','partidos','citaciones','estadisticas_jugador','videos','jugadores')
 UNION ALL SELECT concat('function:',p.oid::regprocedure,':',pg_get_functiondef(p.oid),':',p.proacl::text,':',p.proowner) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' AND p.proname IN ('puede_administrar_analisis','guardar_detalle_pase','guardar_destino_pase','eliminar_partido_deportivo_seguro')) OR n.nspname='analisis_privado'
 UNION ALL SELECT concat('table:',c.oid::regclass,':',c.relrowsecurity,':',c.relforcerowsecurity,':',c.relacl::text) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('analisis_partidos','analisis_eventos','analisis_pases_detalle','partidos','citaciones','estadisticas_jugador','videos','jugadores')
 UNION ALL SELECT concat('trigger:',t.tgrelid::regclass,':',pg_get_triggerdef(t.oid),':',t.tgenabled) FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgrelid IN ('public.analisis_partidos'::regclass,'public.analisis_eventos'::regclass,'public.analisis_pases_detalle'::regclass,'public.partidos'::regclass,'public.citaciones'::regclass,'public.estadisticas_jugador'::regclass,'public.videos'::regclass)
 UNION ALL SELECT concat('constraint:',c.conrelid::regclass,':',c.conname,':',pg_get_constraintdef(c.oid)) FROM pg_constraint c WHERE c.conrelid IN ('public.analisis_partidos'::regclass,'public.analisis_eventos'::regclass,'public.analisis_pases_detalle'::regclass,'public.partidos'::regclass,'public.citaciones'::regclass,'public.estadisticas_jugador'::regclass,'public.videos'::regclass)
) AS inventario), (SELECT md5(string_agg(sentencia,E'\n' ORDER BY orden)) FROM analisis_privado.respaldo_permisos_20261101);
COMMIT;
