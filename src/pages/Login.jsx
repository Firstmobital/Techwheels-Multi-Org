import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "../stores/toastStore";

export default function Login() {
  const navigate = useNavigate();
  const { supabase, user, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user]);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");

    if (!supabase) {
      setError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    toast.success("Signed in successfully.");
    navigate("/dashboard", { replace: true });
  }

  if (isLoading) return null;

  return (
    <div className="tw-auth-page">
      <form className="tw-auth-card" onSubmit={onSubmit}>
        <h1>Welcome back</h1>
        <p>Sign in to continue to TechWheels.</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        {error ? <div className="tw-inline-error">{error}</div> : null}

        <Link to="/forgot-password" className="tw-forgot-link">
          Forgot password?
        </Link>
      </form>
    </div>
  );
}
