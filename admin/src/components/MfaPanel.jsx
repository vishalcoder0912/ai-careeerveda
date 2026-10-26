import {useState} from "react";

import {mfaSetup, mfaEnable, mfaDisable} from "../services/api";
import {useAuth} from "../context/AuthContext";
import {useToast} from "../context/ToastContext";

const digitsOnly = (value) => value.replace(/\D/g, "").slice(0, 6);

// Two-factor sign-in: enrol (password -> secret -> first code) or turn off
// (password + code). Used on Profile and, when the deployment makes MFA
// mandatory, as the only screen an unenrolled admin can reach.
//
// No QR code: that would need a new dependency. The secret is shown for manual
// entry, and the otpauth:// link opens the authenticator directly on a phone.
const MfaPanel = () => {
  const {admin, replaceSession} = useAuth();
  const toast = useToast();

  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [enrolment, setEnrolment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(
        (failure.fields && (failure.fields.code || failure.fields.password)) ||
          failure.message ||
          "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  };

  const start = (event) => {
    event.preventDefault();
    run(async () => {
      const response = await mfaSetup(password);
      setPassword("");
      setEnrolment(response.data);
    });
  };

  const confirm = (event) => {
    event.preventDefault();
    run(async () => {
      const account = await mfaEnable(code);
      setCode("");
      setEnrolment(null);
      replaceSession(account);
      toast.success("Two-factor sign-in is on. Other devices have been signed out.");
    });
  };

  const turnOff = (event) => {
    event.preventDefault();
    run(async () => {
      const account = await mfaDisable(password, code);
      setPassword("");
      setCode("");
      replaceSession(account);
      toast.success("Two-factor sign-in is off.");
    });
  };

  const errorNode = error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;

  const codeInput = (
    <>
      <label htmlFor="mfa-code">Authentication code</label>
      <input
        id="mfa-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        value={code}
        onChange={(event) => setCode(digitsOnly(event.target.value))}
      />
    </>
  );

  const passwordInput = (
    <>
      <label htmlFor="mfa-password">Confirm with your password</label>
      <input
        id="mfa-password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
    </>
  );

  if (admin.mfaEnabled) {
    return (
      <section className="panel">
        <h2>Two-factor sign-in</h2>
        <p className="muted">On. Signing in needs your password and a code from your authenticator app.</p>
        {admin.mfaRequired ? (
          <p className="muted">This deployment requires it, so turning it off means setting it up again at once.</p>
        ) : null}
        <form onSubmit={turnOff} className="stack">
          {errorNode}
          {passwordInput}
          {codeInput}
          <button type="submit" className="btn btn--danger" disabled={busy}>
            {busy ? "Turning off…" : "Turn off two-factor sign-in"}
          </button>
        </form>
      </section>
    );
  }

  if (enrolment) {
    return (
      <section className="panel">
        <h2>Two-factor sign-in</h2>
        <ol className="stack">
          <li>
            Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…) and add an
            account with this setup key, or <a href={enrolment.otpauthUrl}>open it in the app</a> on this phone.
          </li>
          <li>
            <code className="mfa-secret">{enrolment.secret.match(/.{1,4}/g).join(" ")}</code>
          </li>
          <li>Enter the 6-digit code the app shows.</li>
        </ol>
        <form onSubmit={confirm} className="stack">
          {errorNode}
          {codeInput}
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Checking…" : "Turn on"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Two-factor sign-in</h2>
      <p className="muted">
        {admin.mfaRequired
          ? "Required for this panel. Set it up to continue."
          : "Off. Turn it on so a stolen password alone cannot open this account."}
      </p>
      <form onSubmit={start} className="stack">
        {errorNode}
        {passwordInput}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? "Starting…" : "Set up two-factor sign-in"}
        </button>
      </form>
    </section>
  );
};

export default MfaPanel;
