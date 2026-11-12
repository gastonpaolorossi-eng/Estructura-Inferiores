-- Comunicaciones: analisis avanzado de pases, version 3.
-- APLICACION MANUAL PENDIENTE DE APROBACION. No ejecutar mediante db push.
-- Aplicacion unica y atomica. No modifica filas ni politicas de tablas existentes.
-- Antes: ejecutar supabase/verification/analisis_pases_detalle.sql (seccion A).
BEGIN;

-- Fallar en lugar de esperar indefinidamente por transacciones de la aplicacion.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
DECLARE
    v_col record;
    v_rel regclass;
    v_att smallint;
    v_target_att smallint;
BEGIN
    IF current_user <> 'postgres' OR NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_roles
        WHERE rolname = current_user AND (rolsuper OR rolbypassrls)
    ) THEN
        RAISE EXCEPTION 'Aplicar como postgres con BYPASSRLS o superusuario.';
    END IF;

    IF to_regclass('public.analisis_pases_detalle') IS NOT NULL THEN
        RAISE EXCEPTION 'analisis_pases_detalle ya existe: no aplicar de nuevo.';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'analisis_privado')
       OR EXISTS (
           SELECT 1 FROM pg_catalog.pg_proc p
           JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'guardar_detalle_pase'
       ) THEN
        RAISE EXCEPTION 'Ya existen objetos de una version anterior; revisar antes de continuar.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
       OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        RAISE EXCEPTION 'Faltan los roles de Supabase.';
    END IF;
    IF to_regprocedure('auth.uid()') IS NULL
       OR to_regprocedure('auth.role()') IS NULL THEN
        RAISE EXCEPTION 'Faltan auth.uid() o auth.role().';
    END IF;
    -- BYPASSRLS no concede permisos SQL sobre esquemas, funciones o tablas.
    IF NOT has_schema_privilege(current_user, 'public', 'USAGE')
       OR NOT has_schema_privilege(current_user, 'auth', 'USAGE')
       OR NOT has_function_privilege(current_user, 'auth.uid()', 'EXECUTE')
       OR NOT has_function_privilege(current_user, 'auth.role()', 'EXECUTE') THEN
        RAISE EXCEPTION 'postgres carece de permisos requeridos sobre public/auth.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = 'f7562d52-a16a-48b5-95a0-efbcc70080d3'::uuid
    ) THEN
        RAISE EXCEPTION 'No existe la cuenta UUID autorizada.';
    END IF;

    FOR v_col IN
        SELECT * FROM (VALUES
            ('analisis_eventos', 'id', 'uuid'),
            ('analisis_eventos', 'partido_id', 'uuid'),
            ('analisis_eventos', 'jugador_id', 'uuid'),
            ('analisis_eventos', 'tipo', 'text'),
            ('analisis_eventos', 'segundo', 'integer'),
            ('analisis_eventos', 'periodo', 'smallint'),
            ('analisis_eventos', 'coordenada_x', 'double precision'),
            ('analisis_eventos', 'coordenada_y', 'double precision'),
            ('analisis_partidos', 'id', 'uuid'),
            ('analisis_partidos', 'direccion_primer_tiempo', 'text'),
            ('jugadores', 'id', 'uuid')
        ) AS expected(tabla, columna, tipo)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = v_col.tabla
              AND c.column_name = v_col.columna
              AND (c.data_type = v_col.tipo OR (
                  v_col.tipo = 'text' AND c.data_type = 'character varying'
              ))
        ) THEN
            RAISE EXCEPTION 'Columna ausente o tipo incompatible: %.% (esperado %).',
                v_col.tabla, v_col.columna, v_col.tipo;
        END IF;
    END LOOP;

    FOREACH v_rel IN ARRAY ARRAY[
        'public.analisis_eventos'::regclass,
        'public.analisis_partidos'::regclass,
        'public.jugadores'::regclass
    ] LOOP
        IF NOT has_table_privilege(current_user, v_rel, 'SELECT') THEN
            RAISE EXCEPTION 'postgres requiere SELECT sobre %.', v_rel;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_catalog.pg_class
            WHERE oid = v_rel AND relkind = 'r' AND relrowsecurity
        ) THEN
            RAISE EXCEPTION 'Se requiere tabla ordinaria con RLS: %.', v_rel;
        END IF;
        SELECT attnum INTO v_att FROM pg_catalog.pg_attribute
        WHERE attrelid = v_rel AND attname = 'id' AND NOT attisdropped;
        IF NOT EXISTS (
            SELECT 1 FROM pg_catalog.pg_constraint
            WHERE conrelid = v_rel AND contype = 'p'
              AND conkey = ARRAY[v_att] AND convalidated
        ) THEN
            RAISE EXCEPTION 'Se requiere PK simple sobre %.id.', v_rel;
        END IF;
    END LOOP;

    -- SELECT FOR UPDATE de la RPC requiere UPDATE, ademas de SELECT.
    IF NOT has_table_privilege(current_user, 'public.analisis_eventos', 'UPDATE') THEN
        RAISE EXCEPTION 'postgres requiere UPDATE sobre analisis_eventos para bloquear filas.';
    END IF;

    FOR v_col IN SELECT * FROM (VALUES
        ('partido_id', 'public.analisis_partidos', true),
        ('jugador_id', 'public.jugadores', false)
    ) AS expected(columna, destino, cascada)
    LOOP
        SELECT attnum INTO v_att FROM pg_catalog.pg_attribute
        WHERE attrelid = 'public.analisis_eventos'::regclass
          AND attname = v_col.columna AND NOT attisdropped;
        SELECT attnum INTO v_target_att FROM pg_catalog.pg_attribute
        WHERE attrelid = v_col.destino::regclass AND attname = 'id'
          AND NOT attisdropped;
        IF NOT EXISTS (
            SELECT 1 FROM pg_catalog.pg_constraint
            WHERE conrelid = 'public.analisis_eventos'::regclass
              AND contype = 'f' AND convalidated
              AND conkey = ARRAY[v_att]
              AND confrelid = v_col.destino::regclass
              AND confkey = ARRAY[v_target_att]
              AND (NOT v_col.cascada OR confdeltype = 'c')
        ) THEN
            RAISE EXCEPTION 'FK incompatible: eventos.% -> % (cascada requerida: %).',
                v_col.columna, v_col.destino, v_col.cascada;
        END IF;
    END LOOP;
