import {useState} from "react";

import {MediaPicker} from "./MediaPicker";
import {fieldDomId} from "./fieldPath";

// ponytail: repeater (inputs + × + Add) instead of a textarea. Bulk paste loses,
// but the button pattern is instantly understood as "multiple items" whereas a
// textarea looks like free-form prose.
const ListField = ({value, onChange, disabled}) => {
  const items = value || [];

  return (
    <div className="repeater">
      {items.map((item, index) => (
        <div className="repeater-inline" key={index}>
          <input
            aria-label={`Item ${index + 1}`}
            value={item}
            disabled={disabled}
            onChange={(e) => onChange(items.map((v, i) => (i === index ? e.target.value : v)))}
          />
          <button
            type="button"
            className="btn btn--small btn--danger"
            disabled={disabled}
            aria-label={`Remove item ${index + 1}`}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn--small"
        disabled={disabled}
        onClick={() => onChange([...items, ""])}
      >
        Add
      </button>
    </div>
  );
};

// A textarea over a string[], one line per item. Cleaning blank lines on every
// keystroke removes the newline the instant Enter is pressed, so the caret snaps
// back and a second line can never be started. Keep the raw lines while typing
// and trim/drop the empties once, on blur.
const LinesTextarea = ({label, placeholder, rows, value, onChange, disabled}) => (
  <textarea
    aria-label={label}
    placeholder={placeholder}
    rows={rows}
    value={(value || []).join("\n")}
    disabled={disabled}
    onChange={(event) => onChange(event.target.value.split("\n"))}
    onBlur={(event) => onChange(event.target.value.split("\n").map((line) => line.trim()).filter(Boolean))}
  />
);

const KeyValueField = ({value, onChange, disabled}) => {
  const rows = value || [];

  const update = (index, patch) =>
    onChange(rows.map((row, position) => (position === index ? {...row, ...patch} : row)));

  return (
    <div className="repeater">
      {rows.map((row, index) => (
        <div className="repeater-row" key={index}>
          <input
            aria-label={`Question ${index + 1}`}
            placeholder="Question"
            value={row.question || ""}
            disabled={disabled}
            onChange={(event) => update(index, {question: event.target.value})}
          />
          <textarea
            aria-label={`Answer ${index + 1}`}
            placeholder="Answer"
            rows={2}
            value={row.answer || ""}
            disabled={disabled}
            onChange={(event) => update(index, {answer: event.target.value})}
          />
          <button
            type="button"
            className="btn btn--small btn--danger"
            disabled={disabled}
            onClick={() => onChange(rows.filter((unused, position) => position !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn--small"
        disabled={disabled}
        onClick={() => onChange([...rows, {question: "", answer: ""}])}
      >
        Add
      </button>
    </div>
  );
};

const SectionsField = ({value, onChange, disabled}) => {
  const rows = value || [];

  const update = (index, patch) =>
    onChange(rows.map((row, position) => (position === index ? {...row, ...patch} : row)));

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="repeater">
      {rows.map((row, index) => (
        <div className="repeater-row repeater-row--block" key={index}>
          <input
            aria-label={`Section ${index + 1} heading`}
            placeholder="Heading"
            value={row.heading || ""}
            disabled={disabled}
            onChange={(event) => update(index, {heading: event.target.value})}
          />
          <LinesTextarea
            label={`Section ${index + 1} paragraphs`}
            placeholder="One paragraph per line"
            rows={4}
            value={row.body}
            disabled={disabled}
            onChange={(body) => update(index, {body})}
          />
          <div className="repeater-actions">
            <button type="button" className="btn btn--small" disabled={disabled || index === 0} onClick={() => move(index, -1)}>
              ↑
            </button>
            <button type="button" className="btn btn--small" disabled={disabled || index === rows.length - 1} onClick={() => move(index, 1)}>
              ↓
            </button>
            <button
              type="button"
              className="btn btn--small btn--danger"
              disabled={disabled}
              onClick={() => onChange(rows.filter((unused, position) => position !== index))}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--small" disabled={disabled} onClick={() => onChange([...rows, {heading: "", body: []}])}>
        Add section
      </button>
    </div>
  );
};

const ModulesField = ({value, onChange, disabled}) => {
  const rows = value || [];

  const update = (index, patch) =>
    onChange(rows.map((row, position) => (position === index ? {...row, ...patch} : row)));

  return (
    <div className="repeater">
      {rows.map((row, index) => (
        <div className="repeater-row repeater-row--block" key={index}>
          <div className="repeater-inline">
            <input
              type="number"
              aria-label={`Module ${index + 1} number`}
              placeholder="#"
              className="input-narrow"
              value={row.n ?? ""}
              disabled={disabled}
              onChange={(event) => update(index, {n: event.target.value === "" ? null : Number(event.target.value)})}
            />
            <input
              aria-label={`Module ${index + 1} title`}
              placeholder="Module title"
              value={row.title || ""}
              disabled={disabled}
              onChange={(event) => update(index, {title: event.target.value})}
            />
          </div>
          <LinesTextarea
            label={`Module ${index + 1} points`}
            placeholder="One topic per line"
            rows={4}
            value={row.points}
            disabled={disabled}
            onChange={(points) => update(index, {points})}
          />
          <button
            type="button"
            className="btn btn--small btn--danger"
            disabled={disabled}
            onClick={() => onChange(rows.filter((unused, position) => position !== index))}
          >
            Remove module
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn--small"
        disabled={disabled}
        onClick={() => onChange([...rows, {n: rows.length + 1, title: "", points: []}])}
      >
        Add module
      </button>
    </div>
  );
};

const MediaField = ({value, onChange, disabled}) => {
  const [picking, setPicking] = useState(false);
  const current = value || {};

  return (
    <div className="media-field">
      {current.url ? (
        <figure className="media-preview">
          {/* w-240 rather than the original: the thumbnail is 120px wide and
              there is no reason to pull a 1.4 MP source to fill it. */}
          <img src={`${current.url}${current.url.includes("?") ? "&" : "?"}tr=w-240,f-auto,q-80`} alt={current.alt || ""} />
          <figcaption>{current.alt || "No alt text"}</figcaption>
        </figure>
      ) : (
        <p className="muted">No image selected.</p>
      )}

      <div className="media-field-actions">
        <button type="button" className="btn btn--small" disabled={disabled} onClick={() => setPicking(true)}>
          {current.url ? "Replace" : "Choose image"}
        </button>
        {current.url ? (
          <button type="button" className="btn btn--small btn--danger" disabled={disabled} onClick={() => onChange({})}>
            Remove
          </button>
        ) : null}
      </div>

      {current.url ? (
        <label className="inline-label">
          Alt text
          <input
            value={current.alt || ""}
            disabled={disabled}
            placeholder="Describe the image for screen readers"
            onChange={(event) => onChange({...current, alt: event.target.value})}
          />
        </label>
      ) : null}

      {picking ? (
        <MediaPicker
          onSelect={(media) => {
            onChange({
              media: media._id,
              url: media.url,
              thumbnailUrl: media.thumbnailUrl || "",
              fileId: media.fileId,
              alt: media.alt || current.alt || "",
              width: media.width || null,
              height: media.height || null,
            });
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
};

// A gallery: an ordered array of the same media refs MediaField produces, one
// per image. Declared in the resource config as kind "mediaList" and validated
// server-side as z.array(mediaRef) — rendering it as anything that emits a
// string (the default text input did) is what produced "Expected array,
// received string" and blocked every program save.
const MediaListField = ({value, onChange, disabled}) => {
  const [picking, setPicking] = useState(false);
  const items = Array.isArray(value) ? value : [];

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="media-list">
      {items.length > 0 ? (
        <ul className="media-list-grid">
          {items.map((item, index) => (
            <li className="media-list-item" key={item.media || item.url || index}>
              {item.url ? (
                <img
                  src={`${item.url}${item.url.includes("?") ? "&" : "?"}tr=w-240,f-auto,q-80`}
                  alt={item.alt || ""}
                />
              ) : (
                <span className="muted">No preview</span>
              )}
              <div className="media-list-item-actions">
                <button type="button" className="btn btn--small" disabled={disabled || index === 0} onClick={() => move(index, -1)} aria-label="Move left">
                  ↑
                </button>
                <button type="button" className="btn btn--small" disabled={disabled || index === items.length - 1} onClick={() => move(index, 1)} aria-label="Move right">
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn--small btn--danger"
                  disabled={disabled}
                  onClick={() => onChange(items.filter((unused, position) => position !== index))}
                  aria-label="Remove image"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No images yet.</p>
      )}

      <button type="button" className="btn btn--small" disabled={disabled} onClick={() => setPicking(true)}>
        Add image
      </button>

      {picking ? (
        <MediaPicker
          onSelect={(media) => {
            onChange([
              ...items,
              {
                media: media._id,
                url: media.url,
                thumbnailUrl: media.thumbnailUrl || "",
                fileId: media.fileId,
                alt: media.alt || "",
                width: media.width || null,
                height: media.height || null,
              },
            ]);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
};

export const Field = ({field, value, onChange, disabled, error, needed = false, prefilled = false}) => {
  const id = fieldDomId(field.name);
  const describedBy = [
    field.hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
    needed ? `${id}-needed` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const control = () => {
    switch (field.kind) {
      case "textarea":
        return (
          <textarea
            id={id}
            rows={5}
            value={value || ""}
            disabled={disabled}
            aria-describedby={describedBy || undefined}
            aria-invalid={error ? "true" : undefined}
            onChange={(event) => onChange(event.target.value)}
          />
        );
      case "number":
        return (
          <input
            id={id}
            type="number"
            value={value ?? ""}
            disabled={disabled}
            aria-describedby={describedBy || undefined}
            onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
          />
        );
      case "boolean":
        return (
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
          />
        );
      case "list":
        return <ListField id={id} value={value} onChange={onChange} disabled={disabled} />;
      case "kv":
        return <KeyValueField value={value} onChange={onChange} disabled={disabled} />;
      case "sections":
        return <SectionsField value={value} onChange={onChange} disabled={disabled} />;
      case "modules":
        return <ModulesField value={value} onChange={onChange} disabled={disabled} />;
      case "media":
        return <MediaField value={value} onChange={onChange} disabled={disabled} />;
      case "mediaList":
        return <MediaListField value={value} onChange={onChange} disabled={disabled} />;
      default:
        return (
          <input
            id={id}
            type="text"
            value={value || ""}
            disabled={disabled}
            aria-describedby={describedBy || undefined}
            aria-invalid={error ? "true" : undefined}
            onChange={(event) => onChange(event.target.value)}
          />
        );
    }
  };

  return (
    // The wrapper carries the scroll target rather than the input, so jumping to
    // a field brings its label and hint into view too — landing on a bare input
    // with its label scrolled off the top explains nothing.
    <div
      className={`field field--${field.kind}${needed ? " field--needed" : ""}`}
      id={`${id}-row`}
    >
      {/* A real <label for>, not a styled div: it is what makes the field
          clickable and what a screen reader announces with the input. */}
      <label htmlFor={id}>
        {field.label}
        {field.required ? <span aria-hidden="true"> *</span> : null}
        {/* Shown only while the field is actually empty, so it reads as a
            remaining task rather than a permanent decoration. It disappears as
            soon as something is typed. */}
        {needed ? (
          <span className="field-needed" id={`${id}-needed`}>
            needed to publish
          </span>
        ) : null}
        {/* Not a warning — a default is usually right. It is here so a value
            nobody typed cannot pass for one somebody checked. */}
        {prefilled ? <span className="field-prefilled">prefilled</span> : null}
      </label>
      {control()}
      {field.hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {field.hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
