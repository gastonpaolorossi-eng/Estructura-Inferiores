-- Preparada para revision. NO aplicada a Supabase.
-- Requiere analisis_pases_detalle y guardar_detalle_pase ya instalados.
-- No modificar ni volver a ejecutar la migracion inicial.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
DECLARE
    v_col record;
    v_rol text;
    v_detalle regclass := to_regclass('public.analisis_pases_detalle');
BEGIN
    IF current_user <> 'postgres' OR NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_roles
        WHERE rolname = current_user AND (rolsuper OR rolbypassrls)
    ) THEN
        RAISE EXCEPTION 'Aplicar como postgres con BYPASSRLS o superusuario.';
    END IF;
    IF v_detalle IS NULL THEN
        RAISE EXCEPTION 'Falta la tabla analisis_pases_detalle.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_class
        WHERE oid = v_detalle AND relkind = 'r' AND relrowsecurity
          AND relforcerowsecurity AND relowner = current_user::regrole
    ) THEN
        RAISE EXCEPTION 'Se requiere tabla de detalles propiedad de postgres, con RLS y FORCE RLS.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute
        WHERE attrelid = v_detalle AND NOT attisdropped
          AND attname IN ('destino_x', 'destino_y')
    ) OR EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'guardar_destino_pase'
    ) THEN
        RAISE EXCEPTION 'Destino o RPC ya existen: revisar antes de aplicar otra vez.';
    END IF;
    IF to_regprocedure('public.guardar_detalle_pase(uuid,text,uuid,bigint)') IS NULL
       OR to_regprocedure('auth.uid()') IS NULL
       OR to_regprocedure('auth.jwt()') IS NULL THEN
        RAISE EXCEPTION 'Faltan la RPC de destinatarias o funciones de autenticacion.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc
        WHERE oid = 'public.guardar_detalle_pase(uuid,text,uuid,bigint)'::regprocedure
          AND proowner = current_user::regrole AND prosecdef AND provolatile = 'v'
          AND prorettype = (SELECT reltype FROM pg_catalog.pg_class WHERE oid = v_detalle)
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_trigger t
        JOIN pg_catalog.pg_proc f ON f.oid = t.tgfoid
        JOIN pg_catalog.pg_namespace n ON n.oid = f.pronamespace
        WHERE t.tgrelid = 'public.analisis_eventos'::regclass
          AND t.tgname = 'proteger_evento_con_detalle'
          AND NOT t.tgisinternal AND t.tgenabled IN ('O', 'A')
          AND n.nspname = 'analisis_privado'
          AND f.proname = 'proteger_evento_con_detalle'
          AND f.prosecdef AND f.provolatile = 'v'
          AND f.proowner = current_user::regrole
    ) THEN
        RAISE EXCEPTION 'La RPC anterior o el trigger protector no tienen la configuracion esperada.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = 'f7562d52-a16a-48b5-95a0-efbcc70080d3'::uuid
    ) THEN
        RAISE EXCEPTION 'No existe el UUID autorizado.';
    END IF;
    IF NOT has_schema_privilege(current_user, 'auth', 'USAGE')
       OR NOT has_schema_privilege(current_user, 'public', 'USAGE')
       OR NOT has_function_privilege(current_user, 'auth.uid()', 'EXECUTE')
       OR NOT has_function_privilege(current_user, 'auth.jwt()', 'EXECUTE')
       OR NOT has_table_privilege(current_user, 'public.analisis_eventos', 'SELECT')
       OR NOT has_table_privilege(current_user, 'public.analisis_eventos', 'UPDATE') THEN
        RAISE EXCEPTION 'Faltan permisos SQL requeridos por la RPC de destino.';
    END IF;

    FOR v_col IN SELECT * FROM (VALUES
        ('analisis_pases_detalle', 'evento_id', 'uuid', false),
        ('analisis_pases_detalle', 'destinataria_id', 'uuid', true),
        ('analisis_pases_detalle', 'destinataria_estado', 'text', false),
        ('analisis_pases_detalle', 'revision', 'bigint', false),
        ('analisis_pases_detalle', 'version_formato', 'smallint', false),
        ('analisis_pases_detalle', 'creado_por', 'uuid', false),
        ('analisis_pases_detalle', 'actualizado_por', 'uuid', false),
        ('analisis_pases_detalle', 'creado_en', 'timestamp with time zone', false),
        ('analisis_pases_detalle', 'actualizado_en', 'timestamp with time zone', false),
        ('analisis_eventos', 'id', 'uuid', false),
        ('analisis_eventos', 'tipo', 'text', NULL),
        ('analisis_eventos', 'coordenada_x', 'double precision', true),
        ('analisis_eventos', 'coordenada_y', 'double precision', true)
    ) AS expected(tabla, columna, tipo, nullable)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = v_col.tabla
              AND c.column_name = v_col.columna
              AND (c.data_type = v_col.tipo OR
                  (v_col.tipo = 'text' AND c.data_type = 'character varying'))
              AND (v_col.nullable IS NULL OR
                  (c.is_nullable = 'YES') = v_col.nullable)
        ) THEN
            RAISE EXCEPTION 'Columna incompatible: %.%.', v_col.tabla, v_col.columna;
        END IF;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_constraint c
        JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid
            AND a.attname = 'evento_id' AND NOT a.attisdropped
        WHERE c.conrelid = v_detalle AND c.contype = 'p'
          AND c.conkey = ARRAY[a.attnum] AND c.convalidated
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_constraint c
        JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid
            AND a.attname = 'evento_id' AND NOT a.attisdropped
        JOIN pg_catalog.pg_attribute b ON b.attrelid = c.confrelid
            AND b.attname = 'id' AND NOT b.attisdropped
        WHERE c.conrelid = v_detalle AND c.contype = 'f' AND c.convalidated
          AND c.confrelid = 'public.analisis_eventos'::regclass
          AND c.conkey = ARRAY[a.attnum] AND c.confkey = ARRAY[b.attnum]
          AND c.confdeltype = 'c'
    ) THEN
        RAISE EXCEPTION 'Se requiere PK evento_id y FK hacia eventos.id con borrado en cascada.';
    END IF;

    FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF has_any_column_privilege(v_rol, v_detalle, 'INSERT')
           OR has_any_column_privilege(v_rol, v_detalle, 'UPDATE')
           OR has_table_privilege(v_rol, v_detalle, 'DELETE')
           OR has_table_privilege(v_rol, v_detalle, 'TRUNCATE') THEN
            RAISE EXCEPTION 'Escritura directa inesperada para %.', v_rol;
        END IF;
    END LOOP;
    IF NOT has_table_privilege('authenticated', v_detalle, 'SELECT') THEN
        RAISE EXCEPTION 'Falta permiso de lectura de detalles para authenticated.';
    END IF;
