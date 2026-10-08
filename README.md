# Agência Premium

Starter do sistema de gestão da Agência Premium.

## 1. Supabase
Crie um projeto NOVO no Supabase.
Abra SQL Editor e execute:
`supabase/01_estrutura_agencia_premium.sql`

Depois crie um bucket de Storage privado chamado:
`client-assets`

## 2. Variáveis
Copie `.env.example` para `.env` e preencha:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

## 3. Rodar
```bash
npm install
npm run dev
```

## Primeiros módulos
- Dashboard
- Clientes
- Conteúdo
- Campanhas
- Financeiro
- Tarefas
- Arquivos

## Atualização de legibilidade (08/10/2026)

- Em celulares, os tamanhos de **letra** foram aumentados em todos os módulos;
  o tamanho dos botões e o layout original foram mantidos.
- Mensagens de erro de RLS agora têm explicação em português. **O bloqueio do
  servidor não é removido pelo app:** não autorize gravações anônimas nem
  desative as proteções de dados sem configurar autenticação e políticas.
- Leia `ajuda/LEIA_PRIMEIRO.txt` e execute somente a consulta de diagnóstico
  `ajuda/DIAGNOSTICO_SUPABASE.sql` para verificar as políticas de Tarefas/Agenda.
- `netlify.toml` define o build Vite para deploy conectado a GitHub.
