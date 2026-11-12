-- Comunicaciones: tipos de acción configurables para la botonera de Análisis.
-- APLICACIÓN MANUAL desde el SQL Editor. Atómica: si algo falla no queda nada a medias.
-- Solo agrega: no modifica acciones, políticas existentes ni las funciones de pases.
-- Antes: consulta previa en supabase/verification/tipos_accion_configurables.sql (sección A).
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $pre$
begin
  if to_regclass('public.analisis_tipos_accion') is not null then
    raise exception 'analisis_tipos_accion ya existe: no aplicar de nuevo.';
  end if;
  if to_regprocedure('public.puede_administrar_analisis()') is null then
    raise exception 'Falta public.puede_administrar_analisis().';
  end if;
end $pre$;

create table public.analisis_tipos_accion (
  codigo text primary key check (char_length(codigo) between 1 and 60),
  etiqueta text not null check (char_length(btrim(etiqueta)) between 1 and 40),
  etiqueta_boton text not null check (char_length(btrim(etiqueta_boton)) between 1 and 16),
  icono text check (icono is null or char_length(icono) <= 2),
  color text not null default 'acento'
    check (color in ('acento', 'exito', 'peligro', 'alerta', 'info', 'neutro')),
  ubicacion text not null check (ubicacion in ('obligatoria', 'opcional')),
  resultados text[] not null default '{}'
    check (resultados <@ array['Exitoso','Fallido','Neutro','Gol','Atajada','Fuera','Bloqueado']::text[]),
  resultado_implicito text
    check (resultado_implicito in ('Exitoso','Fallido','Neutro','Gol','Atajada','Fuera','Bloqueado')),
  es_pase boolean not null default false,
  grupo text not null check (grupo in ('ofensiva', 'defensiva', 'arquera', 'pelota_parada', 'otras')),
  orden integer not null default 0,
  visible boolean not null default true,
  -- Solo letras a-y: la z deshace y los números eligen dorsal en la cola.
  atajo text check (atajo ~ '^[a-y]$'),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid default auth.uid(),
  constraint tipos_resultado_fijo_o_opciones
    check (resultado_implicito is null or cardinality(resultados) = 0),
  -- Versión 1: solo los dos pases actuales tienen receptora y destino.
  constraint tipos_pase_v1
    check (es_pase = (codigo in ('Pase correcto', 'Pase incorrecto')))
);
create unique index analisis_tipos_accion_atajo_unico
  on public.analisis_tipos_accion (atajo) where atajo is not null;

-- Mismos valores que CATALOGO_BASE en src/utils/analisis/catalogoAcciones.js.
insert into public.analisis_tipos_accion
  (codigo, etiqueta, etiqueta_boton, icono, color, ubicacion, resultados, resultado_implicito, es_pase, grupo, orden) values
  ('Pase correcto',     'Pase correcto',     'Pase +',       '↗', 'exito',   'obligatoria', '{}', 'Exitoso', true,  'ofensiva',       1),
  ('Pase incorrecto',   'Pase incorrecto',   'Pase −',       '↘', 'peligro', 'obligatoria', '{}', 'Fallido', true,  'ofensiva',       2),
  ('Pérdida',           'Pérdida',           'Pérdida',      '×', 'peligro', 'obligatoria', '{}', null,      false, 'ofensiva',       3),
  ('Recuperación',      'Recuperación',      'Recuperación', '↺', 'exito',   'obligatoria', '{}', null,      false, 'defensiva',      4),
  ('Remate',            'Remate',            'Remate',       '◎', 'acento',  'obligatoria', '{Gol,Atajada,Fuera,Bloqueado}', null, false, 'ofensiva', 5),
  ('Centro',            'Centro',            'Centro',       '⌁', 'acento',  'obligatoria', '{Exitoso,Fallido,Neutro}', null, false, 'ofensiva', 6),
  ('Duelo ofensivo',    'Duelo ofensivo',    'Duelo of.',    '⚔', 'acento',  'obligatoria', '{Exitoso,Fallido,Neutro}', null, false, 'ofensiva', 7),
  ('Duelo defensivo',   'Duelo defensivo',   'Duelo def.',   '◆', 'info',    'obligatoria', '{Exitoso,Fallido,Neutro}', null, false, 'defensiva', 8),
  ('Duelo aéreo',       'Duelo aéreo',       'Duelo aéreo',  '↑', 'info',    'obligatoria', '{Exitoso,Fallido,Neutro}', null, false, 'defensiva', 9),
  ('Atajada',           'Atajada',           'Atajada',      '⊙', 'exito',   'opcional',    '{}', null,      false, 'arquera',       10),
  ('Salida de arquera', 'Salida de arquera', 'Salida',       '↗', 'info',    'opcional',    '{}', null,      false, 'arquera',       11),
  ('Gol',               'Gol',               'Gol',          '⚽', 'acento',  'opcional',    '{}', null,      false, 'ofensiva',      12),
  ('Falta cometida',    'Falta cometida',    'Falta com.',   '!', 'peligro', 'obligatoria', '{}', null,      false, 'pelota_parada', 13),
  ('Falta recibida',    'Falta recibida',    'Falta rec.',   '+', 'exito',   'obligatoria', '{}', null,      false, 'pelota_parada', 14),
  ('Intercepción',      'Intercepción',      'Intercepción', '↯', 'info',    'obligatoria', '{}', null,      false, 'defensiva',     15),
  ('Despeje',           'Despeje',           'Despeje',      '⇧', 'info',    'obligatoria', '{Exitoso,Fallido,Neutro}', null, false, 'defensiva', 16);

do $tipos$
begin
  if exists (select 1 from public.analisis_eventos e
             where e.tipo is not null
               and not exists (select 1 from public.analisis_tipos_accion t where t.codigo = e.tipo)) then
    raise exception 'Hay acciones con un tipo fuera del catálogo. Revisá la consulta previa.';
  end if;
end $tipos$;

-- Impide borrar un tipo con acciones y cambiar su código.
alter table public.analisis_eventos
  add constraint analisis_eventos_tipo_fk foreign key (tipo)
  references public.analisis_tipos_accion (codigo) on update restrict on delete restrict;

create function public.sellar_tipo_accion() returns trigger
language plpgsql set search_path = '' as $f$
begin
  new.actualizado_en := now();
  new.actualizado_por := auth.uid();
  return new;
end $f$;
create trigger sellar_tipo_accion before update on public.analisis_tipos_accion
  for each row execute function public.sellar_tipo_accion();

alter table public.analisis_tipos_accion enable row level security;
alter table public.analisis_tipos_accion force row level security;
revoke all on public.analisis_tipos_accion from public, anon, authenticated;
grant select, insert, delete on public.analisis_tipos_accion to authenticated;
-- Todas las columnas menos el código.
grant update (etiqueta, etiqueta_boton, icono, color, ubicacion, resultados, resultado_implicito,
              grupo, orden, visible, atajo) on public.analisis_tipos_accion to authenticated;

create policy tipos_accion_lectura on public.analisis_tipos_accion
  for select to authenticated using (true);
create policy tipos_accion_alta on public.analisis_tipos_accion
  for insert to authenticated with check ((select public.puede_administrar_analisis()));
create policy tipos_accion_edicion on public.analisis_tipos_accion
  for update to authenticated
  using ((select public.puede_administrar_analisis()))
  with check ((select public.puede_administrar_analisis()));
create policy tipos_accion_baja on public.analisis_tipos_accion
  for delete to authenticated using ((select public.puede_administrar_analisis()));

commit;
