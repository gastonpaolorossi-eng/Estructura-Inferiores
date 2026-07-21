-- =========================================================
-- MEJORAS v8: posición libre (arrastrable) de los jugadores en la
-- cancha, en la pantalla de Formación de un partido. Antes cada
-- puesto tenía coordenadas fijas según la formación elegida (4-4-2,
-- etc); ahora esas coordenadas son solo el punto de partida y se
-- puede arrastrar cada ficha a donde el técnico quiera, por partido.
-- Correr en el SQL Editor de Supabase.
-- =========================================================

alter table citaciones add column if not exists pos_x numeric;
alter table citaciones add column if not exists pos_y numeric;
