import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const restoreSession = vi.fn();
const login = vi.fn();
const logout = vi.fn();
const setSessionEndedHandler = vi.fn();

vi.mock("../services/api", () => ({
  restoreSession: (...args) => restoreSession(...args),
  login: (...args) => login(...args),
  logout: (...args) => logout(...args),
  setSessionEndedHandler: (...args) => setSessionEndedHandler(...args),
}));

const {AuthProvider, useAuth} = await import("./AuthContext.jsx");

// A probe rather than renderHook: the provider's value is only interesting
// through the things a screen actually does with it.
const Probe = () => {
  const {admin, restoring, signIn, signOut, can} = useAuth();

  if (restoring) return <p>restoring</p>;

  return (
    <div>
      <p data-testid="who">{admin ? admin.email : "signed out"}</p>
      <p data-testid="may-publish">{can("programs.publish") ? "yes" : "no"}</p>
      <button type="button" onClick={() => signIn("admin@careerveda.in", "pw")}>
        Sign in
      </button>
      <button type="button" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  );
};

const renderAuth = () => render(
  <AuthProvider>
    <Probe />
  </AuthProvider>,
);

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreSession.mockResolvedValue(null);
    login.mockResolvedValue({email: "admin@careerveda.in", permissions: []});
    logout.mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  // "restoring" is not "logged out". Rendering the login screen during the gap
  // flashes it at someone who is in fact signed in.
  it("reports restoring until the refresh cookie has been exchanged", async () => {
    let release;
    restoreSession.mockReturnValue(new Promise((resolve) => {
      release = resolve;
    }));

    renderAuth();
    expect(screen.getByText("restoring")).toBeInTheDocument();

    await act(async () => release(null));
    await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent("signed out"));
  });

  it("adopts the account the refresh cookie restored", async () => {
    restoreSession.mockResolvedValue({email: "restored@careerveda.in", permissions: []});

    renderAuth();

    await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent("restored@careerveda.in"));
  });

  // A failed exchange is the ordinary signed-out case, so restoreSession()
  // swallows it and resolves null rather than rejecting (api.js:184). The
  // provider has no .catch(), which is only safe while that stays true — this
  // asserts the resolved-null path the provider actually depends on. Leaving
  // `restoring` true here would hang the panel on a spinner forever.
  it("finishes restoring when there is no session to restore", async () => {
    restoreSession.mockResolvedValue(null);

    renderAuth();

    await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent("signed out"));
  });

  it("stores the account returned by a sign-in", async () => {
    login.mockResolvedValue({email: "admin@careerveda.in", permissions: []});
    const user = userEvent.setup();
    renderAuth();
    await screen.findByTestId("who");

    await user.click(screen.getByRole("button", {name: "Sign in"}));

    expect(login).toHaveBeenCalledWith("admin@careerveda.in", "pw");
    await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent("admin@careerveda.in"));
  });

  it("clears the account on sign-out", async () => {
    restoreSession.mockResolvedValue({email: "admin@careerveda.in", permissions: []});
    const user = userEvent.setup();
    renderAuth();
    await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent("admin@careerveda.in"));

    await user.click(screen.getByRole("button", {name: "Sign out"}));

    expect(logout).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent("signed out"));
  });

  // The API client calls this when a refresh fails mid-session. Without it the
  // panel keeps rendering a signed-in shell over an expired session, and every
  // action fails with a 401 the user cannot explain.
  it("drops the account when the API client reports the session ended", async () => {
    restoreSession.mockResolvedValue({email: "admin@careerveda.in", permissions: []});

    renderAuth();
    await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent("admin@careerveda.in"));

    const [endSession] = setSessionEndedHandler.mock.calls.at(-1);
    await act(async () => endSession());

    expect(screen.getByTestId("who")).toHaveTextContent("signed out");
  });

  describe("can", () => {
    it("is false while signed out", async () => {
      renderAuth();

      await waitFor(() => expect(screen.getByTestId("may-publish")).toHaveTextContent("no"));
    });

    it("is true for a permission the account holds", async () => {
      restoreSession.mockResolvedValue({
        email: "admin@careerveda.in",
        permissions: ["programs.read", "programs.publish"],
      });

      renderAuth();

      await waitFor(() => expect(screen.getByTestId("may-publish")).toHaveTextContent("yes"));
    });

    it("is false for a permission the account does not hold", async () => {
      restoreSession.mockResolvedValue({email: "editor@careerveda.in", permissions: ["programs.read"]});

      renderAuth();

      await waitFor(() => expect(screen.getByTestId("may-publish")).toHaveTextContent("no"));
    });

    // An account shape without `permissions` must read as "may do nothing".
    // Reading it as "may do everything" is the failure mode that matters.
    it("is false when the account carries no permissions array", async () => {
      restoreSession.mockResolvedValue({email: "admin@careerveda.in"});

      renderAuth();

      await waitFor(() => expect(screen.getByTestId("may-publish")).toHaveTextContent("no"));
    });
  });
});

describe("useAuth", () => {
  afterEach(cleanup);

  it("refuses to run outside the provider", () => {
    const Orphan = () => {
      useAuth();
      return null;
    };

    // React logs the thrown error through its own handler as well; silencing it
    // keeps the run's output about failures that are real.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Orphan />)).toThrow(/useAuth must be used inside AuthProvider/);

    consoleError.mockRestore();
  });
});
