# TechWheels Phase 1 — Test Guide

> This guide covers manual QA, RLS security tests, and unit test specs.
> Run these tests in order after each prompt is completed.
> Every test that fails is a blocker before moving to the next prompt.

---

## How to use this guide

Each section maps to a prompt:
- **T01** — Infrastructure & DB (after Prompt 01)
- **T02** — Onboarding wizard (after Prompt 02)
- **T03** — Hierarchy & RBAC (after Prompt 03)
- **T04** — Quote builder (after Prompt 04)
- **T05** — App shell (after Prompt 05)

For each test: ✅ Pass · ❌ Fail (note the bug) · ⏭ Skipped (note why)

---

## T01 — Infrastructure & DB

### RLS isolation tests (most critical tests in the entire project)

These must pass before writing a single line of UI. Use the Supabase SQL editor or a test script.

**Setup:**
```sql
-- Create two test orgs
INSERT INTO orgs (id, name, slug) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Org Alpha', 'org-alpha'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Org Beta', 'org-beta');

-- Create two auth users and two employees (one per org)
-- Use Supabase Auth admin API to create users, then:
INSERT INTO employees (org_id, auth_user_id, ...) VALUES
  ('aaaaaaaa-...', '<alpha_user_auth_id>', ...),
  ('bbbbbbbb-...', '<beta_user_auth_id>', ...);
```

**Test T01-RLS-01:** Alpha employee cannot read Beta org data
```sql
-- Run as Alpha user (set JWT to Alpha's token)
SELECT * FROM orgs WHERE id = 'bbbbbbbb-...';
-- Expected: 0 rows returned (not an error — just empty)
```

**Test T01-RLS-02:** Alpha employee cannot insert into Beta org
```sql
-- Run as Alpha user
INSERT INTO org_locations (org_id, name, city, state)
VALUES ('bbbbbbbb-...', 'Fake Location', 'Mumbai', 'Maharashtra');
-- Expected: RLS violation error
```

**Test T01-RLS-03:** Alpha employee cannot update Beta org data
```sql
UPDATE orgs SET name = 'Hacked' WHERE id = 'bbbbbbbb-...';
-- Expected: 0 rows affected (RLS silently blocks it)
```

**Test T01-RLS-04:** org_id mismatch in INSERT is blocked
```sql
-- Alpha user tries to insert with Beta's org_id
INSERT INTO org_locations (org_id, name, city, state)
VALUES ('bbbbbbbb-...', 'Sneaky', 'Delhi', 'Delhi');
-- Expected: RLS violation (WITH CHECK policy blocks it)
```

**Test T01-RLS-05:** platform tables (modules, permissions, rights) are readable by all authenticated users
```sql
SELECT * FROM modules;
-- Expected: all module rows returned regardless of which org the user belongs to
```

### JWT claims test

**Test T01-JWT-01:** After login, JWT contains custom claims
1. Log in as any employee
2. In browser console: `const session = await supabase.auth.getSession(); console.log(JSON.parse(atob(session.data.session.access_token.split('.')[1])))`
3. Expected output includes: `{ org_id: "...", role_id: "...", location_ids: [...] }`

**Test T01-JWT-02:** Unauthenticated request is rejected
```sql
-- Make a request with no Authorization header
SELECT * FROM org_locations;
-- Expected: 0 rows (no data leaks to unauthenticated requests)
```

### React scaffold tests

**Test T01-REACT-01:** App boots without console errors
- Run `npm run dev`
- Open browser
- Expected: no red console errors

**Test T01-REACT-02:** OrgContext loads
- Log in as a test employee
- In React DevTools: find OrgContext
- Expected: `orgTheme`, `orgConfig`, `orgModules` are populated

**Test T01-REACT-03:** ModuleGuard works
- Wrap a test component in `<ModuleGuard module="stock">`
- Log in as an org that has NOT purchased Stock Management
- Expected: the wrapped component does not render

---

## T02 — Onboarding Wizard

### Happy path — complete all 10 steps

**Test T02-HAPPY-01:** Complete Step 1 (Org basics)
1. Navigate to `/onboarding`
2. Fill all fields with valid data
3. Submit
4. Expected: row created in `orgs` table, `onboarding_step = 1`, redirect to Step 2

**Test T02-HAPPY-02:** Step 2 branding — logo upload
1. Upload a PNG file (< 2MB)
2. Expected: preview image appears, file stored in Supabase Storage at `/{org_id}/logo`
3. Select a colour (e.g. `#E63946`)
4. Expected: sidebar in the preview updates to the selected colour immediately (CSS `--brand` token changes)

