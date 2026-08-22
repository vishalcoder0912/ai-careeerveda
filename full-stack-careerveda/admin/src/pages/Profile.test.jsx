import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const changePassword = vi.fn();
const listSessions = vi.fn();
const revokeSession = vi.fn();
const toast = {success: vi.fn(), error: vi.fn()};

vi.mock("../services/api", () => ({
  changePassword: (...args) => changePassword(...args),
  listSessions: (...args) => listSessions(...args),
  revokeSession: (...args) => revokeSession(...args),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    admin: {name: "Super Admin", email: "super@careerveda.in", role: "super admin"},
  }),
}));

vi.mock("../context/ToastContext", () => ({useToast: () => toast}));

const {default: Profile} = await import("./Profile.jsx");

const session = (id, overrides = {}) => ({
  _id: id,
  userAgent: "Chrome on Windows",
  ipPrefix: "203.0.113.x",
  createdAt: "2026-06-01T10:00:00.000Z",
  ...overrides,
});

const fillPasswordForm = async (user, {current = "OldPassw0rd!", next, confirm}) => {
  await user.type(screen.getByLabelText("Current password"), current);
  await user.type(screen.getByLabelText("New password"), next);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
  await user.click(screen.getByRole("button", {name: /change password/i}));
};

describe("Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSessions.mockResolvedValue({data: []});
    changePassword.mockResolvedValue(undefined);
    revokeSession.mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it("identifies the signed-in account", async () => {
    render(<Profile />);

    expect(screen.getByText(/super@careerveda\.in/)).toBeInTheDocument();
    expect(screen.getByText(/super admin/)).toBeInTheDocument();
    await waitFor(() => expect(listSessions).toHaveBeenCalled());
  });

  describe("changing the password", () => {
    // The server only ever receives one new password, so it cannot tell whether
    // the user typed it twice. This check exists nowhere else.
    it("refuses a mismatched confirmation without calling the API", async () => {
      const user = userEvent.setup();
      render(<Profile />);

      await fillPasswordForm(user, {next: "aNewPassw0rd!", confirm: "aDifferentOne!"});

      expect(await screen.findByRole("alert")).toHaveTextContent("The two new passwords do not match.");
      expect(changePassword).not.toHaveBeenCalled();
    });

    it("sends the current and new password", async () => {
      const user = userEvent.setup();
      render(<Profile />);

      await fillPasswordForm(user, {next: "aNewPassw0rd!", confirm: "aNewPassw0rd!"});

      await waitFor(() =>
        expect(changePassword).toHaveBeenCalledWith("OldPassw0rd!", "aNewPassw0rd!"),
      );
    });

    it("clears the fields and confirms once the change succeeds", async () => {
      const user = userEvent.setup();
      render(<Profile />);

      await fillPasswordForm(user, {next: "aNewPassw0rd!", confirm: "aNewPassw0rd!"});

      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(screen.getByLabelText("Current password")).toHaveValue("");
      expect(screen.getByLabelText("New password")).toHaveValue("");
      expect(screen.getByLabelText("Confirm new password")).toHaveValue("");
    });

    // Changing the password signs the other devices out, so the list on screen
    // is stale the moment it succeeds.
    it("reloads the sessions after a successful change", async () => {
      const user = userEvent.setup();
      render(<Profile />);
      await waitFor(() => expect(listSessions).toHaveBeenCalledTimes(1));

      await fillPasswordForm(user, {next: "aNewPassw0rd!", confirm: "aNewPassw0rd!"});

      await waitFor(() => expect(listSessions).toHaveBeenCalledTimes(2));
    });

    it("prefers the server's per-field message over the generic one", async () => {
      changePassword.mockRejectedValue({
        message: "Validation failed",
        fields: {newPassword: "That password is too common."},
      });
      const user = userEvent.setup();
      render(<Profile />);

      await fillPasswordForm(user, {next: "password1234", confirm: "password1234"});

      expect(await screen.findByRole("alert")).toHaveTextContent("That password is too common.");
    });

    it("shows a wrong current password against the field the server named", async () => {
      changePassword.mockRejectedValue({
        message: "Validation failed",
        fields: {currentPassword: "Current password is incorrect."},
      });
      const user = userEvent.setup();
      render(<Profile />);

      await fillPasswordForm(user, {next: "aNewPassw0rd!", confirm: "aNewPassw0rd!"});

      expect(await screen.findByRole("alert")).toHaveTextContent("Current password is incorrect.");
    });

    it("falls back to the error message when no field is named", async () => {
      changePassword.mockRejectedValue(new Error("Too many attempts. Try again later."));
      const user = userEvent.setup();
      render(<Profile />);

      await fillPasswordForm(user, {next: "aNewPassw0rd!", confirm: "aNewPassw0rd!"});

      expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Try again later.");
    });

    it("re-enables the button after a failure so the change can be retried", async () => {
      changePassword.mockRejectedValue(new Error("Network down"));
      const user = userEvent.setup();
      render(<Profile />);

      await fillPasswordForm(user, {next: "aNewPassw0rd!", confirm: "aNewPassw0rd!"});

      await waitFor(() =>
        expect(screen.getByRole("button", {name: /change password/i})).toBeEnabled(),
      );
    });
  });

  describe("active sessions", () => {
    it("shows a skeleton until the list arrives", () => {
      listSessions.mockReturnValue(new Promise(() => {}));
      render(<Profile />);

      expect(screen.getByRole("status")).toHaveAccessibleName("Loading");
    });

    it("lists each session with its device and network", async () => {
      listSessions.mockResolvedValue({data: [session("s1")]});
      render(<Profile />);

      expect(await screen.findByText("Chrome on Windows")).toBeInTheDocument();
      expect(screen.getByText(/203\.0\.113\.x/)).toBeInTheDocument();
    });

    it("names an unidentified device rather than leaving the row blank", async () => {
      listSessions.mockResolvedValue({data: [session("s1", {userAgent: null, ipPrefix: null})]});
      render(<Profile />);

      expect(await screen.findByText("Unknown device")).toBeInTheDocument();
      expect(screen.getByText(/unknown network/)).toBeInTheDocument();
    });

    it("revokes the session whose button was used", async () => {
      listSessions.mockResolvedValue({data: [session("s1"), session("s2", {userAgent: "Safari"})]});
      const user = userEvent.setup();
      render(<Profile />);
      await screen.findByText("Safari");

      await user.click(screen.getAllByRole("button", {name: "Revoke"})[1]);

      expect(revokeSession).toHaveBeenCalledWith("s2");
    });

    it("reloads the list after a revoke", async () => {
      listSessions.mockResolvedValue({data: [session("s1")]});
      const user = userEvent.setup();
      render(<Profile />);
      await screen.findByText("Chrome on Windows");

      await user.click(screen.getByRole("button", {name: "Revoke"}));

      await waitFor(() => expect(listSessions).toHaveBeenCalledTimes(2));
      expect(toast.success).toHaveBeenCalledWith("Session revoked.");
    });

    it("reports a failed revoke through a toast", async () => {
      listSessions.mockResolvedValue({data: [session("s1")]});
      revokeSession.mockRejectedValue(new Error("That session is already gone."));
      const user = userEvent.setup();
      render(<Profile />);
      await screen.findByText("Chrome on Windows");

      await user.click(screen.getByRole("button", {name: "Revoke"}));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("That session is already gone."));
    });

    it("offers a retry when the list itself fails to load", async () => {
      listSessions.mockRejectedValueOnce(new Error("Sessions are unavailable."));
      const user = userEvent.setup();
      render(<Profile />);

      expect(await screen.findByRole("alert")).toHaveTextContent("Sessions are unavailable.");

      listSessions.mockResolvedValue({data: [session("s1")]});
      await user.click(screen.getByRole("button", {name: /try again/i}));

      expect(await screen.findByText("Chrome on Windows")).toBeInTheDocument();
    });
  });
});
