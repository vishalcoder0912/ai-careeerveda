import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {certificates} from "../data";
import {CertificateStudio} from "./CertificateStudio";

/* This project does not install @testing-library/jest-dom, so these use plain
   DOM assertions — getAttribute, .disabled, .textContent — the way the existing
   suite does. Reaching for toHaveAttribute/toBeDisabled would fail with
   "Invalid Chai property". */

/* jsdom implements <dialog> as inert: showModal/close do not exist and there is
   no top layer. Both are stubbed to flip `open` the way the browser does —
   without this the dialog never becomes visible and every assertion here is
   testing nothing. */
beforeEach(() => {
  if (typeof HTMLDialogElement !== "undefined") {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
});

afterEach(cleanup);

const setup = () => {
  const onClose = vi.fn();
  const utils = render(<CertificateStudio cert={certificates[0]} open onClose={onClose} />);
  return {...utils, onClose};
};

const nameField = () => screen.getByLabelText("Full name");
const typeName = (value) => fireEvent.change(nameField(), {target: {value}});
const downloadButton = () => screen.getByRole("button", {name: /download png/i});
const printButton = () => screen.getByRole("button", {name: /print/i});
const statusText = () => document.querySelector(".ga-cert-studio-status").textContent;
const credentialId = () =>
  document.querySelector(".ga-cert-studio-meta dd").textContent;

describe("CertificateStudio", () => {
  /* The parent holds the selected certificate in state and starts it as null, so
     the very first render of this component on the page has no certificate. The
     guard has to come before anything that reads `cert.mark` — including the
     dependency array, which is evaluated eagerly on every render. */
  it("renders nothing and does not throw when no certificate is selected", () => {
    expect(() => render(<CertificateStudio cert={null} open={false} onClose={() => {}} />)).not.toThrow();
    expect(document.querySelector(".ga-cert-studio")).toBeNull();
  });

  it("survives a certificate arriving after the first render", () => {
    const {rerender} = render(<CertificateStudio cert={null} open={false} onClose={() => {}} />);
    expect(() =>
      rerender(<CertificateStudio cert={certificates[0]} open onClose={() => {}} />),
    ).not.toThrow();
    expect(document.querySelector(".ga-cert-studio")).not.toBeNull();
  });

  it("opens the dialog and focuses the name field", async () => {
    setup();
    expect(document.querySelector(".ga-cert-studio").hasAttribute("open")).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(nameField()));
  });

  /* The print root is a second, hidden copy of the artwork. It is only needed
     between opening the dialog and printing, so it must not sit in <body> on
     every page load. */
  it("only puts the print root in the document while the dialog is open", () => {
    const {rerender} = render(
      <CertificateStudio cert={certificates[0]} open={false} onClose={() => {}} />,
    );
    expect(document.querySelector(".ga-cert-print")).toBeNull();

    rerender(<CertificateStudio cert={certificates[0]} open onClose={() => {}} />);
    expect(document.querySelector(".ga-cert-print")).not.toBeNull();
  });

  it("renders a live preview containing the typed name", () => {
    setup();
    typeName("Ananya Sharma");
    const preview = document.querySelector(".ga-cert-studio-preview .ga-cert-art");
    expect(preview.textContent).toContain("Ananya Sharma");
  });

  it("keeps both export buttons disabled until a usable name is typed", () => {
    setup();
    expect(downloadButton().disabled).toBe(true);
    expect(printButton().disabled).toBe(true);

    typeName("A");
    expect(downloadButton().disabled).toBe(true);
    expect(printButton().disabled).toBe(true);
  });

  it("enables export once the name is long enough", () => {
    setup();
    typeName("Ananya Sharma");
    expect(downloadButton().disabled).toBe(false);
    expect(printButton().disabled).toBe(false);
  });

  it("caps the input length", () => {
    setup();
    expect(nameField().getAttribute("maxlength")).toBe("48");
  });

  it("rejects a name that is too short and says so", () => {
    setup();
    typeName("A");
    fireEvent.blur(nameField());
    expect(document.querySelector(".ga-cert-studio-error").textContent).toMatch(/at least 2/i);
    expect(nameField().getAttribute("aria-invalid")).toBe("true");
  });

  it("associates the help text with the field", () => {
    setup();
    const describedBy = nameField().getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy)).not.toBeNull();
  });

  /* The same name has to produce the same ID, or downloading twice looks like two
     different certificates. */
  it("gives the same name the same credential ID", () => {
    const {unmount} = setup();
    typeName("Ananya Sharma");
    const first = credentialId();
    unmount();

    setup();
    typeName("Ananya Sharma");
    expect(credentialId()).toBe(first);
  });

  it("gives different names different credential IDs", () => {
    setup();
    typeName("Ananya Sharma");
    const first = credentialId();
    typeName("Rohan Verma");
    expect(credentialId()).not.toBe(first);
  });

  it("closes on the close button", () => {
    const {onClose} = setup();
    fireEvent.click(screen.getByRole("button", {name: /close certificate generator/i}));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on the backdrop but not on the panel", () => {
    const {onClose} = setup();
    const dialog = document.querySelector(".ga-cert-studio");

    fireEvent.click(dialog.querySelector(".ga-cert-studio-panel"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape and suppresses the native close", () => {
    const {onClose} = setup();
    const event = new Event("cancel", {cancelable: true});
    document.querySelector(".ga-cert-studio").dispatchEvent(event);
    expect(onClose).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("prints rather than downloading when asked for a PDF", () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    setup();
    typeName("Ananya Sharma");
    fireEvent.click(printButton());
    expect(print).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("does not print when no name has been entered", () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    setup();
    fireEvent.click(printButton());
    expect(print).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  /* The export is the whole point of the feature, so it is asserted end to end:
     a real blob handed to a real download click. jsdom has no canvas, so the
     canvas and Image are stubbed — the assertion is on the wiring, not the
     encoder. */
  it("downloads a PNG when the name is set", async () => {
    const blob = {size: 1234, type: "image/png"};
    vi.stubGlobal("URL", {...URL, createObjectURL: () => "blob:certificate", revokeObjectURL: () => {}});
    vi.stubGlobal("XMLSerializer", class {
      serializeToString(node) {
        return `<svg>${node.textContent}</svg>`;
      }
    });

    const toBlob = vi.fn((cb) => cb(blob));
    const realCreateElement = document.createElement.bind(document);
    document.createElement = (tag) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({fillRect() {}, drawImage() {}}),
          toBlob,
        };
      }
      return realCreateElement(tag);
    };

    class FakeImage {
      set src(value) {
        this._src = value;
        setTimeout(() => this.onload?.(), 0);
      }

      get src() {
        return this._src;
      }
    }
    vi.stubGlobal("Image", FakeImage);

    const realAnchorClick = HTMLAnchorElement.prototype.click;
    const clicked = [];
    HTMLAnchorElement.prototype.click = function click() {
      clicked.push({download: this.download, href: this.href});
    };

    setup();
    typeName("Ananya Sharma");

    /* The export waits on Image.onload, which the stub fires from a timer — so
       the assertions have to wait for it rather than run in the same tick as the
       click. */
    await act(async () => {
      fireEvent.click(downloadButton());
    });

    await waitFor(() => expect(toBlob).toHaveBeenCalled());
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe("PG-AIS-01-ananya-sharma.png");
    expect(clicked[0].href).toBe("blob:certificate");
    await waitFor(() => expect(statusText()).toMatch(/downloaded/i));

    HTMLAnchorElement.prototype.click = realAnchorClick;
    document.createElement = realCreateElement;
    vi.unstubAllGlobals();
  });

  it("sanitises the filename when the name has awkward characters", async () => {
    vi.stubGlobal("URL", {...URL, createObjectURL: () => "blob:x", revokeObjectURL: () => {}});
    vi.stubGlobal("XMLSerializer", class {
      serializeToString() {
        return "<svg/>";
      }
    });
    document.createElement = (() => {
      const real = document.createElement.bind(document);
      return (tag) =>
        tag === "canvas"
          ? {width: 0, height: 0, getContext: () => ({fillRect() {}, drawImage() {}}), toBlob: (cb) => cb({size: 1})}
          : real(tag);
    })();

    class FakeImage {
      set src(v) {
        this._src = v;
        setTimeout(() => this.onload?.(), 0);
      }
    }
    vi.stubGlobal("Image", FakeImage);

    const realAnchorClick = HTMLAnchorElement.prototype.click;
    const clicked = [];
    HTMLAnchorElement.prototype.click = function click() {
      clicked.push(this.download);
    };

    setup();
    typeName("  Ananya / Sharma  ");
    await act(async () => {
      fireEvent.click(downloadButton());
    });

    await waitFor(() => expect(clicked.length).toBe(1));
    expect(clicked[0]).toBe("PG-AIS-01-ananya-sharma.png");

    HTMLAnchorElement.prototype.click = realAnchorClick;
    vi.unstubAllGlobals();
  });

  it("explains a failed export instead of failing silently", async () => {
    vi.stubGlobal("XMLSerializer", class {
      serializeToString() {
        throw new Error("boom");
      }
    });

    setup();
    typeName("Ananya Sharma");
    await act(async () => {
      fireEvent.click(downloadButton());
    });

    await waitFor(() => expect(statusText()).toMatch(/printing to pdf/i));
    vi.unstubAllGlobals();
  });

  it("re-enables the download button after a failure", async () => {
    vi.stubGlobal("XMLSerializer", class {
      serializeToString() {
        throw new Error("boom");
      }
    });

    setup();
    typeName("Ananya Sharma");
    await act(async () => {
      fireEvent.click(downloadButton());
    });

    await waitFor(() => expect(downloadButton().disabled).toBe(false));
    vi.unstubAllGlobals();
  });
});
