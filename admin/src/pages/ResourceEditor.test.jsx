// The editor is the panel's most complex screen and the only one that renders
// every field kind, so a mistake here takes the whole app down rather than one
// section: a throw during render unmounts the React tree and leaves a blank
// page with nothing on screen to say why.
//
// That is not hypothetical. The readiness panel referred to a `prefilled`
// variable that was never declared, and every create screen threw a
// ReferenceError. The build was clean and the unit tests passed, because
// nothing rendered the component. This does.

import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {render, screen, cleanup, fireEvent} from "@testing-library/react";
import {MemoryRouter, Routes, Route} from "react-router-dom";

import {RESOURCES} from "../config/resources";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({can: () => true, admin: {name: "Test"}, restoring: false}),
}));

vi.mock("../context/ToastContext", () => ({
  useToast: () => ({success: vi.fn(), error: vi.fn()}),
}));

vi.mock("../services/api", () => ({
  contentApi: () => ({
    get: vi.fn(() => Promise.resolve({data: {}})),
    create: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    revisions: vi.fn(),
    rollback: vi.fn(),
  }),
}));

const renderEditor = async (path) => {
  const {default: ResourceEditor} = await import("./ResourceEditor.jsx");
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:resource/:id" element={<ResourceEditor />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("ResourceEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // vite.config.js sets `globals: false`, so Testing Library never registers its
  // automatic afterEach cleanup — without this every render stays in the
  // document and the next case matches the previous case's markup.
  afterEach(cleanup);

  // Every resource, because the prefill code paths differ by which fields
  // declare an `initial` — programs and jobs have them, others do not.
  it.each(Object.keys(RESOURCES))("renders the create screen for %s", async (name) => {
    await renderEditor(`/${name}/new`);
    expect(await screen.findByRole("heading", {level: 1})).toBeInTheDocument();
  });

  it("counts the prefilled fields rather than throwing on an undeclared name", async () => {
    // jobs declares initial: "On-site" on workMode, so the note is shown and its
    // count has to come from somewhere real.
    await renderEditor("/jobs/new");
    expect(await screen.findByText(/prefilled with the values every/i)).toBeInTheDocument();
  });

  it("shows no prefill note for a resource with no defaults", async () => {
    // faculty declares no `initial` anywhere, so the note must be absent — the
    // guard has to be a count, not a truthy object that is always present.
    await renderEditor("/faculty/new");
    expect(screen.queryByText(/prefilled with the values every/i)).not.toBeInTheDocument();
  });

  it("keeps a typed batch date by switching the mode to Custom", async () => {
    // The backend replaces an auto-mode date with the next Saturday. Typing a
    // date must therefore flip the mode here, or the editor's own change would
    // be discarded the moment they pressed Save.
    await renderEditor("/programs/new");
    const dateInput = await screen.findByLabelText("Next batch", {exact: true});
    // Pricing opens or folds with the other sections; query it even when the
    // details panel is closed so the test does not depend on layout defaults.
    const modeSelect = screen.getByLabelText(/Next batch mode/, {hidden: true});

    expect(modeSelect.value).toBe("auto");
    fireEvent.change(dateInput, {target: {value: "September 19, 2026"}});
    expect(dateInput.value).toBe("September 19, 2026");
    expect(modeSelect.value).toBe("custom");
  });
});
