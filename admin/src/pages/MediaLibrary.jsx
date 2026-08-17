import {useCallback, useEffect, useRef, useState} from "react";

import {mediaApi} from "../services/api";
import {useToast} from "../context/ToastContext";
import {ConfirmDialog} from "../components/ConfirmDialog";
import {Modal} from "../components/Modal";
import {Skeleton, EmptyState, ErrorState} from "../components/States";

const MediaLibrary = () => {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({page: 1, total: 0, totalPages: 0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const fileInput = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mediaApi.list({page, limit: 24, search: search || undefined});
      setItems(response.data);
      setMeta(response.meta);
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const upload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    let uploaded = 0;
    let duplicates = 0;

    // Sequential rather than parallel: the upload endpoint is rate-limited to
    // 30/minute, and firing a whole folder at once would trip it and report
    // failures for files that were merely too fast.
    try {
      for (const file of Array.from(files)) {
        try {
          const response = await mediaApi.upload(file);
          if (response.data.duplicate) duplicates += 1;
          else uploaded += 1;
        } catch (failure) {
          toast.error(`${file.name}: ${failure.message}`);
        }
      }
    } finally {
      // finally, not a trailing statement: if anything above throws, the button
      // must not stay stuck on "Uploading…" forever.
      setUploading(false);
    }

    if (uploaded > 0) toast.success(`Uploaded ${uploaded} image${uploaded === 1 ? "" : "s"}.`);
    if (duplicates > 0) toast.toast(`${duplicates} already in the library.`);
    await load();
  };

  const addFromUrl = async () => {
    const url = urlValue.trim();
    if (!url) return;

    setAddingUrl(true);
    try {
      const response = await mediaApi.addFromUrl(url);
      toast.success(response.data.duplicate ? "That URL was already in the library." : "Image added from URL.");
      setUrlValue("");
      await load();
    } catch (failure) {
      toast.error(failure.message || "Could not add that URL.");
    } finally {
      setAddingUrl(false);
    }
  };

  const askDelete = async (media) => {
    // Ask the API which content uses this image before offering to delete it.
    // The server refuses a referenced delete anyway; showing the list first
    // means the editor learns why without having to trigger the error.
    let references = [];
    try {
      const response = await mediaApi.references(media._id);
      references = response.data;
    } catch {
      // Non-fatal — the confirm still works, and the server remains the gate.
    }

    setConfirm({
      media,
      references,
      title: references.length > 0 ? "This image is in use" : "Delete this image?",
      body:
        references.length > 0
          ? `It is used by: ${references.map((entry) => entry.label).join(", ")}. Detach it there first.`
          : `"${media.name}" will be moved to the archive.`,
      blocked: references.length > 0,
    });
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await mediaApi.remove(confirm.media._id);
      toast.success("Image deleted.");
      setConfirm(null);
      setSelected(null);
      await load();
    } catch (failure) {
      toast.error(failure.message || "Could not delete the image.");
    } finally {
      setBusy(false);
    }
  };

  const saveMeta = async () => {
    setBusy(true);
    try {
      const response = await mediaApi.update(selected._id, {
        name: selected.name,
        alt: selected.alt,
        caption: selected.caption,
        url: selected.url,
      });
      setSelected(response.data);
      toast.success("Saved.");
      await load();
    } catch (failure) {
      toast.error(failure.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Media Library</h1>
          <p className="page-sub">{meta.total} images</p>
        </div>
        <button type="button" className="btn btn--primary" disabled={uploading} onClick={() => fileInput.current?.click()}>
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          aria-label="Upload images"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          className="visually-hidden"
          onChange={(event) => upload(event.target.files)}
        />
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search images…"
          aria-label="Search images"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <form
        className="url-add"
        onSubmit={(event) => {
          event.preventDefault();
          addFromUrl();
        }}
      >
        <input
          type="url"
          placeholder="Can't pick a file? Paste an ImageKit URL (https://ik.imagekit.io/…)"
          aria-label="ImageKit URL"
          value={urlValue}
          onChange={(event) => setUrlValue(event.target.value)}
        />
        <button type="submit" className="btn" disabled={addingUrl || !urlValue.trim()}>
          {addingUrl ? "Adding…" : "Add URL"}
        </button>
      </form>

      <div
        className={`drop-zone ${dragging ? "drop-zone--active" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          upload(event.dataTransfer.files);
        }}
      >
        Drop images here to upload
      </div>

      {loading ? <Skeleton rows={4} /> : null}
      {!loading && error ? <ErrorState error={error} onRetry={load} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState title="No images yet" body="Upload one to get started." />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ul className="media-grid">
          {items.map((media) => (
            <li key={media._id}>
              <button type="button" className="media-tile" onClick={() => setSelected(media)}>
                <img
                  src={`${media.url}${media.url.includes("?") ? "&" : "?"}tr=w-320,f-auto,q-70`}
                  alt={media.alt || media.name}
                  loading="lazy"
                />
                <span className="media-tile-name">{media.name}</span>
                <span className="media-tile-meta">
                  {media.width}×{media.height} · {Math.round((media.size || 0) / 1024)} KB
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {meta.totalPages > 1 ? (
        <nav className="pagination" aria-label="Pagination">
          <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button type="button" className="btn" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)}>
            Next
          </button>
        </nav>
      ) : null}

      {selected ? (
        <Modal className="dialog--wide" label="Image details" onClose={() => setSelected(null)}>
            <div className="dialog-head">
              <h2>Image details</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setSelected(null)} aria-label="Close">
                ×
              </button>
            </div>

            <img
              className="media-detail-image"
              src={`${selected.url}${selected.url.includes("?") ? "&" : "?"}tr=w-640,f-auto,q-80`}
              alt={selected.alt || selected.name}
            />

            <label className="inline-label">
              Name
              <input value={selected.name || ""} onChange={(event) => setSelected({...selected, name: event.target.value})} />
            </label>
            <label className="inline-label">
              Alt text
              <input
                value={selected.alt || ""}
                placeholder="Describe the image for screen readers"
                onChange={(event) => setSelected({...selected, alt: event.target.value})}
              />
            </label>
            <label className="inline-label">
              Caption
              <input value={selected.caption || ""} onChange={(event) => setSelected({...selected, caption: event.target.value})} />
            </label>
            <label className="inline-label">
              URL
              <input
                value={selected.url || ""}
                placeholder="https://…"
                onChange={(event) => setSelected({...selected, url: event.target.value})}
              />
            </label>

            <p className="muted">
              {selected.width}×{selected.height} · {selected.mimeType} · {Math.round((selected.size || 0) / 1024)} KB ·{" "}
              {selected.folder}
            </p>

            <div className="dialog-actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  navigator.clipboard?.writeText(selected.url);
                  toast.success("URL copied.");
                }}
              >
                Copy URL
              </button>
              <button type="button" className="btn btn--danger" onClick={() => askDelete(selected)}>
                Delete
              </button>
              <button type="button" className="btn btn--primary" onClick={saveMeta} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        busy={busy}
        title={confirm?.title}
        body={confirm?.body}
        // When the image is referenced there is nothing to confirm — the only
        // action is to acknowledge and go detach it.
        confirmLabel={confirm?.blocked ? "Understood" : "Delete"}
        cancelLabel={confirm?.blocked ? "Close" : "Cancel"}
        tone={confirm?.blocked ? "default" : "danger"}
        onConfirm={() => (confirm?.blocked ? setConfirm(null) : doDelete())}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

export default MediaLibrary;
