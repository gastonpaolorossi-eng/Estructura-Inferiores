-- SOLO REVERSIÓN MANUAL REVISADA. Restaura permisos anteriores, más amplios en lectura.
-- No ejecutar automáticamente ante un error ni con cambios posteriores sin revisar.
-- Requiere React compatible retirado o detenido. Restaurar permisos amplios es una decisión explícita.
-- Ejecutar en la MISMA conexión: SET club.aprobar_reversion_amplia='SI_REVISADO';
-- Nunca ejecutar como respuesta automática a un fallo. Un fallo deja toda la transacción sin aplicar.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.partidos, public.analisis_partidos, public.analisis_eventos, public.analisis_pases_detalle IN SHARE ROW EXCLUSIVE MODE;
DO $deriva$
DECLARE actual text; copia text;
BEGIN
 IF current_user <> 'postgres' OR current_setting('club.aprobar_reversion_amplia',true) IS DISTINCT FROM 'SI_REVISADO' THEN
  RAISE EXCEPTION 'Reversión no aprobada explícitamente: restauraría permisos anteriores más amplios.';
 END IF;
 SELECT (SELECT md5(coalesce(string_agg(v, E'\n' ORDER BY v),'')) FROM (
 SELECT row_to_json(p)::text AS v FROM pg_policies p WHERE schemaname='public' AND tablename IN ('analisis_partidos','analisis_eventos','analisis_pases_detalle','partidos','citaciones','estadisticas_jugador','videos','jugadores')
 UNION ALL SELECT concat('function:',p.oid::regprocedure,':',pg_get_functiondef(p.oid),':',p.proacl::text,':',p.proowner) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' AND p.proname IN ('puede_administrar_analisis','guardar_detalle_pase','guardar_destino_pase','eliminar_partido_deportivo_seguro')) OR n.nspname='analisis_privado'
 UNION ALL SELECT concat('table:',c.oid::regclass,':',c.relrowsecurity,':',c.relforcerowsecurity,':',c.relacl::text) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('analisis_partidos','analisis_eventos','analisis_pases_detalle','partidos','citaciones','estadisticas_jugador','videos','jugadores')
 UNION ALL SELECT concat('trigger:',t.tgrelid::regclass,':',pg_get_triggerdef(t.oid),':',t.tgenabled) FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgrelid IN ('public.analisis_partidos'::regclass,'public.analisis_eventos'::regclass,'public.analisis_pases_detalle'::regclass,'public.partidos'::regclass,'public.citaciones'::regclass,'public.estadisticas_jugador'::regclass,'public.videos'::regclass)
 UNION ALL SELECT concat('constraint:',c.conrelid::regclass,':',c.conname,':',pg_get_constraintdef(c.oid)) FROM pg_constraint c WHERE c.conrelid IN ('public.analisis_partidos'::regclass,'public.analisis_eventos'::regclass,'public.analisis_pases_detalle'::regclass,'public.partidos'::regclass,'public.citaciones'::regclass,'public.estadisticas_jugador'::regclass,'public.videos'::regclass)
) AS inventario) INTO actual;
 SELECT md5(string_agg(sentencia,E'\n' ORDER BY orden)) INTO copia FROM analisis_privado.respaldo_permisos_20261101;
 IF NOT EXISTS (SELECT 1 FROM analisis_privado.manifiesto_permisos_20261101 WHERE huella=actual AND respaldo=copia) THEN
  RAISE EXCEPTION 'Deriva detectada: revisar manualmente políticas, funciones, triggers, restricciones y permisos. Nada se revierte.';
 END IF;
END;
$deriva$;
DO $rollback$
DECLARE r record;
BEGIN
 IF current_user<>'postgres' OR to_regclass('analisis_privado.respaldo_permisos_20261101') IS NULL THEN
   RAISE EXCEPTION 'Requiere postgres y respaldo de esta migración.';
 END IF;
 -- La huella anterior exige el inventario exacto de esta entrega; una política ajena impide llegar aquí.
 FOR r IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename IN ('analisis_eventos','analisis_partidos','analisis_pases_detalle') LOOP
   EXECUTE format('DROP POLICY %I ON %I.%I',r.policyname,r.schemaname,r.tablename);
 END LOOP;
 REVOKE ALL ON public.analisis_eventos,public.analisis_partidos,public.analisis_pases_detalle FROM anon,authenticated;
 FOR r IN SELECT sentencia FROM analisis_privado.respaldo_permisos_20261101 ORDER BY orden LOOP
   EXECUTE r.sentencia;
 END LOOP;
END;
$rollback$;
DROP TRIGGER proteger_cliente_antiguo ON public.citaciones;
DROP TRIGGER proteger_cliente_antiguo ON public.estadisticas_jugador;
DROP TRIGGER proteger_cliente_antiguo ON public.videos;
DROP FUNCTION analisis_privado.proteger_cliente_antiguo();
DROP TRIGGER proteger_borrado_partido_vinculado ON public.partidos;
DROP FUNCTION analisis_privado.proteger_borrado_partido_vinculado();
DROP FUNCTION public.eliminar_partido_deportivo_seguro(uuid);
DROP FUNCTION public.puede_administrar_analisis();
DROP TABLE analisis_privado.manifiesto_permisos_20261101;
DROP TABLE analisis_privado.respaldo_permisos_20261101;
COMMIT;