**Test T02-HAPPY-03:** Step 3 role template — Standard Dealer
1. Select "Standard Dealer" card
2. Expected: card has blue border
3. Click Next
4. Expected: 6 rows in `org_roles` for this org (Org Admin, Sales Manager, DSE, Ops Executive, Accounts, Reception)

**Test T02-HAPPY-04:** Step 5 — location required
1. Try to click "Next" without adding a location
2. Expected: Next button is disabled or shows inline error "Add at least one location to continue"
3. Add a location
4. Expected: Next button becomes active

**Test T02-HAPPY-05:** Complete all 10 steps
- Follow through all steps with valid data
- Expected: `orgs.onboarding_step = 10`, `onboarding_complete = true`, redirect to `/dashboard`
- Expected: Welcome banner NOT shown on dashboard

### Validation tests

**Test T02-VAL-01:** GST number validation
- Enter invalid GST: `12345` → Expected: "Invalid GST number format" error
- Enter valid GST: `27AABCU9603R1ZM` → Expected: no error

**Test T02-VAL-02:** Phone validation
- Enter `12345678` → Expected: error (not 10 digits)
- Enter `5000000000` → Expected: error (must start with 6-9)
- Enter `9876543210` → Expected: valid

**Test T02-VAL-03:** Mandatory step cannot be skipped
- On Step 1: clear all fields and try to click Next
- Expected: Next button disabled AND validation errors shown on each required field

### Resume test

**Test T02-RESUME-01:** Exit mid-wizard and resume
1. Complete Steps 1–4
2. Click "Save & exit"
3. Verify: `orgs.onboarding_step = 4` in DB
4. Navigate back to `/onboarding`
5. Expected: wizard opens at Step 5 (not Step 1)

### Invite test

**Test T02-INVITE-01:** Invite email is sent
1. In Step 6, enter a valid email, select a role and location, click "Send invite"
2. Expected: row in `employee_invites` with `accepted_at = null`
3. Expected: invite email received (check your email / Supabase email logs)

**Test T02-INVITE-02:** Accept invite creates employee
1. Click the invite link from the email
2. Fill name and password
3. Submit
4. Expected: row in `auth.users`, row in `employees`, row in `employee_profiles`
5. Expected: `employee_invites.accepted_at` is set
6. Expected: auto-logged in and redirected to `/dashboard`

**Test T02-INVITE-03:** Expired invite is rejected
1. Manually set `employee_invites.expires_at = now() - interval '1 day'` in DB
2. Try to use that invite link
3. Expected: "This invite link has expired. Contact your administrator." error

---

## T03 — Hierarchy & RBAC

### Org chart canvas tests

**Test T03-CHART-01:** Nodes load correctly
1. Add 5 employees to the org (via employee invites)
2. Open `/org/chart`
3. Expected: 5 nodes visible on the canvas (names and roles correct)

**Test T03-CHART-02:** Drag saves position
1. Drag a node to a new position
2. Refresh the page
3. Expected: node is still in the new position (position saved to DB)

**Test T03-CHART-03:** Connect two nodes
1. Drag from one node's handle to another node
2. Expected: edge drawn between them
3. Verify in DB: `org_chart_nodes.parent_node_id` updated for the child node

**Test T03-CHART-04:** Auto-arrange
1. Click "Auto-arrange"
2. Expected: nodes rearrange into a top-down tree with no overlaps

**Test T03-CHART-05:** Employee not on chart appears in sidebar
1. Invite a new employee (skip adding to chart)
2. Open org chart
3. Expected: new employee appears in "Not on chart" sidebar list
4. Drag them onto canvas
5. Expected: new node created, employee removed from sidebar list

### Approval chain tests

**Test T03-APPROVAL-01:** Skip-level routing
Setup:
- Hierarchy: DSE → Sales Manager → General Manager
- Action type "reversal" requires "General Manager" role, `can_skip_levels = true`

1. Log in as DSE
2. Create a booking reversal request (use the `approval_requests` INSERT directly or via a stub button)
3. Expected: `approval_requests.approver_id` = General Manager's employee_id (NOT Sales Manager's)

**Test T03-APPROVAL-02:** Approve request
1. Log in as General Manager
2. Open `/org/approvals`
3. Expected: the reversal request appears in "Awaiting my approval" tab
4. Click Approve, add a comment
5. Expected: `approval_requests.status = 'approved'`, `decided_by`, `decided_at` set
6. Log back in as DSE → "My requests" tab shows the approved request with comment

