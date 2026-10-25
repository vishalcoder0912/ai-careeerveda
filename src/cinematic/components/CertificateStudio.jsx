import {useCallback, useEffect, useId, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {Download, Printer, X} from "lucide-react";
import {useLockSmoothScroll} from "../../lib/smoothScroll";
import {CertificateArt, HEIGHT as CERT_HEIGHT, WIDTH as CERT_WIDTH} from "./CertificateArt";
import "./certificate-studio.css";

/* 2x the artwork's own dimensions. The numbers themselves come from
   CertificateArt — see the note there on why they are not repeated. */
const EXPORT_SCALE = 2;

const MAX_NAME = 48;

/* A stable credential id: the same name on the same programme always produces
   the same id, so re-opening the studio or downloading twice does not look like
   two different certificates. FNV-1a is enough for an opaque reference and needs
   no dependency. This is a reference, not a security token — nothing is
   authorised by it. */
const serialFor = (mark, name) => {
  const seed = `${mark}|${name.trim().toLowerCase()}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const body = (hash >>> 0).toString(36).toUpperCase().padStart(7, "0");
  return `CV-${body.slice(0, 4)}-${body.slice(4)}`;
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {day: "2-digit", month: "short", year: "numeric"});
const formatDate = (date) => DATE_FORMAT.format(date);

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "recipient";

/* Serialise the live SVG node, then repaint it onto a canvas.

   The alternative — html2canvas — is a new dependency that walks computed styles
   and rasterises text. This is the browser's own renderer drawing vector text
   onto a 2x bitmap, which ships nothing and produces a sharper file.

   encodeURIComponent rather than btoa, which throws on anything outside Latin-1
   and would fail immediately on a non-Latin name. */
/* An SVG painted through an <img> is sandboxed: it cannot fetch anything, so
   an <image href="/images/…"> shows on screen and then silently drops out of
   the download. Fetch each one and inline it as a data URL first. A file that
   cannot be fetched is removed rather than failing the whole export. */
const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const inlineImages = async (svg) => {
  await Promise.all(
    Array.from(svg.querySelectorAll("image")).map(async (node) => {
      const href = node.getAttribute("href");
      if (!href || href.startsWith("data:")) return;
      try {
        const response = await fetch(href);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        node.setAttribute("href", await blobToDataUrl(await response.blob()));
      } catch {
        node.remove();
      }
    }),
  );
};

const exportPng = async (svgNode, filename) => {
  const clone = svgNode.cloneNode(true);
  await inlineImages(clone);
  return new Promise((resolve, reject) => {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(CERT_WIDTH));
    clone.setAttribute("height", String(CERT_HEIGHT));

    const markup = new XMLSerializer().serializeToString(clone);
    const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

    const image = new Image();
    image.onload = () => {
      let canvas;
      try {
        canvas = document.createElement("canvas");
        canvas.width = CERT_WIDTH * EXPORT_SCALE;
        canvas.height = CERT_HEIGHT * EXPORT_SCALE;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      } catch {
        reject(new Error("The certificate could not be rendered. Try printing to PDF instead."));
        return;
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("The certificate could not be rendered. Try printing to PDF instead."));
            return;
          }
          const href = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = href;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          // Revoking synchronously can cancel the download in some browsers.
          setTimeout(() => URL.revokeObjectURL(href), 10000);
          resolve();
        },
        "image/png",
      );
    };
    image.onerror = () =>
      reject(new Error("The certificate could not be rendered. Try printing to PDF instead."));
    image.src = source;
  });
};

export const CertificateStudio = ({cert, open, onClose}) => {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const returnFocusRef = useRef(null);

  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const titleId = useId();
  const helpId = useId();

  const cleanName = name.trim();
  const canExport = cleanName.length >= 2;
  const nameError = touched && !canExport ? "Enter at least 2 characters." : "";

  /* The parent keeps the selected certificate in state and starts it as null, so
     the first render of this component on the page has no `cert`. Every read has
     to tolerate that — including the dependency array below, which is evaluated
     eagerly on every render, before any guard further down could run. An earlier
     version read `cert.mark` straight into that array and threw a TypeError on
     page load, which is a white screen rather than a missing dialog. */
  const mark = cert?.mark ?? "";

  const serial = useMemo(
    () => (canExport ? serialFor(mark, cleanName) : "CV-••••-•••"),
    [mark, canExport, cleanName],
  );
  const issuedOn = useMemo(() => formatDate(new Date()), []);

  /* Lenis keeps consuming wheel events behind an overlay, so the page behind the
     dialog would scroll while the user scrolls the dialog. */
  useLockSmoothScroll(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement;
      dialog.showModal();
      // Focus the field rather than the first button: the whole purpose of this
      // dialog is to type a name, so making the user tab past Close to start is
      // the wrong first action.
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    if (!open && dialog.open) dialog.close();
  }, [open]);

  /* Native <dialog> restores focus to the previously focused element, but only
     if it is still in the document. The originating card can be unmounted by
     the reveal observer while the dialog is open, so guard rather than assume. */
  useEffect(() => {
    if (open) return;
    const target = returnFocusRef.current;
    if (target && document.contains(target) && typeof target.focus === "function") target.focus();
  }, [open]);

  /* Fresh form each time it opens — a stale name from a previous visit reads as a
     real recipient and then gets downloaded by accident. Reset on the way out
     rather than in an effect keyed on `open`: an effect that calls setState
     synchronously forces a second render pass every close, and the reset only
     ever needs to happen on the path that closes the dialog anyway. */
  const handleClose = useCallback(() => {
    setName("");
    setTouched(false);
    setBusy(false);
    setStatus("");
    setError("");
    onClose();
  }, [onClose]);

  const handleDownload = useCallback(async () => {
    const art = dialogRef.current?.querySelector(".ga-cert-studio-preview .ga-cert-art");
    if (!art || !canExport || busy) return;
    setBusy(true);
    setStatus("Rendering your certificate…");
    setError("");
    try {
      await exportPng(art, `${mark}-${slugify(cleanName)}.png`);
      setStatus("Downloaded. Check your Downloads folder.");
    } catch (exportError) {
      /* Deliberately not exportError.message: anything thrown in here can be a
         browser or library string, and a failed download is not the moment to
         show a visitor a stack fragment. The real reason goes to the console. */
      console.error("Certificate export failed:", exportError);
      setError("The certificate could not be rendered. Try printing to PDF instead.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }, [busy, canExport, mark, cleanName]);

  const handlePrint = useCallback(() => {
    if (!canExport) return;
    setError("");
    setStatus("");
    window.print();
  }, [canExport]);

  /* Safe here, and only here: every hook above has already run, so a render with
     `cert` and one without it call the same hooks in the same order. Moving this
     guard to the top of the component would make the hook count depend on the
     prop, and React would fail the moment a certificate was selected. */
  if (!cert) return null;

  const art = (
    <CertificateArt
      cert={cert}
      name={cleanName}
      serial={serial}
      issuedOn={issuedOn}
      className="ga-cert-art"
    />
  );

  return (
    <>
      <dialog
        className="ga-cert-studio"
        ref={dialogRef}
        aria-labelledby={titleId}
        // A stopped Lenis preventDefaults every wheel/touch event, including
        // ones inside this dialog — on mobile the body could not scroll at all.
        data-lenis-prevent
        onCancel={(event) => {
          // Handle it ourselves so the single close path also runs, instead of
          // the native close firing alongside it.
          event.preventDefault();
          handleClose();
        }}
        onClick={(event) => {
          // A click that lands on the dialog element itself landed on the
          // backdrop; clicks on the panel bubble from a child and are ignored.
          if (event.target === dialogRef.current) handleClose();
        }}
        onClose={handleClose}
      >
        <div className="ga-cert-studio-panel">
          <header className="ga-cert-studio-head">
            <div>
              <p className="ga-cert-studio-mark">{cert.mark}</p>
              <h3 className="ga-cert-studio-title" id={titleId}>
                Generate your certificate
              </h3>
              <p className="ga-cert-studio-sub">
                Type your name exactly as you want it printed. The preview updates live.
              </p>
            </div>
            <button
              type="button"
              className="ga-cert-studio-close"
              onClick={handleClose}
              aria-label="Close certificate generator"
              data-cursor
            >
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </header>

          <div className="ga-cert-studio-body">
            <div className="ga-cert-studio-controls">
              <label className="ga-cert-studio-label" htmlFor="ga-cert-name">
                Full name
              </label>
              <input
                id="ga-cert-name"
                ref={inputRef}
                className="ga-cert-studio-input"
                type="text"
                value={name}
                maxLength={MAX_NAME}
                placeholder="e.g. Ananya Sharma"
                autoComplete="name"
                spellCheck="false"
                aria-describedby={helpId}
                aria-invalid={nameError ? true : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  setTouched(true);
                  setStatus("");
                  setError("");
                }}
                onBlur={() => setTouched(true)}
              />
              <p className="ga-cert-studio-help" id={helpId}>
                Up to {MAX_NAME} characters.
              </p>
              {nameError ? (
                <p className="ga-cert-studio-error" role="alert">
                  {nameError}
                </p>
              ) : null}

              <dl className="ga-cert-studio-meta">
                <div>
                  <dt>Credential ID</dt>
                  <dd>{serial}</dd>
                </div>
                <div>
                  <dt>Date of issue</dt>
                  <dd>{issuedOn}</dd>
                </div>
              </dl>

              <div className="ga-cert-studio-actions">
                <button
                  type="button"
                  className="ga-cert-studio-btn ga-cert-studio-btn--primary"
                  onClick={handleDownload}
                  disabled={!canExport || busy}
                  data-cursor
                >
                  <Download size={17} strokeWidth={1.6} aria-hidden="true" />
                  {busy ? "Rendering…" : "Download PNG"}
                </button>
                <button
                  type="button"
                  className="ga-cert-studio-btn"
                  onClick={handlePrint}
                  disabled={!canExport}
                  data-cursor
                >
                  <Printer size={17} strokeWidth={1.6} aria-hidden="true" />
                  Print / Save PDF
                </button>
              </div>

              <p className="ga-cert-studio-status" role="status" aria-live="polite">
                {error || status}
              </p>

              <p className="ga-cert-studio-fineprint">
                This is the programme credential layout. The certificate issued on completion carries the
                same design with your verification ID. Third-party learning badges from Google, IBM and
                Microsoft Applied Skills are earned separately through the credential roadmap.
              </p>
            </div>

            <div className="ga-cert-studio-preview">{art}</div>
          </div>
        </div>
      </dialog>

      {/* A second copy of the artwork, portalled to <body> and hidden from the
          screen, is what the print stylesheet reveals. Printing an open
          <dialog> is unreliable — it lives in the top layer, and browsers differ
          on whether the rest of the page is still painted behind it — so the
          print path deliberately does not depend on the dialog being in the
          print tree.

          Gated on `open` because it does not: rendering it unconditionally put a
          complete certificate SVG into <body> for every visitor on every page
          load, hidden, for a print root that only matters once someone is
          actually about to print. */}
      {open
        ? createPortal(
            <div className="ga-cert-print" aria-hidden="true">
              {art}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export default CertificateStudio;
