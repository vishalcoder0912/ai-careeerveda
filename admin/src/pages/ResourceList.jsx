import {useCallback, useEffect, useRef, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";

import {RESOURCES, STATUS_LABELS, resourceAbilities} from "../config/resources";
import {contentApi} from "../services/api";
import {useAuth} from "../context/AuthContext";
import {useToast} from "../context/ToastContext";
import {ConfirmDialog} from "../components/ConfirmDialog";
import {Pagination} from "../components/Pagination";
import {Skeleton, EmptyState, ErrorState, StatusBadge} from "../components/States";

const PAGE_SIZE = 20;

// Columns the backend will sort on (mirrors SORTABLE in
// backend/src/services/content.service.js). A header outside this set stays
// plain text — clicking it would send a sort the server quietly ignores, which
// reads as a broken control. Title/name default to A→Z; everything else newest
// first, which is what "sort by status" or "by published date" usually means.
const SORTABLE_COLUMNS = new Set(["title", "name", "status", "displayOrder", "publishedAt", "featured"]);

// Column headings are field names by default, which is fine while the field name
// reads as English. These do not: "displayOrder" is a sort key, but the column
// shows where the record sits on the site, and the two are not the same thing.
const COLUMN_LABELS = {
  displayOrder: "Site position",
  publishedAt: "Published",
  showOnAlumniPage: "On alumni page",
  currentCompany: "Company",
  rejectedReason: "Rejected because",
  workMode: "Work mode",
  employmentType: "Type",
  salaryRange: "Salary",
};

const columnLabel = (column) => COLUMN_LABELS[column] || column;
const defaultOrderFor = (column) => (column === "title" || column === "name" ? "asc" : "desc");

// Why a reviewer sent something back. A fixed list rather than free text so the
// answer to "which source keeps sending expired listings?" is a count, not a
// reading exercise.
const REJECT_REASONS = [
  "Duplicate",
  "Spam",
  "Expired",
  "Wrong salary",
  "Broken apply link",
  "Fake or unverified company",
  "Off-topic for our audience",
  "Other",
];

const Forbidden = () => (
  <div className="page state state--empty">
    <h1>403</h1>
    <p>Your account does not have permission to open this section.</p>
    <Link className="btn btn--primary" to="/">
      Back to the dashboard
    </Link>
  </div>
);

// One formatter for a column value, shared by the table and the cards so a date
// is truncated and a boolean is a tick in both — the two views must never
// disagree about what a record says.
// Which position this record actually holds on the public site.
//
// The two numbers used to disagree and there was no way to tell which was
// right: the panel printed the stored displayOrder (0-based, with duplicates
// and gaps from being typed by hand), while the public rail labels its cards
// 01, 02, 03 counted off the published list. A draft sitting in the middle of
// the collection shifted every number after it.
//
// So the column answers the question an editor is actually asking — "where does
// this appear on the site?" — and a record that appears nowhere says so. The raw
// displayOrder is still editable in the editor, where it is labelled as the
// sort key it is.
//
// ponytail: counted within the loaded page. Exact for a collection that fits on
// one page (all of them today); on page 2 the count restarts, so widen PAGE_SIZE
// or have the API return the position if a collection ever outgrows it.
const PUBLIC_STATUSES = new Set(["published", "scheduled"]);

const sitePositions = (items) => {
  const positions = new Map();
  let position = 0;

  for (const item of items) {
    if (PUBLIC_STATUSES.has(item.status)) {
      position += 1;
      positions.set(item._id, position);
    }
  }

  return positions;
};

const formatCell = (item, column, positions) => {
  if (column === "status") return <StatusBadge status={item.status} />;
  if (column === "displayOrder") {
    const position = positions?.get(item._id);
    return position ? (
      String(position).padStart(2, "0")
    ) : (
      <span className="muted" title="Not on the public site yet">—</span>
    );
  }
  // Real dates only. Policy's `updated` is a free-text display string ("Last
  // reviewed January 2026"), and slicing it to 10 characters as though it were
  // an ISO timestamp printed "Last revie".
  if (column === "publishedAt" || column === "createdAt" || column === "updatedAt") {
    return item[column] ? String(item[column]).slice(0, 10) : "—";
  }
  if (typeof item[column] === "boolean") {
    return <span aria-label={item[column] ? "Yes" : "No"}>{item[column] ? "✓" : "—"}</span>;
  }
  return String(item[column] ?? "—").slice(0, 70);
};

// The card thumbnail, pulled from whichever media field this resource nominated.
// Requested at card width with an ImageKit transform rather than the full
// source, so a grid of nine programs is not nine 1.4 MP downloads.
const cardImageUrl = (item, imageField) => {
  const media = imageField ? item[imageField] : null;
  if (!media || !media.url) return null;
  return `${media.url}${media.url.includes("?") ? "&" : "?"}tr=w-480,h-320,fo-auto,f-auto,q-80`;
};

const VIEW_KEY = (name) => `cv-admin-view-${name}`;

// Sentinel for the status dropdown. Not a real status — deleted records keep
// whichever status they had — so it maps to its own query parameter.
const TRASH = "__trash";

// Cards or table. The choice is remembered per resource — someone who prefers
// the dense table for Jobs but cards for Programs gets both back on return.
// Seeded lazily and re-seeded when the route's resource changes, during
// render, instead of from an effect that would cascade a render.
const savedViewFor = (name, fallback) => {
  if (typeof localStorage === "undefined") return fallback || "table";
  return localStorage.getItem(VIEW_KEY(name)) || fallback || "table";
};

const useViewPreference = (resourceName, fallback) => {
  const [view, setView] = useState(() => savedViewFor(resourceName, fallback));
  const [viewFor, setViewFor] = useState(resourceName);
  if (viewFor !== resourceName) {
    setViewFor(resourceName);
    setView(savedViewFor(resourceName, fallback));
  }

  const chooseView = (next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY(resourceName), next);
    } catch {
      // Private-mode storage failures are not worth a broken screen over.
    }
  };

  return [view, chooseView];
};

