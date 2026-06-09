import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useOrg } from "../../context/OrgContext";
import { hasPermission } from "../../lib/db/permissions";
import {
  getActiveQuoteCount,
  getOpenLeadsCount,
  getPendingApprovalsCount,
} from "../../lib/db/quotes";
import { getSupabaseClient } from "../../lib/supabase";

const PAGE_META = {
  "/dashboard": { title: "Dashboard", breadcrumb: "Home / Dashboard" },
  "/quotes": { title: "Quotes", breadcrumb: "Quotes" },
  "/quotes/new": { title: "New Quote", breadcrumb: "Quotes / New quote" },
  "/org/chart": { title: "Org Chart", breadcrumb: "Organisation / Org chart" },
  "/org/employees": { title: "Employees", breadcrumb: "Organisation / Employees" },
  "/org/access": { title: "Roles & Access", breadcrumb: "Organisation / Roles & access" },
  "/org/roles": { title: "Roles", breadcrumb: "Organisation / Roles" },
  "/org/approvals": { title: "Approvals", breadcrumb: "Organisation / Approvals" },
  "/settings": { title: "Settings", breadcrumb: "Configuration / Settings" },
};

function getMeta(pathname) {
  if (pathname.startsWith("/quotes/") && pathname !== "/quotes/new") {
    return { title: "Quote Detail", breadcrumb: "Quotes / Detail" };
  }
  return PAGE_META[pathname] ?? { title: "TechWheels", breadcrumb: "Home" };
}

function initialsFromName(name, fallback = "TW") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export default function AppShell() {
  const location = useLocation();
  const { org, orgTheme, hasModule, orgLocations } = useOrg();
  const { employee, signOut } = useAuth();
  const [canConfigure, setCanConfigure] = useState(false);
  const [counts, setCounts] = useState({ activeQuotes: 0, openLeads: 0, pendingApprovals: 0 });

  const routeMeta = useMemo(() => getMeta(location.pathname), [location.pathname]);

  const primaryLocationName = useMemo(() => {
    const firstLocationId = employee?.location_ids?.[0];
    if (!firstLocationId) return "Primary location";
    const locationRow = (orgLocations ?? []).find((item) => item.id === firstLocationId);
    return locationRow?.name ?? "Primary location";
  }, [employee?.location_ids, orgLocations]);

  useEffect(() => {
    let active = true;
    let client = null;
    let channel = null;

    async function loadShellData() {
      const scopedToLocation = !/manager|admin/i.test(employee?.role_name ?? "");
      const locationIds = employee?.location_ids ?? [];

      const [activeQuotes, openLeads, pendingApprovals, hasOrgConfig] = await Promise.all([
        getActiveQuoteCount({ locationIds, scopedToLocation }),
        getOpenLeadsCount(),
        getPendingApprovalsCount(),
        hasPermission(employee?.role_id, "org.config"),
      ]);

      if (!active) return;

      setCounts({ activeQuotes, openLeads, pendingApprovals });
      setCanConfigure(hasOrgConfig || employee?.role_name === "Org Admin");
    }

    loadShellData();

    try {
      client = getSupabaseClient();
      channel = client
        .channel("approval-requests")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "approval_requests" },
          async () => {
            const pendingApprovals = await getPendingApprovalsCount();
            if (!active) return;
            setCounts((prev) => ({ ...prev, pendingApprovals }));
          }
        )
        .subscribe();
    } catch (_error) {
      channel = null;
    }

    return () => {
      active = false;
      if (client && channel) {
        client.removeChannel(channel);
      }
    };
  }, [employee?.location_ids, employee?.role_id, employee?.role_name]);

  const navMain = [
    { label: "Dashboard", to: "/dashboard", badge: null },
    { label: "Quotes", to: "/quotes", badge: counts.activeQuotes, gated: true },
    { label: "Leads", to: "/quotes", badge: counts.openLeads, gated: true },
    { label: "Bookings", to: "/quotes", badge: null, gated: true },
  ].filter((item) => !item.gated || hasModule("core_crm"));

  const navOrg = [
    { label: "Org chart", to: "/org/chart", badge: null },
    { label: "Employees", to: "/org/employees", badge: null },
    { label: "Roles & access", to: "/org/access", badge: null },
    { label: "Approvals", to: "/org/approvals", badge: counts.pendingApprovals },
  ];

  const navConfig = [
    { label: "Pricing & schemes", to: "/quotes/admin/schemes" },
    { label: "Document checklist", to: "/settings" },
    { label: "Modules", to: "/settings" },
  ];

  return (
    <div className="tw-shell">
      <aside className="tw-sidebar">
        <div className="tw-brand">
          {orgTheme?.logo_url ? (
            <img src={orgTheme.logo_url} alt="Org logo" className="tw-brand-logo" />
          ) : (
            <div className="tw-brand-fallback">TW</div>
          )}
          <div>
            <div className="tw-org-name">{org?.name ?? "TechWheels Org"}</div>
            <div className="tw-org-location">{primaryLocationName}</div>
          </div>
        </div>

        <nav className="tw-nav">
          <div className="tw-nav-group">Main</div>
          {navMain.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}

          <div className="tw-nav-group">Organisation</div>
          {navOrg.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}

          {canConfigure && (
            <>
              <div className="tw-nav-group">Configuration</div>
              {navConfig.map((item) => (
                <NavItem key={item.label} item={item} />
              ))}
            </>
          )}
        </nav>

        <div className="tw-sidebar-footer">
          <div className="tw-user-card">
            <div className="tw-avatar">{initialsFromName(employee?.full_name, "TW")}</div>
            <div>
              <div className="tw-user-name">{employee?.full_name ?? "Team member"}</div>
              <div className="tw-user-role">{employee?.role_name ?? "Role"}</div>
            </div>
          </div>
          <button type="button" className="tw-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="tw-main">
        <header className="tw-topbar">
          <div>
            <div className="tw-page-title">{routeMeta.title}</div>
            <div className="tw-breadcrumb">{routeMeta.breadcrumb}</div>
          </div>
          <div className="tw-topbar-right">
            <span className="tw-org-badge">{org?.name ?? "Org"}</span>
            <button type="button" className="tw-icon-btn" aria-label="Notifications">
              N
            </button>
            <button type="button" className="tw-icon-btn" aria-label="Help">
              ?
            </button>
          </div>
        </header>

        <main className="tw-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ item }) {
  return (
    <NavLink to={item.to} className={({ isActive }) => `tw-nav-item${isActive ? " active" : ""}`}>
      <span>{item.label}</span>
      {typeof item.badge === "number" && <span className="tw-badge">{item.badge}</span>}
    </NavLink>
  );
}
