// A request that never reaches the server is the failure an admin actually
// hits — the backend container is not running, the laptop is on a train — and
// fetch reports every one of them as a bare "Failed to fetch". That string went
// straight to the toast, where it told nobody what to check.

import {describe, it, expect, vi, afterEach} from "vitest";

import {api, applicationsApi, ApiError} from "./api";

describe("api transport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports an unreachable API as something a reader can act on", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );

    const failure = await api.get("/admin/faqs").catch((error) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure.code).toBe("NETWORK_ERROR");
    // The address matters: three services on three ports means a panel pointed
    // at the wrong one fails exactly like a panel whose backend is down.
    expect(failure.message).toMatch(/Could not reach the API at http.+backend is running/);
    // The original is kept rather than swallowed — it is what a bug report needs.
    expect(failure.fields.cause).toBe("Failed to fetch");
  });

  it("still surfaces the server's own message when the server does answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({success: false, error: {code: "VALIDATION_ERROR", message: "Question is required."}}),
            {status: 400, headers: {"Content-Type": "application/json"}},
          ),
        ),
      ),
    );

    const failure = await api.get("/admin/faqs").catch((error) => error);

    expect(failure.code).toBe("VALIDATION_ERROR");
    expect(failure.message).toBe("Question is required.");
  });

  // The refresh cookie is scoped to /api/v1/auth, so the browser attaches it to
  // change-password, session revoke and the 2FA calls, and the server's
  // csrfGuard 403s any such write without the header. Missing it broke all three.
  it("sends the CSRF token on writes, and not on reads", async () => {
    localStorage.setItem("cv_csrf_fallback", "csrf-123");
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({success: true, data: {}}), {status: 200, headers: {"Content-Type": "application/json"}})),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.post("/auth/change-password", {currentPassword: "a", newPassword: "b"});
    await api.get("/auth/sessions");

    expect(fetchMock.mock.calls[0][1].headers["X-CSRF-Token"]).toBe("csrf-123");
    expect(fetchMock.mock.calls[1][1].headers["X-CSRF-Token"]).toBeUndefined();
    localStorage.removeItem("cv_csrf_fallback");
  });

  // Opening a resume used to let fetch() follow a cross-origin 302 to ImageKit,
  // where CORS killed it and the error wrongly blamed the local API. The fix
  // asks for JSON so the hop is a plain navigation in the panel instead.
  it("loads a resume URL as same-origin JSON, not a followed redirect", async () => {
    const resumeUrl = "https://ik.imagekit.io/careerveda/resumes/file.pdf";
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({success: true, data: {url: resumeUrl}}),
          {status: 200, headers: {"Content-Type": "application/json"}},
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await applicationsApi.openResume("507f1f77bcf86cd799439011");

    expect(result).toEqual({url: resumeUrl});
    const requested = new URL(fetchMock.mock.calls[0][0]);
    expect(requested.pathname).toBe("/api/v1/admin/job-applications/507f1f77bcf86cd799439011/resume");
    expect(requested.searchParams.get("format")).toBe("json");
    // No cross-origin file fetch happens here; the panel opens the URL itself.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
