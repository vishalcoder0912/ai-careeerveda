
// The three states every data screen has to handle, in one place so they look
// and behave the same everywhere. A screen that renders nothing while loading
// looks broken; a screen that renders nothing when empty looks broken in the
// same way but permanently.

// role="status", because a bare <div> has an implicit role of `generic` and
// aria-label is prohibited on it — the attribute is dropped from the
// accessibility tree, so the "Loading" name never reached a screen reader at
// all, and axe reports it as a serious aria-prohibited-attr violation (caught
// by e2e/accessibility.spec.js). status is the correct role here anyway, and it
// implies aria-live="polite", so that attribute goes rather than being stated
// twice.
export const Skeleton = ({rows = 5}) => (
  <div className="skeleton" role="status" aria-busy="true" aria-label="Loading">
    {Array.from({length: rows}).map((unused, index) => (
      <div className="skeleton-row" key={index} />
    ))}
  </div>
);

export const EmptyState = ({title, body, action}) => (
  <div className="state state--empty">
    <h3>{title}</h3>
    {body ? <p>{body}</p> : null}
    {action}
  </div>
);

// `error` may be an ApiError or a plain Error. The message is shown as-is
// because the API's messages are written to be read by a person; the code is
// shown alongside so a support conversation has something precise to quote.
export const ErrorState = ({error, onRetry}) => (
  <div className="state state--error" role="alert">
    <h3>Something went wrong</h3>
    <p>{(error && error.message) || "The request failed."}</p>
    {error && error.code ? <p className="state-code">{error.code}</p> : null}
    {onRetry ? (
      <button type="button" className="btn btn--primary" onClick={onRetry}>
        Try again
      </button>
    ) : null}
  </div>
);

// Written the way the rest of the panel writes them. The raw value is a
// database enum — showing "in-review" next to a filter dropdown that offers
// "In review" reads as two different things.
const STATUS_TEXT = {
  draft: "Draft",
  "in-review": "In review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export const StatusBadge = ({status}) => (
  <span className={`badge badge--${status}`}>{STATUS_TEXT[status] || status}</span>
);
