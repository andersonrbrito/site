# Anderson OS (painel)

Painel pessoal privado, hospedado no próprio site: `andersonbrito.com/painel/`. Detalhes: `AGENTS.md`, `docs/`.

## Ativar (uma vez)
1. Crie um projeto no Supabase. Em `painel/js/config.js` coloque a URL e a chave *publishable* (públicas por definição).
2. SQL Editor: rode `supabase/migrations/*.sql` na ordem; depois `supabase/seed-owner.example.sql` com o seu e-mail Google.
3. Authentication → Providers → Google (cliente OAuth do Google Cloud). Desative "Allow new users to sign up". URL Configuration: Site URL `https://andersonbrito.com/painel/` e Redirect URLs com a mesma.
4. `git push`. Acesse `andersonbrito.com/painel/` e entre com o Gmail.

## Desenvolver
```bash
cd painel/dev && npm install && npm test     # banco + validações
python3 -m http.server 8080                   # na raiz do site; abra /painel/dev/harness.html (Supabase falso)
```
