-- SOLO LECTURA salvo la sección C (reversión). Ejecutar bloques por separado en el SQL Editor.

-- A. Antes de la migración: todos los tipos cargados deben estar entre los 16 del catálogo.
select tipo, count(*) as acciones,
       array_agg(distinct coalesce(resultado, '(vacío)')) as resultados_usados
from public.analisis_eventos
group by tipo order by tipo;

-- B. Después de la migración.
select count(*) as tipos from public.analisis_tipos_accion;                         -- 16
select conname from pg_constraint where conname = 'analisis_eventos_tipo_fk';       -- 1 fila
select policyname, cmd from pg_policies where tablename = 'analisis_tipos_accion';  -- 4 filas
select has_column_privilege('authenticated', 'public.analisis_tipos_accion', 'codigo', 'UPDATE')
  as puede_cambiar_codigo;                                                          -- false

-- C. Reversión (solo si hiciera falta).
-- begin;
-- alter table public.analisis_eventos drop constraint analisis_eventos_tipo_fk;
-- drop table public.analisis_tipos_accion;
-- drop function public.sellar_tipo_accion();
-- commit;
