import {useEffect, useState} from "react";

import {changePassword, listSessions, revokeSession} from "../services/api";
import {useAuth} from "../context/AuthContext";
import {useToast} from "../context/ToastContext";
import {Skeleton, ErrorState} from "../components/States";

const Profile = () => {
  const {admin} = useAuth();
  const toast = useToast();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState(null);

  const [sessions, setSessions] = useState(null);
  const [sessionsError, setSessionsError] = useState(null);

  const loadSessions = async () => {
    setSessionsError(null);
    try {
      const response = await listSessions();
      setSessions(response.data);
    } catch (failure) {
      setSessionsError(failure);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setFieldError(null);

    // Checked here as well as on the server, because the server has no idea
    // what the user typed twice — it only ever receives one new password.
    if (next !== confirmValue) {
      setFieldError("The two new passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirmValue("");
      toast.success("Password changed. Other devices have been signed out.");
      await loadSessions();
    } catch (failure) {
      setFieldError(
        (failure.fields && (failure.fields.newPassword || failure.fields.currentPassword)) ||
          failure.message ||
          "Could not change the password.",
      );
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id) => {
    try {
      await revokeSession(id);
      toast.success("Session revoked.");
      await loadSessions();
    } catch (failure) {
      toast.error(failure.message || "Could not revoke that session.");
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Profile &amp; security</h1>
          <p className="page-sub">
            {admin.name} · {admin.email} · {admin.role}
          </p>
        </div>
      </div>

      <section className="panel">
        <h2>Change password</h2>
        <form onSubmit={submit} className="stack">
          {fieldError ? (
            <p className="form-error" role="alert">
              {fieldError}
            </p>
          ) : null}

          <label htmlFor="current">Current password</label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />

          <label htmlFor="next">New password</label>
          <input
            id="next"
            type="password"
            autoComplete="new-password"
            required
            value={next}
            onChange={(event) => setNext(event.target.value)}
            aria-describedby="next-hint"
          />
          <p className="field-hint" id="next-hint">
            At least 12 characters. Length matters more than symbols.
          </p>

          <label htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirmValue}
            onChange={(event) => setConfirmValue(event.target.value)}
          />

          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Changing…" : "Change password"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Active sessions</h2>
        <p className="muted">Signing out of a session ends it on that device immediately.</p>

        {sessionsError ? <ErrorState error={sessionsError} onRetry={loadSessions} /> : null}
        {!sessions && !sessionsError ? <Skeleton rows={2} /> : null}

        {sessions ? (
          <ul className="session-list">
            {sessions.map((session) => (
              <li key={session._id}>
                <div>
                  <p>{session.userAgent || "Unknown device"}</p>
                  <span className="muted">
                    from {session.ipPrefix || "unknown network"} · started{" "}
                    {new Date(session.createdAt).toLocaleString()}
                  </span>
                </div>
                <button type="button" className="btn btn--small btn--danger" onClick={() => revoke(session._id)}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
};

export default Profile;
