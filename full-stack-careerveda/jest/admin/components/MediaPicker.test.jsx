import {describe, expect, it, jest, beforeEach} from "@jest/globals";
// The admin components resolve React from admin/node_modules, so the renderer
// must come from the same copy — RTL at the root would pair root's react-dom
// with admin's React and every hook call would fail.
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "../../../admin/node_modules/@testing-library/react/dist/index.js";
import "../helpers/jest-dom.cjs";

import {mediaApi} from "../../../admin/src/services/api.js";
import {ToastProvider} from "../../../admin/src/context/ToastContext.jsx";
import {MediaPicker} from "../../../admin/src/components/MediaPicker.jsx";

// The picker talks to the Media Library over the network on mount. The suite
// stands in for the API with fixtures, so the assertions are about the picker's
// contract — what it shows, what it sends, what it hands back — not about the
// transport.
jest.mock("../../../admin/src/services/api", () => ({
  mediaApi: {
    list: jest.fn(),
    upload: jest.fn(),
    addFromUrl: jest.fn(),
  },
}));

const HERO = {
  _id: "m1",
  name: "hero.png",
  url: "https://ik.imagekit.io/q7ucn1rfni/careerveda/hero.png",
  alt: "Campus hero",
  width: 640,
  height: 480,
};

const WITH_QUERY = {
  _id: "m2",
  name: "logo.png",
  url: "https://ik.imagekit.io/q7ucn1rfni/careerveda/logo.png?updatedAt=1786622628327",
  alt: "Logo",
  width: 96,
  height: 96,
};

const FILE = new File(["bytes"], "hero.png", {type: "image/png"});

// The picker renders a <Modal>, whose mount effect calls showModal() — a real
// browser API jsdom does not ship. Stand in for it, marking the dialog open the
// way the real call does so the dialog role is computed.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function () {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function () {
    this.removeAttribute("open");
  });
});

const renderPicker = (props = {}) => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const view = render(
    <ToastProvider>
      <MediaPicker onSelect={onSelect} onClose={onClose} {...props} />
    </ToastProvider>,
  );
  return {onSelect, onClose, view};
};

beforeEach(() => {
  mediaApi.list.mockReset().mockResolvedValue({data: [HERO, WITH_QUERY]});
  mediaApi.upload.mockReset().mockResolvedValue({data: {media: HERO}});
  mediaApi.addFromUrl.mockReset().mockResolvedValue({data: {media: HERO}});
});

