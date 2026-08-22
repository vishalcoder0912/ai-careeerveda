import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

const list = vi.fn();
const stats = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const can = vi.fn();

vi.mock("../services/api", () => ({
  leadsApi: {
    list: (...args) => list(...args),
    stats: (...args) => stats(...args),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({can}),
}));

vi.mock("../context/ToastContext", () => ({
  useToast: () => ({success: toastSuccess, error: toastError}),
}));

const {default: Leads} = await import("./Leads.jsx");

const lead = (overrides = {}) => ({
  _id: "lead-1",
  name: "Alice Chen",
  email: "alice@example.com",
  mobile: "9000000001",
  type: "consultation",
  program: "PG Program in GEN AI",
  status: "new",
  userType: "Student",
  sourcePage: "/contact",
  utm: null,
  message: "",
  spamScore: 0,
  notes: [],
  createdAt: "2026-08-20T10:00:00.000Z",
  ...overrides,
});

const page = (rows, total) => ({data: rows, meta: {page: 1, total, totalPages: 1}});

const renderLeads = () =>
  render(
    <MemoryRouter>
      <Leads />
    </MemoryRouter>,
  );

// The initial load is behind a 0ms debounce, and the poll loop behind a 10s
// interval, so tests drive both through fake timers. Each step flushes the
// microtasks a resolved fetch schedules.
const tick = (milliseconds) => act(async () => {
  vi.advanceTimersByTime(milliseconds);
});
const flush = () => act(async () => {});

describe("Leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    can.mockReturnValue(true);
    stats.mockResolvedValue({data: {total: 1, todayCount: 0, byUserType: {}}});
    list.mockResolvedValue(page([lead()], 1));
    // jsdom has the <dialog> element but not its native showModal/close, and a
    // dialog without the open attribute hides its content from the
    // accessibility tree — so the stubs also flip the attribute.
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the inbox and its totals from the first load", async () => {
    renderLeads();
    await tick(0);
    await flush();

    expect(screen.getByRole("heading", {name: "Leads"})).toBeInTheDocument();
    expect(screen.getByText(/1 records/)).toBeInTheDocument();
    expect(screen.getByText("Alice Chen")).toBeInTheDocument();
    expect(screen.getByText("Total inquiries")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.queryByRole("status", {name: "Loading"})).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no submissions yet", async () => {
    list.mockResolvedValue(page([], 0));
    stats.mockResolvedValue({data: {total: 0, todayCount: 0, byUserType: {}}});

    renderLeads();
    await tick(0);
    await flush();

    expect(screen.getByRole("heading", {name: "No leads yet"})).toBeInTheDocument();
    expect(screen.getByText(/0 records/)).toBeInTheDocument();
  });

  it("adds a submission that arrives while the page is open, without a skeleton", async () => {
    const alice = lead();
    list.mockResolvedValueOnce(page([alice], 1));
    list.mockResolvedValueOnce(
      page(
        [lead({_id: "lead-2", name: "Newcomer", type: "enrollment", createdAt: "2026-08-20T11:00:00.000Z"}), alice],
        2,
      ),
    );

    renderLeads();
    await tick(0);
    await flush();
    expect(screen.getByText("Alice Chen")).toBeInTheDocument();

    await tick(10_000);
    await flush();

    // The new submission is on the page, the total moved, and the refresh
    // never flashed the loading skeleton over the rows.
    expect(screen.getByText("Newcomer")).toBeInTheDocument();
    expect(screen.getByText(/2 records/)).toBeInTheDocument();
    expect(screen.queryByRole("status", {name: "Loading"})).not.toBeInTheDocument();
    expect(toastSuccess).toHaveBeenCalledWith("New enrollment lead from Newcomer.");

    // A steady inbox on the next tick is not a second notification.
    await tick(10_000);
    await flush();
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it("pauses the background refresh while a search is in progress", async () => {
    renderLeads();
    await tick(0);
    await flush();
    expect(list).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole("searchbox"), {target: {value: "Ali"}});
    await tick(300);
    await flush();
    expect(list).toHaveBeenCalledTimes(2);

    // Two ticks while the search is still typed: no background list fetch.
    await tick(20_000);
    await flush();
    expect(list).toHaveBeenCalledTimes(2);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("keeps the rows untouched while the detail modal is open", async () => {
    renderLeads();
    await tick(0);
    await flush();

    fireEvent.click(screen.getByRole("button", {name: "View"}));
    await tick(20_000);
    await flush();
    expect(list).toHaveBeenCalledTimes(1);

    // Closing the modal lets the next tick pick the inbox up again.
    fireEvent.click(screen.getByRole("button", {name: "Close"}));
    await tick(10_000);
    await flush();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("does not poll while the tab is hidden", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");

    renderLeads();
    await tick(0);
    await flush();
    expect(list).toHaveBeenCalledTimes(1);

    Object.defineProperty(Document.prototype, "visibilityState", {configurable: true, get: () => "hidden"});
    try {
      await tick(20_000);
      await flush();
      expect(list).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(Document.prototype, "visibilityState", descriptor);
    }
  });

  it("shows a count toast when a submission is hidden by a status filter", async () => {
    const alice = lead({status: "contacted"});
    list.mockResolvedValueOnce(page([alice], 1));
    list.mockResolvedValueOnce(page([alice], 1));
    // A new lead arrived, but it is "new" and the admin is filtering to
    // "contacted", so the page of rows does not change — only the totals do.
    list.mockResolvedValueOnce(page([alice], 2));

    renderLeads();
    await tick(0);
    await flush();

    fireEvent.change(screen.getByRole("combobox", {name: "Status"}), {target: {value: "contacted"}});
    await tick(0);
    await flush();

    await tick(10_000);
    await flush();

    expect(toastSuccess).toHaveBeenCalledWith("1 new lead in the inbox.");
  });
});