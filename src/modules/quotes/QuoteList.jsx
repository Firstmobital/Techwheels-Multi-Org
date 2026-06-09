import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cloneQuoteForRequote, fetchQuoteList, updateQuoteStatus } from "./lib/quoteApi";
import { toast } from "../../stores/toastStore";

export default function QuoteList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  async function hydrate() {
    const data = await fetchQuoteList();
    setRows(data);
  }

  useEffect(() => {
    hydrate().catch(() => toast.error("Failed to load quotes."));
  }, []);

  const filtered = useMemo(() => {
    return rows
      .map((row) => {
        const computedStatus = row.status === "sent" && row.valid_until && new Date(row.valid_until) < new Date() ? "expired" : row.status;
        return { ...row, computedStatus };
      })
      .filter((row) => (statusFilter === "all" ? true : row.computedStatus === statusFilter))
      .filter((row) => {
        const needle = search.trim().toLowerCase();
        if (!needle) return true;
        return (
          row.customer_name.toLowerCase().includes(needle) ||
          row.customer_phone.toLowerCase().includes(needle)
        );
      });
  }, [rows, search, statusFilter]);

  async function reQuote(row) {
    await cloneQuoteForRequote(row);
    toast.success("Quote cloned as draft.");
    await hydrate();
  }

  async function convert(row) {
    await updateQuoteStatus(row.id, "converted");
    toast.success("Quote converted to booking (stub).");
    await hydrate();
  }

  return (
    <section className="tw-panel">
      <div className="tw-panel-head">
        <h3>Quotes</h3>
        <Link to="/quotes/new">New quote</Link>
      </div>

      <div className="tw-filter-row">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="expired">Expired</option>
          <option value="converted">Converted</option>
        </select>
        <input
          placeholder="Search customer name or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <table className="tw-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Vehicle</th>
            <th>Total</th>
            <th>Status</th>
            <th>Created by</th>
            <th>Valid until</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.id}>
              <td>{row.customer_name}</td>
              <td>{row.vehicle_label}</td>
              <td>INR {Number(row.total_amount || 0).toLocaleString("en-IN")}</td>
              <td><span className={`tw-status-badge ${row.computedStatus}`}>{row.computedStatus}</span></td>
              <td>{row.created_by_name}</td>
              <td>{row.valid_until ? new Date(row.valid_until).toLocaleDateString() : "-"}</td>
              <td>
                <button type="button" onClick={() => navigate(`/quotes/${row.id}`)}>View</button>
                <button type="button" onClick={() => reQuote(row).catch(() => toast.error("Re-quote failed."))}>Re-quote</button>
                <button type="button" onClick={() => convert(row).catch(() => toast.error("Convert failed."))}>Convert</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
