# DevHub

DevHub is a collaborative project starter built with TanStack Start, React, and Supabase.

Quick start

1. Copy `.env.example` to `.env` and fill in the values.

2. Install dependencies:

```bash
npm install
```

3. Run the dev server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

Environment variables

- `VITE_SUPABASE_URL` — Supabase URL (client)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key (client)
- `SUPABASE_URL` — Supabase URL (server)
- `SUPABASE_PUBLISHABLE_KEY` — Supabase publishable key (server)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
- `AI_API_URL` — Optional AI gateway URL for server AI functions
- `AI_API_KEY` — API key for the AI provider

Notes

- This project expects Supabase to be configured for auth and the `tasks` table used by AI helpers.
- If you don't plan to use AI features, you can leave `AI_API_URL` and `AI_API_KEY` unset.
