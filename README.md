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