END;
$preflight$;

-- Sin DEFAULT ni backfill: todos los registros existentes conservan sus datos.
ALTER TABLE public.analisis_pases_detalle
    ADD COLUMN destino_x double precision,
    ADD COLUMN destino_y double precision,
    ADD CONSTRAINT pases_detalle_destino_check CHECK (
        (destino_x IS NULL AND destino_y IS NULL)
        OR (
            destino_x IS NOT NULL AND destino_y IS NOT NULL
            AND destino_x BETWEEN 0 AND 100
            AND destino_y BETWEEN 0 AND 100
        )
    );

COMMENT ON COLUMN public.analisis_pases_detalle.destino_x IS
    'Final observado, X porcentual [0,100], misma referencia que el origen. No invertir por periodo.';
COMMENT ON COLUMN public.analisis_pases_detalle.destino_y IS
    'Final observado, Y porcentual [0,100], misma referencia que el origen. NULL junto con destino_x.';

CREATE FUNCTION public.guardar_destino_pase(
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
    IF v_usuario IS DISTINCT FROM 'f7562d52-a16a-48b5-95a0-efbcc70080d3'::uuid
       OR (auth.jwt() ->> 'role') IS DISTINCT FROM 'authenticated' THEN
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

ALTER FUNCTION public.guardar_destino_pase(uuid, double precision, double precision, bigint)
    OWNER TO postgres;
REVOKE ALL ON FUNCTION public.guardar_destino_pase(uuid, double precision, double precision, bigint)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_destino_pase(uuid, double precision, double precision, bigint)
    TO authenticated;

DO $permissions$
DECLARE v_rol text;
BEGIN
    FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF has_any_column_privilege(v_rol, 'public.analisis_pases_detalle', 'INSERT')
           OR has_any_column_privilege(v_rol, 'public.analisis_pases_detalle', 'UPDATE')
           OR has_table_privilege(v_rol, 'public.analisis_pases_detalle', 'DELETE')
           OR has_table_privilege(v_rol, 'public.analisis_pases_detalle', 'TRUNCATE') THEN
            RAISE EXCEPTION 'Permisos efectivos inesperados para %.', v_rol;
        END IF;
    END LOOP;
    IF has_function_privilege('anon',
        'public.guardar_destino_pase(uuid,double precision,double precision,bigint)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated',
        'public.guardar_destino_pase(uuid,double precision,double precision,bigint)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Permisos de ejecucion de la RPC incompatibles.';
    END IF;
END;
$permissions$;

NOTIFY pgrst, 'reload schema';
COMMIT;