**Test T03-APPROVAL-03:** Pending count badge updates in real time
1. Log in as General Manager, keep approvals page open
2. In a different tab/browser, submit a new approval request routed to General Manager
3. Expected: the badge count on the sidebar increments without page refresh (Supabase Realtime)

### Access Studio tests

**Test T03-ACCESS-01:** Permission matrix reflects correct role rights
1. Open `/org/access`
2. Select an employee with "DSE" role
3. Expected: matrix shows the permissions assigned to the DSE role

**Test T03-ACCESS-02:** Toggle permission propagates to all employees in role
1. In the matrix, uncheck "Edit" for `crm.quotes` for the DSE role
2. Log in as a DSE employee
3. Expected: the "Edit quote" action is not available (or is blocked by ModuleGuard/permission check)

**Test T03-ACCESS-03:** Role change takes effect immediately
1. In Access Studio, change an employee's role from DSE to Sales Manager
2. Employee logs out and back in
3. Expected: new JWT claims contain the new `role_id`, employee can now access Sales Manager screens

**Test T03-ACCESS-04:** Cannot delete role with employees assigned
1. Try to delete the "DSE" role while employees have it
2. Expected: delete button is disabled with tooltip "Remove all employees from this role first"

---

## T04 — Quote Builder

### Pricing calculation tests (unit tests — run with Vitest)

File: `src/modules/quotes/lib/quoteCalculations.test.js`

```javascript
describe('quoteCalculations', () => {

  test('T04-CALC-01: ESP carries through correctly', () => {
    expect(calculateEsp({ esp: 765000 })).toBe(765000)
  })

  test('T04-CALC-02: Insurance OD calculated on ESP', () => {
    const result = calculateInsurance({
      esp: 765000,
      od_rate_percent: 3.5,    // 3.5% of ESP
      tp_rate: 4500,           // fixed TP
      gst_rate: 18,
    }, [])
    expect(result.od).toBeCloseTo(765000 * 0.035)          // 26775
    expect(result.gst).toBeCloseTo(result.od * 0.18)       // 4819.5
    expect(result.total).toBeCloseTo(4500 + result.od + result.gst)
  })

  test('T04-CALC-03: Scheme deductions reduce total', () => {
    const total = calculateTotal({
      esp: 765000, rto: 42500, insurance: 28200,
      accessories: 18500, schemes: 35000, tcs: 0
    })
    expect(total).toBe(765000 + 42500 + 28200 + 18500 - 35000)
  })

  test('T04-CALC-04: TCS applied when total exceeds threshold', () => {
    const tcs = calculateTcs(1050000, 1000000) // threshold = 10L
    expect(tcs).toBe(1050000 * 0.01)
  })

  test('T04-CALC-05: TCS not applied below threshold', () => {
    const tcs = calculateTcs(850000, 1000000)
    expect(tcs).toBe(0)
  })
})
```

### Manual flow tests

**Test T04-FLOW-01:** Complete quote builder end-to-end
1. Navigate to `/quotes/new`
2. Fill customer details
3. Select: Make → Model → Variant → Colour
4. Select an RTO type
5. Select an insurance company + one add-on
6. Select 2 accessories
7. Select 1 scheme
8. Reach Step 6 (Summary)
9. Expected: line-by-line breakdown is correct
10. Expected: total = ESP + RTO + insurance + accessories − scheme

**Test T04-FLOW-02:** Pricing sidebar updates live
1. Open quote builder at Step 3 (Insurance)
2. Select an insurance company
3. Expected: sidebar total updates immediately (no page reload)
4. Add an insurance add-on
5. Expected: sidebar total updates again

**Test T04-FLOW-03:** WhatsApp pre-fill
1. Complete quote to Step 6
2. Click "Send on WhatsApp"
3. Expected: browser opens `wa.me/91XXXXXXXXXX?text=...`
4. Expected: resolved message contains customer name, car model, total price, validity date

**Test T04-FLOW-04:** PDF generation
1. Complete quote to Step 6
2. Click "Generate PDF"
3. Expected: PDF file downloaded to browser
4. Open PDF: verify org logo, org name, correct line items, correct total
5. Check DB: `quotes.pdf_url` is set, `quotes.status = 'sent'`

**Test T04-FLOW-05:** Expired quote detection
1. Create a quote
2. In DB: `UPDATE quotes SET valid_until = now() - interval '1 day' WHERE id = 'X'`
3. Open `/quotes`
4. Expected: that quote shows "Expired" badge in red without any page action