END;
$preflight$;

CREATE SCHEMA analisis_privado AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA analisis_privado FROM PUBLIC, anon, authenticated;

CREATE TABLE public.analisis_pases_detalle (
    evento_id uuid PRIMARY KEY,
    destinataria_id uuid,
    destinataria_estado text NOT NULL DEFAULT 'pendiente',
    version_formato smallint NOT NULL DEFAULT 1,
    revision bigint NOT NULL DEFAULT 1,
    creado_en timestamptz NOT NULL,
    actualizado_en timestamptz NOT NULL,
    creado_por uuid NOT NULL,
    actualizado_por uuid NOT NULL,
    CONSTRAINT pases_detalle_evento_fk FOREIGN KEY (evento_id)
        REFERENCES public.analisis_eventos (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT pases_detalle_destinataria_fk FOREIGN KEY (destinataria_id)
        REFERENCES public.jugadores (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT pases_detalle_estado_check CHECK (destinataria_estado IN (
        'pendiente', 'identificada', 'desconocida', 'no_observable'
    )),
    CONSTRAINT pases_detalle_destinataria_check CHECK (
        (destinataria_estado = 'identificada' AND destinataria_id IS NOT NULL)
        OR (destinataria_estado <> 'identificada' AND destinataria_id IS NULL)
    ),
    CONSTRAINT pases_detalle_version_check CHECK (version_formato = 1),
    CONSTRAINT pases_detalle_revision_check CHECK (revision >= 1)
);
ALTER TABLE public.analisis_pases_detalle OWNER TO postgres;
CREATE INDEX pases_detalle_destinataria_idx
    ON public.analisis_pases_detalle (destinataria_id)
    WHERE destinataria_id IS NOT NULL;

ALTER TABLE public.analisis_pases_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analisis_pases_detalle FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.analisis_pases_detalle
    FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.analisis_pases_detalle TO authenticated;

CREATE POLICY pases_detalle_lectura
ON public.analisis_pases_detalle FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.analisis_eventos e
    JOIN public.analisis_partidos p ON p.id = e.partido_id
    WHERE e.id = analisis_pases_detalle.evento_id
));

