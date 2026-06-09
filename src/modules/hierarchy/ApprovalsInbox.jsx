import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { decideApproval, getApprovalsData } from "../../lib/db/hierarchy";
import { toast } from "../../stores/toastStore";

export default function ApprovalsInbox() {
  const { employee } = useAuth();
  const [tab, setTab] = useState("awaiting");
  const [rows, setRows] = useState({ awaiting: [], mine: [] });
  const [commentById, setCommentById] = useState({});

  async function hydrate() {
    if (!employee?.id) return;
    const next = await getApprovalsData(employee.id);
    setRows(next);
  }

  useEffect(() => {
    hydrate().catch(() => toast.error("Failed to load approvals inbox."));
  }, [employee?.id]);

  async function action(row, decision) {
    const comment = commentById[row.id] || "";
    if (decision === "reject" && !comment.trim()) {
      toast.error("Comment is required for rejection.");
      return;
    }

    await decideApproval({
      requestId: row.id,
      decision,
      comment,
      decidedBy: employee?.id,
    });

    console.log("Notify requestor stub", { requestId: row.id, status: decision });
    toast.success(`Request ${decision}d.`);
    await hydrate();
  }

  return (
    <section className="tw-panel">
      <h3>Approvals inbox</h3>
      <div className="tw-tab-row">
        <button type="button" className={tab === "awaiting" ? "active" : ""} onClick={() => setTab("awaiting")}>
          Awaiting my approval
        </button>
        <button type="button" className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>
          My requests
        </button>
      </div>

      {tab === "awaiting" ? (
        <table className="tw-table">
          <thead>
            <tr>
              <th>Requested by</th>
              <th>Action type</th>
              <th>What</th>
              <th>Requested at</th>
              <th>Comment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.awaiting.map((row) => (
              <tr key={row.id}>
                <td>{row.requested_by_name}</td>
                <td>{row.action_type}</td>
                <td>{row.target_type || "-"}</td>
                <td>{new Date(row.created_at).toLocaleString()}</td>
                <td>
                  <input
                    value={commentById[row.id] || ""}
                    onChange={(event) =>
                      setCommentById((prev) => ({ ...prev, [row.id]: event.target.value }))
                    }
                    placeholder="Optional for approve, required for reject"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => action(row, "approve").catch(() => toast.error("Approve failed."))}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => action(row, "reject").catch(() => toast.error("Reject failed."))}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="tw-table">
          <thead>
            <tr>
              <th>Action type</th>
              <th>Status</th>
              <th>Approver</th>
              <th>Comment</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.mine.map((row) => (
              <tr key={row.id}>
                <td>{row.action_type}</td>
                <td>
                  <span className={`tw-status-badge ${row.status}`}>{row.status}</span>
                </td>
                <td>{row.approver_name}</td>
                <td>{row.comment || "-"}</td>
                <td>{new Date(row.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