const emptyCopy = (resource, inTrash, filtered) => {
  if (inTrash) return {title: "The trash is empty", body: "Nothing has been deleted, so there is nothing to restore."};
  if (filtered) {
    return {title: "Nothing matches those filters", body: "Try a different search term or clear the status filter."};
  }
  return {
    title: `No ${resource.label.toLowerCase()} yet`,
    body: `Create the first ${resource.singular.toLowerCase()} to see it here.`,
  };
};

// A segmented toggle rather than two loose buttons, so it reads as one control
// with one active state.
const ViewToggle = ({view, onChoose}) => (
  <div className="view-toggle" role="group" aria-label="View">
    <button
      type="button"
      className={`view-toggle-btn${view === "cards" ? " is-active" : ""}`}
      aria-pressed={view === "cards"}
      onClick={() => onChoose("cards")}
    >
      <span aria-hidden="true">▦</span> Cards
    </button>
    <button
      type="button"
      className={`view-toggle-btn${view === "table" ? " is-active" : ""}`}
      aria-pressed={view === "table"}
      onClick={() => onChoose("table")}
    >
      <span aria-hidden="true">☰</span> Table
    </button>
  </div>
);

const BulkBar = ({selected, inTrash, abilities, busy, api, onBulk, onClear}) => {
  const {canUpdate, canPublish, canDelete} = abilities;
  const bulkButton = (label, verb, action, danger = false) => (
    <button
      type="button"
      className={danger ? "btn btn--danger" : "btn"}
      disabled={busy}
      onClick={() => onBulk(action, label, verb)}
    >
      {label}
    </button>
  );

  return (
    <div className="bulk-bar" role="region" aria-label="Bulk actions">
      <span>{selected.length} selected</span>
      {/* In the trash the only sensible bulk action is putting things back.
          Publishing or re-deleting a deleted record is not something the
          server would accept anyway. */}
      {inTrash ? (
        canDelete && bulkButton("Restore", "restore", () => api.bulkRestore(selected))
      ) : (
        <>
          {canPublish && bulkButton("Publish", "publish", () => api.bulkStatus(selected, "published"))}
          {canUpdate && bulkButton("Unpublish", "unpublish", () => api.bulkStatus(selected, "draft"))}
          {canDelete && bulkButton("Delete", "delete", () => api.bulkDelete(selected), true)}
        </>
      )}
      <button type="button" className="btn btn--ghost" onClick={onClear}>
        Clear
      </button>
    </div>
  );
};