-- Funciona tambien para correcciones de autora. No bloquea filas del detalle:
-- la actualizacion ya bloquea el evento, punto de coordinacion con la RPC.
CREATE FUNCTION analisis_privado.proteger_evento_con_detalle()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_destinataria uuid;
BEGIN
    IF NEW.tipo IS NOT DISTINCT FROM OLD.tipo
       AND NEW.jugador_id IS NOT DISTINCT FROM OLD.jugador_id THEN
        RETURN NEW;
    END IF;
    IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION USING ERRCODE = '0A000',
            MESSAGE = 'Corregir tipo o autora requiere aislamiento READ COMMITTED.';
    END IF;
    SELECT d.destinataria_id INTO v_destinataria
    FROM public.analisis_pases_detalle d WHERE d.evento_id = OLD.id;
    IF NOT FOUND THEN RETURN NEW; END IF;
    IF NEW.tipo IS NULL OR NEW.tipo NOT IN ('Pase correcto', 'Pase incorrecto') THEN
        RAISE EXCEPTION USING ERRCODE = '23514',
            MESSAGE = 'La accion tiene detalle de pase y no puede cambiar a otro tipo.',
            HINT = 'La reclasificacion requiere resolver explicitamente el detalle.';
    END IF;
    IF v_destinataria IS NOT NULL AND NEW.jugador_id = v_destinataria THEN
        RAISE EXCEPTION USING ERRCODE = '23514',
            MESSAGE = 'La nueva autora coincide con la destinataria del pase.',
            HINT = 'Corregi primero la destinataria y despues la autora.';
    END IF;
    RETURN NEW;
END;
$function$;
ALTER FUNCTION analisis_privado.proteger_evento_con_detalle() OWNER TO postgres;
REVOKE ALL ON FUNCTION analisis_privado.proteger_evento_con_detalle()
    FROM PUBLIC, anon, authenticated;
CREATE TRIGGER proteger_evento_con_detalle
BEFORE UPDATE OF tipo, jugador_id ON public.analisis_eventos
FOR EACH ROW EXECUTE FUNCTION analisis_privado.proteger_evento_con_detalle();

-- Unica ruta de escritura de la aplicacion. NULL = crear; N = revision leida.
-- No acepta evento_id de reemplazo, auditoria ni revision nueva del cliente.
CREATE FUNCTION public.guardar_detalle_pase(
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
    IF auth.role() IS DISTINCT FROM 'authenticated'
       OR v_usuario IS DISTINCT FROM 'f7562d52-a16a-48b5-95a0-efbcc70080d3'::uuid THEN
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
ALTER FUNCTION public.guardar_detalle_pase(uuid, text, uuid, bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.guardar_detalle_pase(uuid, text, uuid, bigint)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_detalle_pase(uuid, text, uuid, bigint)
    TO authenticated;

-- Verificar permisos efectivos, incluyendo herencia de roles y ACL por defecto.
-- Cualquier diferencia revierte toda la migracion; no se corrigen roles existentes.
DO $permissions$
DECLARE
    v_rol text;
BEGIN
    FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF has_any_column_privilege(v_rol, 'public.analisis_pases_detalle', 'INSERT')
           OR has_any_column_privilege(v_rol, 'public.analisis_pases_detalle', 'UPDATE')
           OR has_table_privilege(v_rol, 'public.analisis_pases_detalle', 'DELETE')
           OR has_table_privilege(v_rol, 'public.analisis_pases_detalle', 'TRUNCATE')
           OR has_function_privilege(v_rol,
               'analisis_privado.proteger_evento_con_detalle()', 'EXECUTE') THEN
            RAISE EXCEPTION 'Permisos efectivos inesperados para %.', v_rol;
        END IF;
    END LOOP;
    IF has_any_column_privilege('anon', 'public.analisis_pases_detalle', 'SELECT')
       OR has_function_privilege('anon',
           'public.guardar_detalle_pase(uuid,text,uuid,bigint)', 'EXECUTE')
       OR NOT has_table_privilege('authenticated', 'public.analisis_pases_detalle', 'SELECT')
       OR NOT has_function_privilege('authenticated',
           'public.guardar_detalle_pase(uuid,text,uuid,bigint)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Permisos efectivos de lectura/RPC incompatibles.';
    END IF;
END;
$permissions$;

-- Refrescar el catalogo de la API tras confirmar la transaccion.
NOTIFY pgrst, 'reload schema';
COMMIT;
