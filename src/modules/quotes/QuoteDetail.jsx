import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cloneQuoteForRequote, fetchQuoteDetail, updateQuoteStatus } from "./lib/quoteApi";
import { toast } from "../../stores/toastStore";

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetchQuoteDetail(id)
      .then(setRow)
      .catch(() => toast.error("Failed to load quote detail."));
  }, [id]);

  if (!row) {
    return (
      <div className="tw-panel">
        <h3>Quote details</h3>
        <p className="tw-muted-text">Loading...</p>
      </div>
    );
  }

  const computedStatus = row.status === "sent" && row.valid_until && new Date(row.valid_until) < new Date() ? "expired" : row.status;

  async function onRequote() {
    const cloned = await cloneQuoteForRequote(row);
    toast.success("Quote cloned as draft.");
    navigate(`/quotes/${cloned.id}`);
  }

  async function onConvert() {
    await updateQuoteStatus(row.id, "converted");
    setRow((prev) => ({ ...prev, status: "converted" }));
    toast.success("Quote marked as converted.");
  }

  return (
    <div className="tw-summary-layout">
      <section className="tw-panel">
        <div className="tw-panel-head">
          <h3>{row.customer_name}</h3>
          <span className={`tw-status-badge ${computedStatus}`}>{computedStatus}</span>
        </div>

        <div className="tw-detail-grid">
          <div>
            <small className="tw-muted-text">Phone</small>
            <div>{row.customer_phone}</div>
          </div>
          <div>
            <small className="tw-muted-text">Vehicle</small>
            <div>{row.vehicle_label || "-"}</div>
          </div>
          <div>
            <small className="tw-muted-text">Created by</small>
            <div>{row.created_by_name}</div>
          </div>
          <div>
            <small className="tw-muted-text">Valid until</small>
            <div>{row.valid_until ? new Date(row.valid_until).toLocaleDateString() : "-"}</div>
          </div>
        </div>

        <table className="tw-table">
          <thead>
            <tr>
              <th>Line item</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(row.line_items || []).map((item) => (
              <tr key={item.id}>
                <td>{item.label}</td>
                <td className={item.is_deduction ? "tw-green-text" : ""}>
                  {item.is_deduction ? "- " : ""}INR {Number(item.amount || 0).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            <tr>
              <td><strong>Total</strong></td>
              <td><strong>INR {Number(row.total_amount || 0).toLocaleString("en-IN")}</strong></td>
            </tr>
          </tbody>
        </table>

        <div className="tw-action-row">
          <Link to="/quotes">Back to quotes</Link>
          <button type="button" onClick={() => onRequote().catch(() => toast.error("Re-quote failed."))}>Re-quote</button>
          <button type="button" onClick={() => onConvert().catch(() => toast.error("Convert failed."))}>Convert</button>
          {row.pdf_url ? (
            <a href={row.pdf_url} target="_blank" rel="noreferrer">Open PDF</a>
          ) : (
            <span className="tw-muted-text">No PDF generated</span>
          )}
        </div>
      </section>
    </div>
  );
}