const CardSelect = ({className, title, checked, onChange}) => (
  <input
    type="checkbox"
    className={className}
    aria-label={`Select ${title}`}
    checked={checked}
    onChange={(event) => onChange(event.target.checked)}
  />
);

const ContentCard = ({item, resource, title, isSelected, canBulk, metaColumns, positions, onSelect, actions}) => {
  const image = cardImageUrl(item, resource.imageField);
  const subtitle = resource.subtitleField ? item[resource.subtitleField] : null;
  const select = (className) =>
    canBulk ? <CardSelect className={className} title={title} checked={isSelected} onChange={onSelect} /> : null;

  return (
    <li
      className={`content-card${isSelected ? " is-selected" : ""}${resource.imageField ? "" : " content-card--no-media"}`}
    >
      {resource.imageField ? (
        <div className="content-card-media">
          {/* The letter tile sits underneath as a permanent backdrop, so a
              missing OR broken image both resolve to it — a 404'd thumbnail
              hides the <img> and reveals the letter rather than leaving the
              browser's broken-image glyph. */}
          <div className="content-card-media--empty" aria-hidden="true">
            {title.slice(0, 1).toUpperCase()}
          </div>
          {image ? (
            <img
              src={image}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <StatusBadge status={item.status} />
          {select("content-card-check")}
        </div>
      ) : (
        // Image-less card (Jobs): no thumbnail to hang the status and select
        // control on, so they get their own slim header row.
        <div className="content-card-topbar">
          <StatusBadge status={item.status} />
          {select("content-card-topbar-check")}
        </div>
      )}

      <div className="content-card-body">
        {/* The whole heading is the link into the editor, so the obvious click
            (the title) is also the primary action. */}
        <h2 className="content-card-title">
          <Link to={`/${resource.name}/${item._id}`}>{title}</Link>
        </h2>
        {subtitle ? <p className="content-card-sub">{String(subtitle).slice(0, 90)}</p> : null}

        {metaColumns.length > 0 ? (
          <dl className="content-card-meta">
            {metaColumns.map((column) => (
              <div key={column} className="content-card-meta-item">
                <dt>{columnLabel(column)}</dt>
                <dd>{formatCell(item, column, positions)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <div className="content-card-actions">{actions}</div>
    </li>
  );
};

const ContentCards = ({items, resource, selected, canBulk, allSelected, positions, onSelectAll, onSelect, renderActions}) => {
  // Columns to show as meta on a card: a resource may name its own set
  // (cardMeta); otherwise it is every column but the title (the heading) and
  // status (the corner badge).
  const metaColumns =
    resource.cardMeta || resource.columns.filter((column) => column !== resource.titleField && column !== "status");

  return (
    <>
      {canBulk && items.length > 1 ? (
        <label className="cards-selectall">
          <input
            type="checkbox"
            aria-label="Select all"
            checked={allSelected}
            onChange={(event) => onSelectAll(event.target.checked)}
          />
          Select all
        </label>
      ) : null}

      <ul className="content-cards">
        {items.map((item, index) => (
          <ContentCard
            key={item._id}
            item={item}
            resource={resource}
            title={item[resource.titleField] || "Untitled"}
            isSelected={selected.includes(item._id)}
            canBulk={canBulk}
            metaColumns={metaColumns}
            positions={positions}
            onSelect={(checked) => onSelect(item._id, checked)}
            actions={renderActions(item, index)}
          />
        ))}
      </ul>
    </>
  );
};

const sortState = (active, order) => {
  if (!active) return {aria: "none", arrow: "↕"};
  return order === "asc" ? {aria: "ascending", arrow: "▲"} : {aria: "descending", arrow: "▼"};
};

const SortHeader = ({column, sort, order, onSort}) => {
  const {aria, arrow} = sortState(sort === column, order);
  return (
    <th scope="col" aria-sort={aria}>
      {SORTABLE_COLUMNS.has(column) ? (
        <button type="button" className="col-sort" onClick={() => onSort(column)}>
          {columnLabel(column)}
          <span className="col-sort-arrow" aria-hidden="true">
            {arrow}
          </span>
        </button>
      ) : (
        columnLabel(column)
      )}
    </th>
  );
};

const ContentTable = ({items, resource, selected, canBulk, allSelected, positions, sort, order, onSort, onSelectAll, onSelect, renderActions}) => (
  <div className="table-wrap">
    <table>
      <caption className="visually-hidden">{resource.label}</caption>
      <thead>
        <tr>
          {canBulk ? (
            <th scope="col" className="col-check">
              <input
                type="checkbox"
                aria-label="Select all rows"
                checked={allSelected}
                onChange={(event) => onSelectAll(event.target.checked)}
              />
            </th>
          ) : null}
          {resource.columns.map((column) => (
            <SortHeader key={column} column={column} sort={sort} order={order} onSort={onSort} />
          ))}
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={item._id}>
            {canBulk ? (
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select ${item[resource.titleField]}`}
                  checked={selected.includes(item._id)}
                  onChange={(event) => onSelect(item._id, event.target.checked)}
                />
              </td>
            ) : null}
            {resource.columns.map((column) => (
              <td key={column} data-label={columnLabel(column)}>
                {formatCell(item, column, positions)}
              </td>
            ))}
            <td className="col-actions">{renderActions(item, index)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Exactly one of: skeleton, error, empty state, or the records (as cards or a
// table) followed by pagination.
const ListBody = ({loading, error, onRetry, empty, showCards, page, meta, onPage, ...viewProps}) => {
  if (loading) return <Skeleton />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  const {items, selected, canBulk} = viewProps;
  if (items.length === 0) return empty;

  const allSelected = canBulk && selected.length === items.length;
  return (
    <>
      {showCards ? <ContentCards {...viewProps} allSelected={allSelected} /> : <ContentTable {...viewProps} allSelected={allSelected} />}
      <Pagination page={page} meta={meta} onPage={onPage} />
    </>
  );
};

// The list's query — search, status filter, sort, page — plus the selection
// made against it, and the rules that keep them consistent with each other.
const useListQuery = (resourceName) => {
  const [search, setSearch] = useState("");
  // "" is every live record; a status value filters to it; TRASH is its own
  // mode — deleted records only, which is a different query, not a status.
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);

  // Empty sort means "let the server use this resource's own default order"
  // (the hand-tuned displayOrder for programs, most-recent for blogs). A column
  // click takes over from there.
  const [sort, setSort] = useState("");
  const [order, setOrder] = useState("desc");

  // Reset to page 1 whenever a filter changes: staying on page 4 of a result
  // set that now has one page shows an empty table and looks like a failure.
  // A filter change is known during render, so the reset happens there rather
  // than in an effect (which would cascade a render — and fired *after* the
  // debounced load had already started with the stale page).
  const [filtersFor, setFiltersFor] = useState("");
  const filterKey = `${search}\u0000${status}\u0000${sort}\u0000${order}\u0000${resourceName}`;
  if (filterKey !== filtersFor) {
    setFiltersFor(filterKey);
    setPage(1);
    setSelected([]);
  }

  // A sort is a choice about one resource's columns; carrying it to another
  // resource (whose columns differ) would silently apply a stale or invalid
  // field. Reset to the server default when the section changes.
  const [sortFor, setSortFor] = useState(resourceName);
  if (sortFor !== resourceName) {
    setSortFor(resourceName);
    setSort("");
    setOrder("desc");
  }

  // Click a header: sort by it, or flip direction if it is already the sort.
  const toggleSort = (column) => {
    if (sort === column) {
      setOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSort(column);
      setOrder(defaultOrderFor(column));
    }
  };

  const filtered = Boolean(search || status);

  return {
    search, setSearch, status, setStatus, page, setPage, selected, setSelected, sort, order, toggleSort,
    filtered,
    // The plain list in the collection's own order: no search, no status
    // filter (the trash included), no column sort.
    unfiltered: !filtered && !sort,
  };
};

const ListToolbar = ({resource, searchRef, search, onSearch, status, onStatus, canDelete, supportsCards, view, onChooseView}) => (
  <div className="toolbar">
    <label className="visually-hidden" htmlFor="search">
      Search {resource.label}
    </label>
    <input
      id="search"
      ref={searchRef}
      type="search"
      placeholder={`Search ${resource.label.toLowerCase()}…  ( / )`}
      value={search}
      onChange={(event) => onSearch(event.target.value)}
    />

    <label className="visually-hidden" htmlFor="status">
      Filter by status
    </label>
    <select id="status" value={status} onChange={(event) => onStatus(event.target.value)}>
      <option value="">All statuses</option>
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
      {canDelete ? <option value={TRASH}>Deleted (trash)</option> : null}
    </select>

    {/* Shown wherever a card view is available — a resource with a
        thumbnail, or one that opts in without one (Jobs). */}
    {supportsCards ? <ViewToggle view={view} onChoose={onChooseView} /> : null}
  </div>
);

// Only reached once the resource exists and this account may read it, so
// everything below can rely on both.
const ResourceListView = ({resource, abilities, isSuperAdmin}) => {
  const {resource: resourceName} = useParams();
  const {canCreate, canUpdate, canPublish, canDelete} = abilities;
  const canBulk = canUpdate || canDelete;
  const navigate = useNavigate();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({page: 1, total: 0, totalPages: 0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {search, setSearch, status, setStatus, page, setPage, selected, setSelected, sort, order, toggleSort, filtered, unfiltered} =
    useListQuery(resourceName);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const searchRef = useRef(null);

  const [view, chooseView] = useViewPreference(resourceName, resource.defaultView);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await contentApi(resource.name).list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: status && status !== TRASH ? status : undefined,
        deleted: status === TRASH ? "true" : undefined,
        sort: sort || undefined,
        order: sort ? order : undefined,
      });
      setItems(response.data);
      setMeta(response.meta);
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  }, [resource, page, search, status, sort, order]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  // Keyboard shortcuts on the list: "/" jumps to search, "n" opens a new
  // record. Both are the fastest way to do the two things this screen exists
  // for. Suppressed while typing in a field or with a dialog open, so they
  // never fire mid-sentence or behind a confirmation.
  useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = event.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target.isContentEditable) return;
      if (confirm) return;

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key.toLowerCase() === "n" && canCreate) {
        event.preventDefault();
        navigate(`/${resource.name}/new`);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCreate, confirm, navigate, resource]);

  const api = contentApi(resource.name);
  const inTrash = status === TRASH;

  // Hand-ordered resources (anything showing a displayOrder column) get move
  // controls — but only on the plain, unfiltered list. Moving a row "up" inside
  // a search result or a status filter is meaningless: the row above it on
  // screen is not the row above it in the collection, so the write would
  // reorder against a list the editor cannot see.
  const isOrdered = resource.columns.includes("displayOrder");
  const canReorder = isOrdered && canUpdate && unfiltered;
  const positions = sitePositions(items);

  const run = async (action, successMessage) => {
    setBusy(true);
    try {
      const response = await action();

      // A bulk publish skips records that are not ready for the public site and
      // names them. Reporting a plain "20 items updated" when three of them
      // silently stayed drafts is the kind of success message that gets found
      // out a week later, on the live site.
      const blocked = response?.data?.blocked || [];

      if (blocked.length > 0) {
        // Name what went through as well as what did not. "3 not published" on
        // its own leaves an editor unsure whether the other seventeen worked.
        const done = response?.data?.modified || 0;
        toast.error(
          `${done} updated · ${blocked.length} not published, missing required fields: ${blocked
            .map((entry) => entry.title)
            .join(", ")}`,
        );
      } else {
        toast.success(successMessage);
      }

      await load();
      setSelected([]);
    } catch (failure) {
      toast.error(failure.message || "That did not work.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  // Swap a record with its neighbour, then renumber the whole page 1..n.
  //
  // Renumbering rather than swapping two values is what repairs the duplicates
  // and gaps that accumulated while displayOrder could only be typed by hand —
  // after any move the stored numbers are sequential again, which is what makes
  // the panel's numbers match the 01, 02, 03 the public rail prints.
  //
  // ponytail: renumbers the visible page only. With more than one page the
  // numbers stay sequential within a page but a move cannot cross the page
  // boundary — raise PAGE_SIZE or add drag-and-drop across pages if a
  // collection ever outgrows that.
  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    const base = (meta.page - 1) * PAGE_SIZE;
    const payload = reordered.map((item, position) => ({
      id: item._id,
      displayOrder: base + position + 1,
    }));

    // Optimistic: the rows swap immediately, then load() confirms from the
    // server. A move that reads as instant is the whole point of the control.
    setItems(reordered);
    run(() => api.reorder(payload), "Order updated.");
  };

  const togglePublish = (item) =>
    item.status === "published"
      ? run(() => api.unpublish(item._id), `${resource.singular} unpublished.`)
      : run(() => api.publish(item._id), `${resource.singular} published.`);

  const askDelete = (item) =>
    setConfirm({
      title: `Delete this ${resource.singular.toLowerCase()}?`,
      body: `"${item[resource.titleField]}" comes off the public site and moves to the trash. Choose "Deleted (trash)" in the status filter to restore it.`,
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: () => run(() => api.remove(item._id), `${resource.singular} deleted.`),
    });

  // Rejecting a synced listing. The reason is required, not decorative: a queue
  // of things marked "rejected" with no explanation cannot be reviewed later,
  // and the same bad source keeps sending the same rubbish.
  const askReject = (item) =>
    setConfirm({
      title: `Reject this ${resource.singular.toLowerCase()}?`,
      body: `"${item[resource.titleField]}" will be archived and stays off the public site. It can be restored later.`,
      confirmLabel: "Reject",
      tone: "danger",
      prompt: {label: "Reason", options: REJECT_REASONS, required: true},
      onConfirm: (reason) => run(() => api.archive(item._id, reason), `${resource.singular} rejected.`),
    });

  // Permanent deletion is the one action with no undo, so it asks for more than
  // a click: the server also demands super-admin plus content.purge, and a
  // caller without them gets a 403 the toast will show.
  const askPurge = (item) =>
    setConfirm({
      title: `Permanently delete this ${resource.singular.toLowerCase()}?`,
      body: `"${item[resource.titleField]}" and its entire revision history will be destroyed. This cannot be undone.`,
      confirmLabel: "Delete forever",
      tone: "danger",
      onConfirm: () => run(() => api.purge(item._id), `${resource.singular} permanently deleted.`),
    });

  const askBulk = (action, label, verb) =>
    setConfirm({
      title: `${label} ${selected.length} item${selected.length === 1 ? "" : "s"}?`,
      body: `This applies to every selected ${resource.singular.toLowerCase()}.`,
      confirmLabel: label,
      tone: verb === "delete" ? "danger" : "default",
      onConfirm: () => run(action, `${selected.length} item(s) updated.`),
    });

  const toggleSelect = (id, checked) =>
    setSelected((current) => (checked ? [...current, id] : current.filter((entry) => entry !== id)));

  const selectAll = (checked) => setSelected(checked ? items.map((item) => item._id) : []);

  // The row/card actions, shared so table and cards stay in lockstep. The trash
  // gets its own pair: a deleted record cannot be published or edited, and
  // offering buttons the server will refuse is worse than offering none.
  const itemActions = (item, index) =>
    inTrash ? (
      <>
        {canDelete ? (
          <button
            type="button"
            className="btn btn--small"
            disabled={busy}
            onClick={() => run(() => api.restore(item._id), `${resource.singular} restored as a draft.`)}
          >
            Restore
          </button>
        ) : null}
        {canDelete && isSuperAdmin ? (
          <button type="button" className="btn btn--small btn--danger" disabled={busy} onClick={() => askPurge(item)}>
            Delete forever
          </button>
        ) : null}
      </>
    ) : (
      <>
        {canReorder ? (
          <span className="order-controls">
            <button
              type="button"
              className="btn btn--small"
              disabled={busy || index === 0}
              aria-label={`Move ${item[resource.titleField]} up`}
              onClick={() => move(index, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn--small"
              disabled={busy || index === items.length - 1}
              aria-label={`Move ${item[resource.titleField]} down`}
              onClick={() => move(index, 1)}
            >
              ↓
            </button>
          </span>
        ) : null}
        <button type="button" className="btn btn--small" onClick={() => navigate(`/${resource.name}/${item._id}`)}>
          {canUpdate ? "Edit" : "View"}
        </button>
        {(item.status === "published" ? canUpdate : canPublish) ? (
          <button type="button" className="btn btn--small" disabled={busy} onClick={() => togglePublish(item)}>
            {/* On a listing awaiting review this button IS the approve action —
                publishing is what approval means, and it still has to clear the
                same required-fields bar as anything else going live. */}
            {item.status === "published" ? "Unpublish" : item.status === "in-review" ? "Approve" : "Publish"}
          </button>
        ) : null}
        {/* The only way into the review queue. Without it nothing ever reaches
            "in-review", and the Approve/Reject pair below could never appear. */}
        {canUpdate && item.status === "draft" ? (
          <button
            type="button"
            className="btn btn--small"
            disabled={busy}
            onClick={() => run(() => api.submitForReview(item._id), "Sent for review.")}
          >
            Send for review
          </button>
        ) : null}
        {canPublish && item.status === "in-review" ? (
          <button type="button" className="btn btn--small btn--danger" disabled={busy} onClick={() => askReject(item)}>
            Reject
          </button>
        ) : null}
        {canCreate ? (
          <button type="button" className="btn btn--small" disabled={busy} onClick={() => run(() => api.duplicate(item._id), "Duplicated.")}>
            Duplicate
          </button>
        ) : null}
        {canDelete ? (
          <button type="button" className="btn btn--small btn--danger" disabled={busy} onClick={() => askDelete(item)}>
            Delete
          </button>
        ) : null}
      </>
    );

  // A resource shows cards if it nominates a thumbnail (imageField) or opts in
  // without one (cards: true, e.g. Jobs, which have no logo). The latter render
  // an image-less card with a compact status header instead of a big tile.
  const supportsCards = Boolean(resource.imageField || resource.cards);
  const {title: emptyTitle, body: emptyBody} = emptyCopy(resource, inTrash, filtered);
  const newLink = (
    <Link className="btn btn--primary" to={`/${resource.name}/new`}>
      New {resource.singular.toLowerCase()}
    </Link>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{resource.label}</h1>
          <p className="page-sub">
            {meta.total} {meta.total === 1 ? "record" : "records"}
          </p>
        </div>
        {canCreate ? newLink : null}
      </div>

      <ListToolbar
        resource={resource}
        searchRef={searchRef}
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        canDelete={canDelete}
        supportsCards={supportsCards}
        view={view}
        onChooseView={chooseView}
      />

      {canBulk && selected.length > 0 ? (
        <BulkBar
          selected={selected}
          inTrash={inTrash}
          abilities={abilities}
          busy={busy}
          api={api}
          onBulk={askBulk}
          onClear={() => setSelected([])}
        />
      ) : null}

      <ListBody
        loading={loading}
        error={error}
        onRetry={load}
        empty={
          <EmptyState title={emptyTitle} body={emptyBody} action={canCreate && !inTrash ? newLink : null} />
        }
        showCards={view === "cards" && supportsCards}
        page={page}
        meta={meta}
        onPage={setPage}
        items={items}
        resource={resource}
        selected={selected}
        canBulk={canBulk}
        positions={positions}
        sort={sort}
        order={order}
        onSort={toggleSort}
        onSelectAll={selectAll}
        onSelect={toggleSelect}
        renderActions={itemActions}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        busy={busy}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        tone={confirm?.tone}
        prompt={confirm?.prompt}
        // The prompt's value rides through to the action. Harmless for the
        // dialogs that ask nothing — they ignore the argument.
        onConfirm={(value) => confirm?.onConfirm(value)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

// These guards live in their own component so the route's dynamic `/:resource`
// segment can switch between a valid resource and an unknown or forbidden one
// without ever changing the hook count of the list itself.
const ResourceList = () => {
  const {resource: resourceName} = useParams();
  const resource = RESOURCES[resourceName];
  const {can, admin} = useAuth();
  const abilities = resourceAbilities(resource, can);

  if (!resource) return <ErrorState error={{message: `Unknown section "${resourceName}"`}} />;
  if (!abilities.canRead) return <Forbidden />;

  // Permanent deletion needs super-admin AND content.purge on the server. Both,
  // so the button is only offered when both hold.
  const isSuperAdmin = admin?.role === "super-admin" && can("content.purge");

  return <ResourceListView resource={resource} abilities={abilities} isSuperAdmin={isSuperAdmin} />;
};

export default ResourceList;
