import { Link } from "react-router-dom";

export default function QuoteList() {
  return (
    <div className="tw-panel">
      <h2>Quotes</h2>
      <p>Quotes list screen placeholder.</p>
      <Link to="/quotes/new">Create a new quote</Link>
    </div>
  );
}
