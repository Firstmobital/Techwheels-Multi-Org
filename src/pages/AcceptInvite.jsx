import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { acceptInviteToken, validateInviteToken } from "../lib/db/onboarding";
import { getSupabaseClient } from "../lib/supabase";
import { toast } from "../stores/toastStore";

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [inviteInfo, setInviteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function validate() {
      if (!token) {
        setError("Invite token is missing.");
        setLoading(false);
        return;
      }

      try {
        const response = await validateInviteToken(token);
        if (!active) return;
        if (!response?.valid) {
          setError(response?.error || "Invite is not valid.");
          setLoading(false);
          return;
        }

        setInviteInfo(response.invite);
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : "Unable to validate invite.");
      } finally {
        if (active) setLoading(false);
      }
    }

    validate();

    return () => {
      active = false;
    };
  }, [token]);

  const passwordError = useMemo(() => {
    if (!password && !confirmPassword) return "";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return "";
  }, [confirmPassword, password]);

  async function onSubmit(event) {
    event.preventDefault();
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (passwordError) {
      setError(passwordError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await acceptInviteToken({ token, fullName, password });

      const client = getSupabaseClient();
      const { error: signInError } = await client.auth.signInWithPassword({
        email: inviteInfo.email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      toast.success("Invite accepted successfully.");
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to accept invite.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="tw-simple-page">Validating invite...</div>;
  }

  if (error && !inviteInfo) {
    return (
      <div className="tw-simple-page">
        <div className="tw-auth-card">
          <h2>Invite unavailable</h2>
          <p className="tw-inline-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-simple-page">
      <form className="tw-auth-card" onSubmit={onSubmit}>
        <h2>Accept your invite</h2>
        <p>
          Joining <strong>{inviteInfo?.orgName || "TechWheels"}</strong> as {inviteInfo?.roleName || "Team member"}
        </p>

        <label htmlFor="fullName">Full name</label>
        <input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />

        {passwordError && <div className="tw-inline-error">{passwordError}</div>}
        {error && <div className="tw-inline-error">{error}</div>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Setting up account..." : "Accept invite"}
        </button>
      </form>
    </div>
  );
}
