import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter, Route, Routes, useNavigate} from "react-router-dom";

const testState = vi.hoisted(() => ({permissions: []}));
const api = vi.hoisted(() => ({
  list: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  duplicate: vi.fn(),
  remove: vi.fn(),
  bulkStatus: vi.fn(),
  bulkDelete: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({can: (permission) => testState.permissions.includes(permission)}),
}));

vi.mock("../context/ToastContext", () => ({
  useToast: () => ({success: vi.fn(), error: vi.fn()}),
}));

vi.mock("../services/api", () => ({
  contentApi: () => api,
}));

const renderList = (path = "/programs", extras = null) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      {extras}
      <Routes>
        <Route path="/:resource" element={React.createElement(ResourceList)} />
      </Routes>
    </MemoryRouter>,
  );

const JumpToUnknown = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/not-a-resource")}>
      Go to unknown
    </button>
  );
};

let ResourceList;

describe("ResourceList permissions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    testState.permissions = ["programs.read"];
    api.list.mockResolvedValue({
      data: [{_id: "program-1", title: "Read-only program", category: "Test", status: "draft"}],
      meta: {page: 1, total: 1, totalPages: 1},
    });
    ({default: ResourceList} = await import("./ResourceList.jsx"));
  });

  afterEach(cleanup);

  it("renders a read-only program viewer without write or bulk controls", async () => {
    renderList();

    expect(await screen.findByText("Read-only program")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "View"})).toBeInTheDocument();
    expect(screen.queryByRole("link", {name: /new program/i})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Publish"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Duplicate"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Delete"})).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows only the write controls an editor is permitted to use", async () => {
    testState.permissions = ["programs.read", "programs.create", "programs.update"];
    renderList();

    expect(await screen.findByText("Read-only program")).toBeInTheDocument();
    expect(screen.getByRole("link", {name: /new program/i})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Edit"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Publish"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Duplicate"})).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Delete"})).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: /select/i})).toBeInTheDocument();
  });

  it("can move from a valid resource to an unknown route without changing hook order", async () => {
    renderList("/programs", React.createElement(JumpToUnknown));

    expect(await screen.findByText("Read-only program")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "Go to unknown"}));
    expect(await screen.findByText(/Unknown section "not-a-resource"/)).toBeInTheDocument();
  });
});
