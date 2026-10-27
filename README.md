# Verbum — Bíblia e vida católica

Aplicativo web (React + TypeScript + Tailwind + Supabase) para ler a Bíblia, guardar versículos,
organizar coleções e notas, e acompanhar a constância de leitura ("Minha caminhada").

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # checa tipos e gera dist/
npm test           # testes unitários (vitest)
```

O app já aponta para o projeto Supabase do Verbum (valores padrão em `src/lib/supabase.ts`).
Para usar outro projeto, copie `.env.example` para `.env.local` e ajuste as duas variáveis.
A chave `publishable` é pública por desenho: a segurança está nas políticas RLS do banco.

## Publicar (Vercel)

Importe a pasta na Vercel (framework Vite, build `npm run build`, saída `dist`).
`vercel.json` já redireciona todas as rotas para `index.html`.

## Estrutura

```
src/
  lib/        supabase, auth, preferências, dados (react-query), referência bíblica, caminhada
  components/ layout, cartão de versículo, notas, coleções, UI básica
  pages/      Home, Bíblia, Capítulo, Explorar, Favoritos, Perfil, Caminhada, Católica, Sobre
  test/       testes unitários + fixture dos 73 livros
e2e/          teste de navegador (Playwright, Python) com backend simulado
```

## Banco de dados (Supabase / Lovable Cloud)

Tabelas: `books`, `verses`, `themes`, `verse_themes`, `editorial_reflections`, `profiles`,
`favorites`, `collections`, `collection_items`, `notes`, `reading_history`, `activity_types`,
`activity_logs`, `practice_days`, `reading_plans`, `reading_plan_progress`.
Funções: `get_walk()`, `get_streak()`, `set_practice_activity()`. RLS em todas as tabelas.

## Texto bíblico

Hoje: Douay-Rheims (Challoner), inglês, 35.804 versículos, numeração da Vulgata — **texto de teste**.
Origem e limites: veja `/sobre` no app. Deve ser trocado por uma tradução em português com licença.

## Pendências conhecidas

- Tradução em português licenciada (e mapeamento da numeração dos Salmos para o padrão brasileiro).
- Área Católica: notícias, "Entenda a Igreja", santo do dia, liturgia diária e igrejas de Rio Preto
  (hoje mostram "Em breve"; dependem de fontes e conteúdo verificados).
- Painel administrativo (com papéis em tabela própria) e planos de leitura reais.
- Compartilhar versículo como imagem.
- Excluir conta (exige função de servidor).
- Confirmação de e-mail: o link enviado pelo Supabase usa o "Site URL" configurado no projeto de autenticação.