**Test T04-ADMIN-01:** Scheme activated mid-session appears in builder
1. Open `/quotes/new` in Tab A, navigate to Step 5 (Schemes)
2. In Tab B (admin): go to `/quotes/admin/schemes`, activate a new scheme
3. In Tab A: without refreshing, go back and forward to Step 5
4. Expected: the newly activated scheme appears

**Test T04-ADMIN-02:** PDF template changes reflect in preview
1. Open `/quotes/admin/pdf-template`
2. Toggle "Show NDP" to ON
3. Expected: PDF preview on the right immediately shows the NDP line
4. Rename "Ex-Showroom Price" label to "Car Price"
5. Expected: PDF preview shows "Car Price" label

### RLS quote tests

**Test T04-RLS-01:** Employee cannot see quotes from another org
```sql
-- As Org Alpha employee:
SELECT * FROM quotes WHERE org_id = 'bbbbbbbb-...';
-- Expected: 0 rows
```

**Test T04-RLS-02:** DSE can only see their own location's quotes
- Log in as DSE assigned to Location A
- Expected: only Location A quotes visible on `/quotes`
- (Manager can toggle to all-locations — stub this for Phase 1, just verify DSE cannot see others')

---

## T05 — App Shell

**Test T05-SHELL-01:** Login flow
1. Navigate to `/`
2. Expected: redirect to `/login`
3. Enter credentials
4. Expected: redirect to `/dashboard`

**Test T05-SHELL-02:** Session persists on refresh
1. Log in
2. Refresh the page
3. Expected: still on dashboard, not redirected to login (session is restored from Supabase's localStorage)

**Test T05-SHELL-03:** Module-gated nav items
1. Log in as an org WITHOUT Stock Management module
2. Expected: "Free stock" and "Stock overview" nav items are not rendered in the DOM (inspect element — they should not exist, not just be hidden)

**Test T05-SHELL-04:** Sign out
1. Click sign out
2. Expected: redirected to `/login`
3. Try to navigate back to `/dashboard`
4. Expected: redirected to `/login` (session cleared)

**Test T05-SHELL-05:** Welcome banner
1. Create a new org with `onboarding_step = 4`
2. Log in as that org's admin
3. Expected: blue banner at top of dashboard: "Your setup is not complete. Continue setup →"
4. Click the link
5. Expected: wizard opens at Step 5 (resumes from where they left off)

**Test T05-SHELL-06:** Org theme applied
1. Set `org_theme.primary_color = '#E63946'` for a test org in DB
2. Log in as that org's employee
3. Expected: active nav item is red, not blue; CTA buttons are red

---

## Regression checklist (run after all prompts complete)

Before calling Phase 1 done, run through this full checklist:

### Security
- [ ] RLS isolation: Org A employee cannot read Org B data (T01-RLS-01 through 04)
- [ ] Unauthenticated requests return no data
- [ ] JWT claims contain org_id, role_id, location_ids
- [ ] ModuleGuard blocks routes (not just hides nav items)
- [ ] Expired invite tokens rejected

### Onboarding
- [ ] Full 10-step wizard completes without errors
- [ ] Wizard resume works correctly
- [ ] All mandatory steps block on invalid/empty input
- [ ] Invite + accept flow creates correct DB records

### Hierarchy
- [ ] Org chart drag-and-drop saves to DB
- [ ] Approval routing respects skip-levels config
- [ ] Permission matrix changes propagate to all employees in that role
- [ ] Pending approval badge is real-time

### Quotes
- [ ] All pricing calculations are correct (run unit tests)
- [ ] PDF generates with correct data
- [ ] WhatsApp variables all resolve correctly
- [ ] Scheme activation is immediate (no cache)
- [ ] Expired quotes detected client-side

### General
- [ ] `npm run build` passes with 0 errors
- [ ] No hardcoded ₹ amounts in application code
- [ ] No hardcoded org names or role names in application code
- [ ] All Supabase tables have RLS enabled (check with: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`)
- [ ] Console is clean (no unhandled promise rejections, no React key warnings)

---

## RLS audit query

Run this in Supabase SQL editor after all migrations:

```sql
SELECT
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF — FIX THIS' END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Every row in the result must show `✅ RLS ON`. Any table showing `❌ RLS OFF` is a critical security issue.

---

## Bug reporting format

When you find a bug during testing, log it like this:

```
BUG-001
Test: T02-RESUME-01
Severity: High (blocks other tests) | Medium (workaround exists) | Low (cosmetic)
Steps to reproduce:
  1. ...
  2. ...
Expected: ...
Actual: ...
Screenshot/console error: ...
```

File bugs in a `BUGS.md` file at the root of the project.
