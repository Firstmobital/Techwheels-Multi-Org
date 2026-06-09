import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { getDashboardStats, getRecentQuotes, getPendingApprovalsCount } from "../lib/db/quotes";

export default function Dashboard() {
  const { employee } = useAuth();
  const { org } = useOrg();
  const [stats, setStats] = useState({
    quotesThisMonth: 0,
    converted: 0,
    activeQuotes: 0,
    expiringSoon: 0,
  });
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const scopedToLocation = useMemo(
    () => !/manager|admin/i.test(employee?.role_name ?? ""),
    [employee?.role_name]
  );

  const locationIds = employee?.location_ids ?? [];

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const [nextStats, nextRecent, nextPending] = await Promise.all([
        getDashboardStats({ locationIds, scopedToLocation }),
        getRecentQuotes({ locationIds, scopedToLocation, limit: 10 }),
        getPendingApprovalsCount(),
      ]);

      if (!active) return;
      setStats(nextStats);
      setRecentQuotes(nextRecent);
      setPendingApprovals(nextPending);
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [locationIds, scopedToLocation]);

  return (
    <div className="tw-dashboard">
      {(org?.onboarding_step ?? 10) < 10 && (
        <div className="tw-banner">
          <span>Your setup is not complete.</span>
          <Link to="/onboarding">Continue setup -&gt;</Link>
        </div>
      )}

      <div className="tw-stats-grid">
        <StatCard title="Quotes this month" value={stats.quotesThisMonth} />
        <StatCard title="Converted" value={stats.converted} />
        <StatCard title="Active quotes" value={stats.activeQuotes} />
        <StatCard title="Expiring soon" value={stats.expiringSoon} />
      </div>

      <div className="tw-dashboard-panels">
        <section className="tw-panel">
          <div className="tw-panel-head">
            <h3>Recent quotes</h3>
            <Link to="/quotes">View all</Link>
          </div>
          <table className="tw-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Total</th>
                <th>Status</th>
                <th>Created at</th>
              </tr>
            </thead>
            <tbody>
              {recentQuotes.length ? (
                recentQuotes.map((row) => (
                  <tr key={row.id}>
                    <td>{row.customer_name ?? "-"}</td>
                    <td>{row.vehicle_name ?? "-"}</td>
                    <td>{row.total_amount ?? 0}</td>
                    <td>{row.status ?? "draft"}</td>
                    <td>{new Date(row.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No quotes yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="tw-panel">
          <h3>Quick actions</h3>
          <div className="tw-quick-actions">
            <Link to="/quotes/new" className="tw-quick-card">
              New quote
            </Link>
            <Link to="/org/chart" className="tw-quick-card">
              Org chart
            </Link>
            <Link to="/org/approvals" className="tw-quick-card">
              Pending approvals ({pendingApprovals})
            </Link>
            <Link to="/quotes/admin/schemes" className="tw-quick-card">
              Manage schemes
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <article className="tw-stat-card">
      <p>{title}</p>
      <strong>{value}</strong>
    </article>
  );
}
