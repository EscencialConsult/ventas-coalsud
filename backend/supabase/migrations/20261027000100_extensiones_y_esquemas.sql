-- Extensiones, esquema app y privilegios por defecto (Esquema BD §0, Seguridad RLS §3.3).

create extension if not exists pg_trgm with schema extensions;

-- app: helpers y triggers. No se expone por la API (⚙ DT-02).
create schema app;
revoke all on schema app from public, anon, authenticated;

-- Las tablas nuevas de public no quedan accesibles para los roles de la API:
-- los grants se dan explícitos en la migración de RLS (Seguridad RLS §3.3).
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