describe("MediaPicker", () => {
  it("opens as a labelled dialog and asks the API for the first page of media", async () => {
    renderPicker();

    expect(screen.getByRole("dialog", {name: "Media library"})).toBeInTheDocument();
    await waitFor(() => {
      expect(mediaApi.list).toHaveBeenCalledWith({limit: 60, search: undefined, folder: undefined});
    });
  });

  it("lists each item with its name, dimensions and a delivery-sized thumbnail", async () => {
    renderPicker();

    await screen.findByText("hero.png");

    expect(screen.getByAltText("Campus hero")).toHaveAttribute(
      "src",
      "https://ik.imagekit.io/q7ucn1rfni/careerveda/hero.png?tr=w-240,f-auto,q-70",
    );
    expect(screen.getByText("640×480")).toBeInTheDocument();
    // A URL that already carries a query gets the transform appended, not stuck on the end.
    expect(screen.getByAltText("Logo")).toHaveAttribute(
      "src",
      "https://ik.imagekit.io/q7ucn1rfni/careerveda/logo.png?updatedAt=1786622628327&tr=w-240,f-auto,q-70",
    );
  });

  it("selects an item by calling onSelect with the whole record, dimensions included", async () => {
    const {onSelect} = renderPicker();

    const tile = await screen.findByRole("button", {name: /hero\.png/});
    fireEvent.click(tile);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(HERO);
  });

  it("shows a loading skeleton until the library answers", () => {
    mediaApi.list.mockReturnValue(new Promise(() => {}));

    renderPicker();

    expect(screen.getByRole("status", {name: "Loading"})).toBeInTheDocument();
  });

  it("surfaces a failed request with a retry that asks again", async () => {
    mediaApi.list.mockRejectedValue(new Error("Media library is unreachable."));

    renderPicker();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Media library is unreachable.");

    // Swap the fixture for the retry; mockResolvedValue replaces the previous
    // implementation without wiping the call history.
    mediaApi.list.mockResolvedValue({data: [HERO]});
    fireEvent.click(within(alert).getByRole("button", {name: "Try again"}));

    await waitFor(() => {
      expect(mediaApi.list).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("hero.png")).toBeInTheDocument();
  });

  it("explains when the library has nothing in it yet", async () => {
    mediaApi.list.mockResolvedValue({data: []});

    renderPicker();

    expect(await screen.findByText("No images yet")).toBeInTheDocument();
    expect(screen.getByText("Upload one to get started.")).toBeInTheDocument();
  });

  it("refilters the library as the admin types a search, debounced", async () => {
    renderPicker();
    await screen.findByText("hero.png");

    fireEvent.change(screen.getByLabelText("Search images"), {target: {value: "hero"}});

    await waitFor(() => {
      expect(mediaApi.list).toHaveBeenLastCalledWith({limit: 60, search: "hero", folder: undefined});
    });
  });

  it("reloads from the API when the folder changes", async () => {
    renderPicker();
    await screen.findByText("hero.png");

    fireEvent.change(screen.getByLabelText("Folder"), {target: {value: "/careerveda/programs"}});

    await waitFor(() => {
      expect(mediaApi.list).toHaveBeenLastCalledWith({
        limit: 60,
        search: undefined,
        folder: "/careerveda/programs",
      });
    });
  });

  it("uploads the picked file into the selected folder and hands the record back", async () => {
    const {onSelect} = renderPicker();
    await screen.findByText("hero.png");

    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, {target: {files: [FILE]}});

    await waitFor(() => {
      expect(mediaApi.upload).toHaveBeenCalledWith(FILE, {folder: "/careerveda"});
    });
    expect(onSelect).toHaveBeenCalledWith(HERO);
  });

  it("says so when the API reports the upload was a duplicate", async () => {
    mediaApi.upload.mockResolvedValue({data: {media: HERO, duplicate: true}});

    const {onSelect} = renderPicker();
    await screen.findByText("hero.png");

    fireEvent.change(document.querySelector('input[type="file"]'), {target: {files: [FILE]}});

    expect(await screen.findByText("That image was already in the library.")).toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledWith(HERO);
  });

  it("keeps the picker open and reports the reason when an upload is refused", async () => {
    mediaApi.upload.mockRejectedValue(new Error("Disk full."));

    const {onSelect} = renderPicker();
    await screen.findByText("hero.png");

    fireEvent.change(document.querySelector('input[type="file"]'), {target: {files: [FILE]}});

    expect(await screen.findByText("Disk full.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", {name: "Media library"})).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("registers a pasted URL as a library item, on click or on Enter", async () => {
    const {onSelect} = renderPicker();
    await screen.findByText("hero.png");

    const urlInput = screen.getByLabelText("ImageKit URL");
    fireEvent.change(urlInput, {target: {value: " https://ik.imagekit.io/x/remote.png "}});
    fireEvent.keyDown(urlInput, {key: "Enter"});

    await waitFor(() => {
      expect(mediaApi.addFromUrl).toHaveBeenCalledWith(
        "https://ik.imagekit.io/x/remote.png",
        {folder: "/careerveda"},
      );
    });
    expect(onSelect).toHaveBeenCalledWith(HERO);
  });

  it("keeps the Add URL button disabled until something is pasted", async () => {
    renderPicker();
    await screen.findByText("hero.png");

    expect(screen.getByRole("button", {name: "Add URL"})).toBeDisabled();

    fireEvent.change(screen.getByLabelText("ImageKit URL"), {target: {value: "x"}});
    expect(screen.getByRole("button", {name: "Add URL"})).toBeEnabled();
  });

  it("uploads a file dropped onto the drop zone", async () => {
    const {onSelect} = renderPicker();
    await screen.findByText("hero.png");

    const zone = document.querySelector(".drop-zone");
    fireEvent.drop(zone, {dataTransfer: {files: [FILE]}});

    await waitFor(() => {
      expect(mediaApi.upload).toHaveBeenCalledWith(FILE, {folder: "/careerveda"});
    });
    expect(onSelect).toHaveBeenCalledWith(HERO);
  });

  it("closes through its × button without touching the library", async () => {
    const {onClose} = renderPicker();
    await screen.findByText("hero.png");

    fireEvent.click(screen.getByRole("button", {name: "Close"}));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mediaApi.list).toHaveBeenCalledTimes(1);
  });
});
