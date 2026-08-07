import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen, within} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

const list = vi.fn();
const contentApi = vi.fn(() => ({list}));
const leadsStats = vi.fn();
const can = vi.fn();

vi.mock("../services/api", () => ({
  contentApi: (...args) => contentApi(...args),
  leadsApi: {stats: (...args) => leadsStats(...args)},
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({admin: {name: "Super Admin", email: "super@careerveda.in"}, can}),
}));

const {default: Dashboard} = await import("./Dashboard.jsx");
const {RESOURCE_LIST, resourcePermission} = await import("../config/resources.js");

const READ_PERMISSIONS = RESOURCE_LIST.map((resource) => resourcePermission(resource, "read"));

const renderDashboard = async () => {
  const view = render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
  await screen.findByRole("heading", {name: /welcome back/i});
  return view;
};

const emptyPage = {meta: {total: 0}, data: []};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contentApi.mockImplementation(() => ({list}));
    list.mockResolvedValue(emptyPage);
    leadsStats.mockResolvedValue({data: {total: 0, todayCount: 0}});
    // Read everything, see no leads, unless a case says otherwise.
    can.mockImplementation((permission) => READ_PERMISSIONS.includes(permission));
  });

  afterEach(cleanup);

  it("greets the admin by first name only", async () => {
    await renderDashboard();

    expect(screen.getByRole("heading", {name: "Welcome back, Super"})).toBeInTheDocument();
  });

  it("falls back to a nameless greeting when the account has no name", async () => {
    vi.resetModules();
    vi.doMock("../context/AuthContext", () => ({useAuth: () => ({admin: {}, can})}));
    const {default: Nameless} = await import("./Dashboard.jsx");

    render(
      <MemoryRouter>
        <Nameless />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", {name: "Welcome back"})).toBeInTheDocument();
    vi.doUnmock("../context/AuthContext");
  });

  it("shows a skeleton until every resource has answered", async () => {
    list.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveAccessibleName("Loading");
  });

  // A permission check that fails open here leaks the existence of a section the
  // user cannot open — and every card links to a list the API would refuse.
  it("asks only for the resources the account may read", async () => {
    can.mockImplementation((permission) => permission === "programs.read");

    await renderDashboard();

    expect(contentApi).toHaveBeenCalledTimes(1);
    expect(contentApi).toHaveBeenCalledWith("programs");
  });

  it("requests the newest records of each readable resource", async () => {
    can.mockImplementation((permission) => permission === "programs.read");

    await renderDashboard();

    expect(list).toHaveBeenCalledWith({limit: 6, sort: "updatedAt", order: "desc"});
  });

  it("shows each readable resource with its total", async () => {
    can.mockImplementation((permission) => permission === "programs.read");
    list.mockResolvedValue({meta: {total: 9}, data: []});

    await renderDashboard();

    expect(screen.getByText("9 items")).toBeInTheDocument();
  });

  it("writes a total of one in the singular", async () => {
    can.mockImplementation((permission) => permission === "programs.read");
    list.mockResolvedValue({meta: {total: 1}, data: []});

    await renderDashboard();

    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("offers a create link only where the account may create", async () => {
    can.mockImplementation((permission) => permission === "programs.read");

    await renderDashboard();

    expect(screen.queryByRole("link", {name: /create new/i})).not.toBeInTheDocument();
  });

  it("caps the hero to three create shortcuts", async () => {
    can.mockReturnValue(true);
    leadsStats.mockResolvedValue({data: {total: 0}});

    await renderDashboard();

    expect(screen.getAllByRole("link", {name: /^\+?\s*New /i})).toHaveLength(3);
  });

  describe("recent activity", () => {
    const record = (id, updatedAt) => ({
      _id: id,
      title: `Record ${id}`,
      name: `Record ${id}`,
      question: `Record ${id}`,
      status: "published",
      updatedAt,
    });

    it("says so when nothing has been edited", async () => {
      await renderDashboard();

      expect(screen.getByText("No content has been edited yet.")).toBeInTheDocument();
    });

    it("merges every resource into one list, newest first", async () => {
      can.mockImplementation((permission) => permission === "programs.read");
      list.mockResolvedValue({
        meta: {total: 2},
        data: [record("older", "2026-01-01T00:00:00.000Z"), record("newer", "2026-06-01T00:00:00.000Z")],
      });

      await renderDashboard();

      const titles = screen.getAllByRole("link", {name: /^Record /}).map((link) => link.textContent);
      expect(titles).toEqual(["Record newer", "Record older"]);
    });

    // The panel is captioned "Latest 8 updates". Six resources returning six
    // records each is 36, and rendering all of them turns the dashboard into a
    // scroll.
    it("keeps only the eight most recent across all resources", async () => {
      const many = Array.from({length: 6}, (unused, index) =>
        record(`r${index}`, new Date(2026, 0, index + 1).toISOString()),
      );
      list.mockResolvedValue({meta: {total: 6}, data: many});

      await renderDashboard();

      expect(screen.getAllByRole("link", {name: /^Record /})).toHaveLength(8);
    });

    it("labels a record with no title rather than rendering a blank row", async () => {
      can.mockImplementation((permission) => permission === "programs.read");
      list.mockResolvedValue({
        meta: {total: 1},
        data: [{_id: "x", status: "draft", updatedAt: "2026-06-01T00:00:00.000Z"}],
      });

      await renderDashboard();

      expect(screen.getByRole("link", {name: "Untitled"})).toBeInTheDocument();
    });

    it.each([
      [30 * 1000, "just now"],
      [5 * 60 * 1000, "5m ago"],
      [4 * 60 * 60 * 1000, "4h ago"],
      [3 * 24 * 60 * 60 * 1000, "3d ago"],
    ])("writes an edit %sms old as %s", async (age, expected) => {
      can.mockImplementation((permission) => permission === "programs.read");
      list.mockResolvedValue({
        meta: {total: 1},
        data: [record("a", new Date(Date.now() - age).toISOString())],
      });

      await renderDashboard();

      expect(screen.getByText(expected)).toBeInTheDocument();
    });

    // Past a week "42d ago" stops meaning anything, so it becomes a date.
    it("falls back to a date once an edit is over a week old", async () => {
      can.mockImplementation((permission) => permission === "programs.read");
      list.mockResolvedValue({
        meta: {total: 1},
        data: [record("a", "2026-01-15T00:00:00.000Z")],
      });

      await renderDashboard();

      expect(screen.getByText("2026-01-15")).toBeInTheDocument();
    });
  });

  describe("enquiries panel", () => {
    it("is absent when the account may not read forms", async () => {
      await renderDashboard();

      expect(leadsStats).not.toHaveBeenCalled();
      expect(screen.queryByText("Enrollment inquiries")).not.toBeInTheDocument();
    });

    it("shows the totals when the account may read forms", async () => {
      can.mockImplementation(
        (permission) => READ_PERMISSIONS.includes(permission) || permission === "forms.read",
      );
      leadsStats.mockResolvedValue({data: {total: 12, todayCount: 2}});

      await renderDashboard();

      const panel = screen.getByText("Enrollment inquiries").closest("section");
      expect(within(panel).getByText("12")).toBeInTheDocument();
      expect(within(panel).getByText("2")).toBeInTheDocument();
    });

    it("shows a zero for today when the API omits the count", async () => {
      can.mockImplementation(
        (permission) => READ_PERMISSIONS.includes(permission) || permission === "forms.read",
      );
      leadsStats.mockResolvedValue({data: {total: 4}});

      await renderDashboard();

      const panel = screen.getByText("Enrollment inquiries").closest("section");
      expect(within(panel).getByText("0")).toBeInTheDocument();
    });

    it("breaks the enquiries down by user type", async () => {
      can.mockImplementation(
        (permission) => READ_PERMISSIONS.includes(permission) || permission === "forms.read",
      );
      leadsStats.mockResolvedValue({
        data: {total: 12, todayCount: 2, byUserType: {Student: 10, "Working Professional": 2}},
      });

      await renderDashboard();

      expect(screen.getByText("Student")).toBeInTheDocument();
      expect(screen.getByText("Working Professional")).toBeInTheDocument();
    });
  });

  // One resource refusing must not leave the dashboard on a spinner: Promise.all
  // rejects as a whole, so the catch is the only thing between a failed request
  // and a permanent skeleton.
  it("shows the failure instead of loading forever when a resource refuses", async () => {
    list.mockRejectedValue(new Error("Programs could not be loaded."));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Programs could not be loaded.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the failure when the leads request is the one that refuses", async () => {
    can.mockImplementation(
      (permission) => READ_PERMISSIONS.includes(permission) || permission === "forms.read",
    );
    leadsStats.mockRejectedValue(new Error("Leads are unavailable."));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Leads are unavailable.");
  });
});
