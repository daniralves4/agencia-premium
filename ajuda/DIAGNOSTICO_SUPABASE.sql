-- DIAGNÓSTICO SOMENTE LEITURA (não modifica tabelas ou dados)
-- Supabase > SQL Editor > New query > colar o conteúdo > Run.
-- Tire uma foto do resultado e envie para avaliar o problema de RLS.
-- IMPORTANTE: não desabilitar RLS e não adicionar políticas "USING (true)" para anon.

select
  t.table_schema,
  t.table_name,
  t.rowsecurity as rls_ativo,
  p.policyname,
  p.roles,
  p.cmd as operacao,
  p.qual as condicao_leitura,
  p.with_check as condicao_gravacao
from (
  select n.nspname as table_schema, c.relname as table_name, c.relrowsecurity as rowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p')
    and n.nspname = 'public'
    and c.relname in ('Tasks','AgendaEvents')
) as t
left join pg_policies p
  on p.schemaname = t.table_schema
 and p.tablename = t.table_name
order by t.table_name, p.policyname;
