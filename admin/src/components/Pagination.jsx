// Previous · Page n of m · Next. Nothing at all for a single page.
// `page` is the page being requested (drives the buttons); `meta.page` is the
// page the server answered with (drives the label).
export const Pagination = ({page, meta, onPage}) =>
  meta.totalPages > 1 ? (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="btn" disabled={page <= 1} onClick={() => onPage((value) => value - 1)}>
        Previous
      </button>
      <span>
        Page {meta.page} of {meta.totalPages}
      </span>
      <button
        type="button"
        className="btn"
        disabled={page >= meta.totalPages}
        onClick={() => onPage((value) => value + 1)}
      >
        Next
      </button>
    </nav>
  ) : null;
