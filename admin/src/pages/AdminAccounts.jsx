import {useCallback, useEffect, useState} from "react";

import {adminUsersApi} from "../services/api";
import {useToast} from "../context/ToastContext";
import {Modal} from "../components/Modal";
import {Skeleton, EmptyState, ErrorState} from "../components/States";

const ROLE_LABELS = {
  "super-admin": "Super admin",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

// 20 characters from an alphabet without the glyphs people confuse when reading
// a password out loud or retyping it (0/O, 1/l/I). The Aa1! prefix guarantees
// the composition rules even in the improbable case a random draw misses one
// class; the bulk of the password is still random.
const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";

const generatePassword = () => {
  const values = new Uint32Array(16);
  globalThis.crypto.getRandomValues(values);
  const random = Array.from(
    values,
    (value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length],
  ).join("");
  return `Aa1!${random}`;
};

const AccountBadge = ({toned, children}) => (
  <span className={`account-badge${toned ? ` account-badge--${toned}` : ""}`}>
    {children}
  </span>
);

const AccountRow = ({account, onReset}) => (
  <tr>
    <td data-label="Name">
      <span className="account-name">
        <strong>{account.name}</strong>
        {account.isSelf ? <span className="account-you">You</span> : null}
      </span>
      {account.email.includes(",") ? (
        <span className="account-lock">
          This address contains a comma and cannot be used to sign in.
        </span>
      ) : null}
    </td>
    <td data-label="Email">
      <span className="account-email">{account.email}</span>
    </td>
    <td data-label="Role">{ROLE_LABELS[account.role] || account.role}</td>
    <td data-label="Status">
      <AccountBadge toned={account.status === "active" ? "active" : "suspended"}>
        {account.status === "active" ? "Active" : "Suspended"}
      </AccountBadge>
      {account.lockedUntil ? (
        <span className="account-lock">
          Locked until {formatDate(account.lockedUntil)}
        </span>
      ) : null}
    </td>
    <td data-label="Two-factor">
      <AccountBadge toned={account.mfaEnabled ? "mfa" : "muted"}>
        {account.mfaEnabled ? "On" : "Off"}
      </AccountBadge>
    </td>
    <td data-label="Last sign-in">{formatDate(account.lastLoginAt)}</td>
    <td data-label="Actions">
      {account.isSelf ? (
        <span className="field-hint">Change yours under Profile &amp; security.</span>
      ) : (
        <button
          type="button"
          className="btn btn--small"
          onClick={() => onReset(account)}
        >
          Reset password
        </button>
      )}
    </td>
  </tr>
);

const ResetPasswordDialog = ({account, onClose, onReset}) => {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState(null);
  const [result, setResult] = useState(null);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const generate = () => {
    const password = generatePassword();
    setNewPassword(password);
    setConfirmPassword(password);
    setShowPassword(true);
    setFieldError(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setFieldError(null);

    if (newPassword !== confirmPassword) {
      setFieldError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await adminUsersApi.resetPassword(account.id, newPassword);
      setResult({
        email: response.data.email,
        name: response.data.name,
        password: newPassword,
      });
      toast.success(`Password reset for ${account.email}.`);
      onReset();
    } catch (failure) {
      setFieldError(
        (failure.fields && failure.fields.newPassword) ||
          failure.message ||
          "Could not reset that password.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.password);
      toast.success("Password copied.");
    } catch {
      toast.error("Could not copy automatically. Select the password and copy it.");
    }
  };

  return (
    <Modal
      labelledBy="reset-password-title"
      describedBy="reset-password-description"
      busy={busy}
      onClose={close}
    >
      <div className="dialog-head">
        <h2 id="reset-password-title">
          {result ? "Password reset" : "Reset password"}
        </h2>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={close}
          aria-label="Close"
          disabled={busy}
        >
          ×
        </button>
      </div>

      {result ? (
        <div className="reset-success">
          <p id="reset-password-description">
            The password for <strong>{result.name}</strong> ({result.email}) has
            been reset. Copy it now — it will not be shown again.
          </p>

          <label htmlFor="reset-password-value">New password</label>
          <div className="password-readout">
            <input
              id="reset-password-value"
              type="text"
              readOnly
              value={result.password}
              onFocus={(event) => event.target.select()}
            />
            <button type="button" className="btn" onClick={copy}>
              Copy
            </button>
          </div>

          <p className="field-hint">
            Share it over a private channel. Every existing session for the
            account has been signed out.
          </p>

          <div className="dialog-actions">
            <button type="button" className="btn btn--primary" onClick={close}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form className="account-form" onSubmit={submit}>
          <p id="reset-password-description">
            Set a new password for <strong>{account.name}</strong> (
            {account.email}). Every existing session for the account will be
            signed out.
          </p>

          {fieldError ? (
            <p className="form-error" role="alert">
              {fieldError}
            </p>
          ) : null}

          <label htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            aria-describedby="reset-password-hint"
          />

          <label htmlFor="reset-password-confirm">Confirm new password</label>
          <input
            id="reset-password-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <div className="account-password-tools">
            <button type="button" className="btn btn--small" onClick={generate}>
              Generate strong password
            </button>
            <button
              type="button"
              className="btn btn--small"
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <p className="field-hint" id="reset-password-hint">
            At least 12 characters. Length matters more than symbols. The
            account&apos;s two-factor setting is left unchanged.
          </p>

          <div className="dialog-actions">
            <button type="button" className="btn" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? "Resetting…" : "Reset password"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

const AdminAccounts = () => {
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState(null);
  const [target, setTarget] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await adminUsersApi.list();
      setAccounts(response.data);
    } catch (failure) {
      setError(failure);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await adminUsersApi.list();
        if (cancelled) return;
        setError(null);
        setAccounts(response.data);
      } catch (failure) {
        if (cancelled) return;
        setError(failure);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Admin accounts</h1>
          <p className="page-sub">
            {accounts
              ? `${accounts.length} account${accounts.length === 1 ? "" : "s"} can sign in to this panel. Only super-admins can manage them.`
              : "Accounts that can sign in to this panel."}
          </p>
        </div>
      </div>

      {error ? <ErrorState error={error} onRetry={load} /> : null}
      {!accounts && !error ? <Skeleton rows={6} /> : null}

      {!error && accounts && accounts.length === 0 ? (
        <EmptyState
          title="No admin accounts"
          body="Seed the first super-admin with npm --prefix backend run seed:admin."
        />
      ) : null}

      {!error && accounts && accounts.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="accounts-table">
              <caption className="visually-hidden">Admin accounts</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Two-factor</th>
                  <th scope="col">Last sign-in</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onReset={setTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <p className="field-hint accounts-note">
            Resetting a password signs that account out everywhere and clears a
            login lockout. Suspension and two-factor settings are not changed.
          </p>
        </>
      ) : null}

      {target ? (
        <ResetPasswordDialog
          account={target}
          onClose={() => setTarget(null)}
          onReset={load}
        />
      ) : null}
    </div>
  );
};

export default AdminAccounts;
