-- SOLO LECTURA. Ejecutar bloques individualmente en SQL Editor.
-- No prueba escrituras, sesiones reales ni concurrencia.
-- A: guardar resultados ANTES y comparar DESPUES, sin actividad concurrente.
-- B: ejecutar solo DESPUES de aplicar la migracion autorizada.

-- A1. Linea base agregada: incluye todas las columnas sin exponer sus valores.
-- Los hashes deben ser identicos antes/despues; no son copias de respaldo.
SELECT 'analisis_eventos' AS tabla, count(*) AS cantidad,
       md5(coalesce(string_agg(to_jsonb(e)::text, E'\n' ORDER BY e.id), '')) AS huella
FROM public.analisis_eventos e
UNION ALL
SELECT 'analisis_partidos', count(*),
       md5(coalesce(string_agg(to_jsonb(p)::text, E'\n' ORDER BY p.id), ''))
FROM public.analisis_partidos p;

-- A2. Resultado esperado segun auditoria: 1 correcto, 3 incorrectos.
SELECT tipos.tipo, count(e.id) AS cantidad
FROM (VALUES ('Pase correcto'), ('Pase incorrecto')) tipos(tipo)
LEFT JOIN public.analisis_eventos e ON e.tipo = tipos.tipo
GROUP BY tipos.tipo ORDER BY tipos.tipo;

-- A3. Comparar literalmente antes/despues: ninguna politica debe cambiar.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('analisis_eventos', 'analisis_partidos', 'perfiles', 'jugadores')
ORDER BY tablename, policyname;

-- A4. Inventario previo. La tabla, funcion y schema nuevos deben estar ausentes.
SELECT to_regclass('public.analisis_pases_detalle') AS tabla,
       to_regprocedure('public.guardar_detalle_pase(uuid,text,uuid,bigint)') AS rpc,
       EXISTS (SELECT 1 FROM pg_catalog.pg_namespace
               WHERE nspname = 'analisis_privado') AS esquema_privado_existe;

-- B1. RLS y propietario: esperar true / true / postgres.
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) AS propietario
FROM pg_catalog.pg_class c
WHERE c.oid = 'public.analisis_pases_detalle'::regclass;

-- B2. PK, FK y CHECK. evento FK debe decir ON DELETE CASCADE.
SELECT conname, contype, convalidated, pg_get_constraintdef(oid, true) AS definicion
FROM pg_catalog.pg_constraint
WHERE conrelid = 'public.analisis_pases_detalle'::regclass
ORDER BY conname;

-- B3. Esperar solo una politica SELECT de la tabla nueva.
SELECT policyname, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public' AND tablename = 'analisis_pases_detalle';

-- B4. authenticated: SELECT true; INSERT/UPDATE/DELETE/TRUNCATE false.
-- anon: todos false. Incluye permisos heredados a nivel tabla.
SELECT r.rolname, r.rolbypassrls,
       has_table_privilege(r.oid, t.oid, 'SELECT') AS lectura,
       has_table_privilege(r.oid, t.oid, 'INSERT') AS alta,
       has_table_privilege(r.oid, t.oid, 'UPDATE') AS edicion,
       has_table_privilege(r.oid, t.oid, 'DELETE') AS borrado,
       has_table_privilege(r.oid, t.oid, 'TRUNCATE') AS truncado,
       has_any_column_privilege(r.oid, t.oid, 'INSERT') AS alta_alguna_columna,
       has_any_column_privilege(r.oid, t.oid, 'UPDATE') AS edicion_alguna_columna
FROM pg_catalog.pg_roles r
CROSS JOIN pg_catalog.pg_class t
WHERE t.oid = 'public.analisis_pases_detalle'::regclass
  AND r.rolname IN ('anon', 'authenticated') ORDER BY r.rolname;

-- B5. SECURITY DEFINER, VOLATILE ('v'), propietario y search_path seguro.
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS argumentos,
       p.prosecdef, p.provolatile, p.proconfig,
       pg_get_userbyid(p.proowner) AS propietario,
       r.rolsuper, r.rolbypassrls
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
WHERE (n.nspname = 'public' AND p.proname = 'guardar_detalle_pase')
   OR (n.nspname = 'analisis_privado' AND p.proname = 'proteger_evento_con_detalle');

-- B6. authenticated puede ejecutar solamente RPC; anon ninguna funcion.
SELECT r.rolname, n.nspname, p.proname,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') AS puede_ejecutar
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN pg_catalog.pg_roles r
WHERE r.rolname IN ('anon', 'authenticated')
  AND ((n.nspname = 'public' AND p.proname = 'guardar_detalle_pase')
    OR (n.nspname = 'analisis_privado' AND p.proname = 'proteger_evento_con_detalle'))
ORDER BY r.rolname, n.nspname;

-- B7. ACL explicitas. Ninguna entrada EXECUTE para PUBLIC (grantee = 0).
SELECT n.nspname, p.proname,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC'
            ELSE pg_get_userbyid(a.grantee) END AS beneficiario,
       a.privilege_type
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
WHERE (n.nspname = 'public' AND p.proname = 'guardar_detalle_pase')
   OR (n.nspname = 'analisis_privado' AND p.proname = 'proteger_evento_con_detalle');

-- B8. Trigger nuevo habilitado ('O'), sin modificar los existentes.
SELECT tgname, tgenabled, pg_get_triggerdef(oid, true) AS definicion
FROM pg_catalog.pg_trigger
WHERE tgrelid = 'public.analisis_eventos'::regclass AND NOT tgisinternal
ORDER BY tgname;

-- B9. Justo despues de migrar: cero detalles y cero inconsistencias.
SELECT count(*) AS detalles,
       count(*) FILTER (WHERE e.id IS NULL) AS eventos_huerfanos,
       count(*) FILTER (WHERE e.tipo IS NULL OR e.tipo NOT IN (
           'Pase correcto', 'Pase incorrecto'
       )) AS tipos_invalidos,
       count(*) FILTER (WHERE d.destinataria_id = e.jugador_id) AS autora_es_destinataria,
       count(*) FILTER (WHERE d.destinataria_id IS NOT NULL AND j.id IS NULL)
           AS destinatarias_inexistentes
FROM public.analisis_pases_detalle d
LEFT JOIN public.analisis_eventos e ON e.id = d.evento_id
LEFT JOIN public.jugadores j ON j.id = d.destinataria_id;

-- B10. Inspeccion del codigo instalado. No invoca la RPC ni escribe datos.
SELECT pg_get_functiondef('public.guardar_detalle_pase(uuid,text,uuid,bigint)'::regprocedure);
SELECT pg_get_functiondef('analisis_privado.proteger_evento_con_detalle()'::regprocedure);
