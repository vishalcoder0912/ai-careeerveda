import {useEffect, useRef, useState} from "react";

import {mediaApi} from "../services/api";
import {useToast} from "../context/ToastContext";
import {Modal} from "./Modal";
import {Skeleton, EmptyState, ErrorState} from "./States";

const FOLDERS = [
  "/careerveda",
  "/careerveda/programs",
  "/careerveda/faculty",
  "/careerveda/alumni",
  "/careerveda/blogs",
  "/careerveda/jobs",
  "/careerveda/pages",
  "/careerveda/logos",
  "/careerveda/brand",
  "/careerveda/press",
];

// Browse the Media Library, or upload straight into it, without leaving the
// editor. Selecting returns the whole record so the caller can store the
// dimensions alongside the URL — which is what stops the public page shifting
// as images arrive.
export const MediaPicker = ({onSelect, onClose}) => {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const fileInput = useRef(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mediaApi.list({limit: 60, search: search || undefined, folder: folder || undefined});
      setItems(response.data);
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, folder]);

  const upload = async (files) => {
    const file = files && files[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await mediaApi.upload(file, {folder: folder || "/careerveda"});
      const media = response.data.media;

      // The API answers with the existing record when the same bytes have been
      // uploaded before, and says so. Passing that on is more honest than
      // reporting a new upload that did not happen.
      toast.success(response.data.duplicate ? "That image was already in the library." : "Uploaded.");

      onSelect(media);
    } catch (failure) {
      toast.error(failure.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Fallback for when the file cannot be picked — drag-drop or the picker both
  // failing, a remote file, a URL copied from elsewhere. Registers the URL as
  // a library item instead of the bytes.
  const addFromUrl = async () => {
    const url = urlValue.trim();
    if (!url) return;

    setAddingUrl(true);
    try {
      const response = await mediaApi.addFromUrl(url, {folder: folder || "/careerveda"});
      const media = response.data.media;
      toast.success(response.data.duplicate ? "That URL was already in the library." : "Image added from URL.");
      onSelect(media);
    } catch (failure) {
      toast.error(failure.message || "Could not add that URL.");
    } finally {
      setAddingUrl(false);
    }
  };

  return (
    <Modal className="dialog--wide" label="Media library" onClose={onClose}>
        <div className="dialog-head">
          <h2>Media Library</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="toolbar">
          <input
            type="search"
            placeholder="Search images…"
            aria-label="Search images"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={folder} onChange={(event) => setFolder(event.target.value)} aria-label="Folder">
            <option value="">All folders</option>
            {FOLDERS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--primary" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
            className="visually-hidden"
            onChange={(event) => upload(event.target.files)}
          />
        </div>

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
          Drop an image here to upload it
        </div>

        {/* A div, not a form: the picker renders inside the editor's own
            <form>, and a nested form's submit would bubble into the editor's
            save handler (or be silently blocked by URL validation). */}
        <div className="url-add">
          <input
            type="text"
            inputMode="url"
            placeholder="Can't pick a file? Paste an ImageKit URL (https://ik.imagekit.io/…)"
            aria-label="ImageKit URL"
            value={urlValue}
            onChange={(event) => setUrlValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addFromUrl();
              }
            }}
          />
          <button type="button" className="btn" disabled={addingUrl || !urlValue.trim()} onClick={addFromUrl}>
            {addingUrl ? "Adding…" : "Add URL"}
          </button>
        </div>

        {loading ? <Skeleton rows={3} /> : null}
        {!loading && error ? <ErrorState error={error} onRetry={load} /> : null}
        {!loading && !error && items.length === 0 ? (
          <EmptyState title="No images yet" body="Upload one to get started." />
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <ul className="media-grid">
            {items.map((media) => (
              <li key={media._id}>
                <button type="button" className="media-tile" onClick={() => onSelect(media)}>
                  <img
                    src={`${media.url}${media.url.includes("?") ? "&" : "?"}tr=w-240,f-auto,q-70`}
                    alt={media.alt || media.name}
                    loading="lazy"
                  />
                  <span className="media-tile-name">{media.name}</span>
                  <span className="media-tile-meta">
                    {media.width}×{media.height}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
    </Modal>
  );
};
