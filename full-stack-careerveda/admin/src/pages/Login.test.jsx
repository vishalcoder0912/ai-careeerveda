import {afterEach, describe, expect, it, vi, beforeEach} from "vitest";
import {cleanup, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signIn = vi.fn();

vi.mock("../context/AuthContext", () => ({useAuth: () => ({signIn})}));

const {default: Login} = await import("./Login.jsx");

const at = (url) => window.history.replaceState(null, "", url);

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    at("/");
  });
  afterEach(cleanup);

  it("signs in with the credentials entered", async () => {
    const user = userEvent.setup();
    render(<Login />);

    await user.type(screen.getByLabelText(/email/i), "admin@careerveda.in");
    await user.type(screen.getByLabelText(/password/i), "Str0ng!Passw0rd");
    await user.click(screen.getByRole("button", {name: /^sign in$/i}));

    expect(signIn).toHaveBeenCalledWith("admin@careerveda.in", "Str0ng!Passw0rd");
  });

  it("shows the server's message when sign-in fails", async () => {
    signIn.mockRejectedValue(new Error("Email or password is incorrect."));

    const user = userEvent.setup();
    render(<Login />);

    await user.type(screen.getByLabelText(/email/i), "admin@careerveda.in");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", {name: /^sign in$/i}));

    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect/i);
  });

  // The self-serve reset is gone on purpose. Both halves are asserted because
  // the flow had two entry points, and restoring either one restores it: the
  // link on this screen, and a URL carrying a `token`, which used to open the
  // choose-a-new-password form on any path while signed out.
  it("offers no way to reach a password reset", () => {
    render(<Login />);

    expect(screen.queryByRole("button", {name: /forgot your password/i})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: /send reset link/i})).not.toBeInTheDocument();
  });

  it("shows the sign-in form even when the URL carries a reset token", () => {
    at("/reset-password?token=abc123");
    render(<Login />);

    expect(screen.getByRole("button", {name: /^sign in$/i})).toBeInTheDocument();
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });
});
