# TechWheels Phase 1 — Claude Code Prompt Pack

## What's in this pack

| File | What it does |
|---|---|
| `CLAUDE.md` | Project context — Claude Code reads this every session. Keep it in the repo root. |
| `01-infrastructure.md` | DB schema, RLS, JWT claims, React scaffold |
| `02-onboarding-wizard.md` | 10-step org onboarding wizard + invite flow |
| `03-hierarchy-rbac.md` | Org chart canvas, approval chains, access studio |
| `04-quote-builder.md` | Quote builder, PDF, WhatsApp, admin config |
| `05-app-shell.md` | Login, sidebar nav, dashboard, routing shell |
| `TEST-GUIDE.md` | Manual QA + unit test specs for all modules |

---

## How to use Claude Code prompts

1. Open your terminal in the project root
2. Run: `claude`
3. Paste the **entire contents** of the prompt file
4. Claude Code will read `CLAUDE.md` automatically as context
5. Let it run — it will create files, run migrations, and install packages
6. When it's done: run the corresponding tests from `TEST-GUIDE.md`
7. Fix any failures before moving to the next prompt

---

## Build order (strict)

```
01-infrastructure  ←── start here, everything depends on this
       ↓
05-app-shell       ←── build this next (login + routing needed for manual testing)
       ↓
02-onboarding      ←── first real feature
       ↓
03-hierarchy       ←── RBAC needed before quote permissions work
       ↓
04-quote-builder   ←── final Phase 1 module
```

Prompts 01 and 05 can be done in the same Claude Code session.
Each subsequent prompt should be a fresh Claude Code session — it will re-read `CLAUDE.md`.

---

## Environment setup before starting

Create `.env` in project root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
```

Supabase project: create a new project at supabase.com before running Prompt 01.

Enable these in Supabase dashboard before starting:
- Database → Extensions → `uuid-ossp`
- Authentication → Email → Enable email confirmations OFF (for dev speed)
- Authentication → Hooks → After sign-in → point to your `set-jwt-claims` Edge Function URL

---

## Key rules Claude Code must follow (already in CLAUDE.md, but repeat for emphasis)

1. **RLS first.** Every new table gets `ENABLE ROW LEVEL SECURITY` and policies before any data is inserted.
2. **Nothing hardcoded.** No ₹ amounts, role names, or config values in application code.
3. **DB migrations are timestamped files** in `supabase/migrations/`. Never edit the Supabase schema via the dashboard — always via migration files.
4. **Queries in `/src/lib/db/`** — never inline in components.
5. **Test RLS** after every migration. Use the SQL audit query in TEST-GUIDE.md.

---

## After Phase 1 is complete

The next prompts (Phase 2 onwards) will cover:
- Stock management (raw stock, free stock, VNA, matched, in-transit)
- Operations & billing pipeline (10 stages)
- Finance module
- Reports hub
- WhatsApp Business API suite
