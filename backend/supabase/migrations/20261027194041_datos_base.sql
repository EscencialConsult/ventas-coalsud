-- Datos base REALES, en todos los entornos (Datos Iniciales §1, §4.1 paso 1). Nada de prueba:
-- los datos de prueba van en supabase/seeds/ y solo corren en local (db reset).

-- Regionales y su almacén: el código es el prefijo de la numeración y queda fijo desde el día 1.
insert into public.regional (codigo, nombre) values
  ('LP', 'La Paz'),
  ('CBBA', 'Cochabamba'),
  ('SCZ', 'Santa Cruz');

insert into public.almacen (regional_id, nombre)
select r.id, 'Almacén ' || r.nombre from public.regional r;

-- Condiciones de pago (⚠ SUP-25).
insert into public.condicion_pago (orden, nombre, tipo, dias) values
  (1, 'Contado', 'contado', 0),
  (2, 'Crédito 15 días', 'credito', 15),
  (3, 'Crédito 30 días', 'credito', 30),
  (4, 'Crédito 60 días', 'credito', 60),
  (5, 'Crédito 90 días', 'credito', 90);

-- Líneas comerciales en el orden de la planilla F3 (⚠ SUP-43).
insert into public.linea_comercial (orden, nombre) values
  (1, 'COMRURAL'),
  (2, 'ASOVITA'),
  (3, 'LA Y SAA'),
  (4, 'IPEL'),
  (5, 'SULINO'),
  (6, 'ALCAFOOD'),
  (7, 'PLASTIOLED'),
  (8, 'KADO'),
  (9, 'COMRURAL GRANEL'),
  (10, 'HUGGIES'),
  (11, 'BITS CREAM'),
  (12, 'CONGELADOS');
