# TechWheels SaaS CRM — Claude Code Project Context

> This file is read by Claude Code at the start of every session.
> Do not delete or rename it. Keep it updated as decisions are made.

---

## What this project is

TechWheels is a multi-tenant SaaS CRM for Indian automobile dealerships. Each dealership is an **Organisation (org)**. Orgs are fully isolated — one org can never read, write, or detect data from another org.

This is a greenfield rewrite. The reference project `TECHWHEELS-WEB-main` is for **feature and logic reference only** — do not copy its code. All code is written fresh.

**Tech stack:** React + Vite · Supabase (Postgres + Auth + Storage + Edge Functions) · Razorpay · React Native (mobile — later phase)

---

## The one rule that overrides everything else

**Nothing is hardcoded.** Every rupee amount, label, role name, document type, charge, scheme name, RTO type, insurance rate, and config value lives in the database scoped to `org_id`. The application code is org-agnostic — it reads config, it never defines it.

If you find yourself writing a literal string like `"Documentation Fee"` or a literal number like `4500` in application code, stop. That value belongs in the DB.

---

## Multi-tenancy architecture

- **Shared Supabase database, RLS isolation.** Every table has an `org_id` column.
- **Supabase Row Level Security (RLS) is the security boundary**, not application-level filtering. Every table must have RLS enabled and policies written before any data is inserted.
- **JWT custom claims** carry `org_id`, `role_id`, `location_ids[]` — set at login via a Supabase Edge Function hook.
- **OrgContext** in React resolves branding, modules, and config at login. All components read from OrgContext — they never fetch org config themselves.
- **ModuleGuard** wraps every module's routes. If the org hasn't purchased a module, the routes don't render — they don't exist in the DOM.

---

## Phase 1 scope (build this, nothing else)

### Module 1 — Org onboarding wizard
10-step self-service wizard for a new dealership. Steps 1, 3, 5, 7, 8, 9 are mandatory. Others are skippable.
`onboarding_step` (int) on the `orgs` table tracks resume position.

Steps: Org basics → Branding → Role template → Customise roles → Add locations → Invite employees → Vehicle catalogue → Configure pricing → Document checklist → Choose modules

### Module 2 — Reporting hierarchy + RBAC
- Visual org chart canvas (React Flow) — drag-and-drop, positions saved to `org_chart_nodes`
- Approval chain config — maps action types to required approver role, supports skip-level
- Employee Access Studio — role assignment + permission matrix (view/edit/approve/export per permission)
- Approvals inbox — pending requests routed via hierarchy

### Module 3 — Quote builder
Multi-step flow: customer + vehicle → RTO → insurance → accessories → schemes → summary + PDF
- Everything loaded from org DB config — no hardcoded values
- Live pricing sidebar throughout
- PDF generation via Supabase Edge Function
- WhatsApp pre-fill (native WhatsApp, no API)

**Out of scope for Phase 1:** Stock management, Ops billing pipeline, Finance module, Reports hub, WhatsApp Business API, mobile app.

---

## UI design system

See `techwheels_ui_theme_v2.html` for the full visual reference.

**Primary colour:** `#2563EB` (electric blue)
**Accent:** `#06B6D4` (cyan)
**Success:** `#10B981` · **Warning:** `#F59E0B` · **Danger:** `#EF4444`
**Sidebar:** White background, blue active state
**Surfaces:** `#FFFFFF` card · `#F8FAFC` page bg
**Typography:** System sans-serif, two weights only (400 + 600/700)
**Mono:** For all ₹ amounts, DB keys, codes

Design rules:
1. Hard blocks are amber/red inline alerts — never silently disabled buttons
2. Nav items for locked modules are not rendered at all
3. Org branding (logo, primary colour) injected via CSS `--brand` token at login
4. Permission matrix table: sticky header, 12px rows, mono for permission keys
5. Web-first, 1024px minimum width — no mobile responsive needed in Phase 1

---

## Supabase conventions

- Every migration file goes in `supabase/migrations/` with timestamp prefix: `20250601_001_orgs.sql`
- Every table gets RLS enabled immediately: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`
- RLS policies use `(select auth.jwt() ->> 'org_id')::uuid` — never raw `auth.uid()` for org scoping
- All foreign keys are explicit with `ON DELETE` behaviour stated
- Use `uuid_generate_v4()` for all PKs
- `created_at` and `updated_at` on every table (updated_at via trigger)
- Storage buckets: one per org, path prefix `/{org_id}/`

---

## React conventions

- Component files: PascalCase (`QuoteBuilder.jsx`)
- Hook files: camelCase prefixed with `use` (`useQuoteStore.js`)
- All Supabase queries in `/src/lib/db/` — never inline in components
- Global state: Zustand stores in `/src/stores/`
- OrgContext provided at app root, consumed via `useOrg()` hook
- ModuleGuard: `<ModuleGuard module="quotes"><QuotesRoutes /></ModuleGuard>`
- No `any` types if using TypeScript — prefer JSDoc on plain JS files

---

## File structure

```
src/
  components/        # Shared UI components
  pages/             # Route-level page components
  modules/           # Feature modules (onboarding/, hierarchy/, quotes/)
  lib/
    db/              # All Supabase query functions
    pdf/             # PDF generation helpers
  stores/            # Zustand stores
  context/           # OrgContext, AuthContext
  guards/            # ModuleGuard, ProtectedRoute
supabase/
  migrations/        # SQL migration files (timestamped)
  functions/         # Edge Functions
```

---

## Do not

- Do not use `localStorage` for org data — use OrgContext
- Do not write `WHERE org_id = X` in application queries — RLS handles it
- Do not hardcode any amount, label, or config value
- Do not start building a feature until its DB migration and RLS policies are written and tested
- Do not skip writing tests for RLS policies — this is the security boundary
