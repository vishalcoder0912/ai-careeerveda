import {useState} from "react";

import {useAuth} from "../context/AuthContext";
import {BRAND_LOGO} from "../config/brand";

// Sign-in only. Self-serve password reset was removed from the panel and from
// the API — recovering an account is something an operator does out of band,
// with `npm --prefix backend run seed:admin -- --reset`.
//
// A signed-in admin changes their own password under Profile & security, which
// is a different thing and still works.
const Login = () => {
  const {signIn} = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await signIn(email, password);
      // No navigate(): App re-renders to the authenticated tree the moment
      // `admin` is set, and pushing a route as well would race that.
    } catch (failure) {
      // The server's message is already written for a person to read — and the
      // sign-in failure is deliberately vague about which half was wrong.
      // Restating it here would only make it worse.
      setError(failure.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <div className="auth-brand">
          {/* Decorative — the h1 beside it already names the panel. */}
          <img className="sidebar-mark" src={BRAND_LOGO} alt="" />
          <h1>CareerVeda Admin</h1>
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={busy}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={busy}
        />

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
};

export default Login;
