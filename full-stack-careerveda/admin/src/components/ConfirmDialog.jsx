import {useState} from "react";

import {Modal} from "./Modal";

export const ConfirmDialog = ({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  prompt = null,
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState("");

  if (!open) return null;

  const options = prompt?.options || [];
  
  const missing = Boolean(prompt?.required && !value);

  const close = () => {
    setValue("");
    onCancel();
  };

  return (
    <Modal
      role="alertdialog"
      labelledBy="dialog-title"
      describedBy="dialog-body"
      busy={busy}
      onClose={close}
    >
      <h2 id="dialog-title">{title}</h2>
      <p id="dialog-body">{body}</p>

      {prompt ? (
        <p className="dialog-field">
          <label htmlFor="dialog-prompt">{prompt.label}</label>
          {options.length > 0 ? (
            <select
              id="dialog-prompt"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={busy}
            >
              <option value="">Choose a reason…</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="dialog-prompt"
              type="text"
              value={value}
              placeholder={prompt.placeholder}
              onChange={(event) => setValue(event.target.value)}
              disabled={busy}
            />
          )}
        </p>
      ) : null}

      <div className="dialog-actions">
        <button type="button" className="btn" onClick={close} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          // Focused on open so a keyboard user lands on the primary action; the
          // native <dialog> traps Tab and returns focus to the opener on close.
          autoFocus
          className={`btn ${tone === "danger" ? "btn--danger" : "btn--primary"}`}
          onClick={() => {
            onConfirm(value);
            setValue("");
          }}
          disabled={busy || missing}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
