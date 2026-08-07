import {useCallback, useEffect, useState} from "react";
import {useSearchParams} from "react-router-dom";

import {leadsApi} from "../services/api";
import {useAuth} from "../context/AuthContext";
import {useToast} from "../context/ToastContext";
import {ConfirmDialog} from "../components/ConfirmDialog";
import {Modal} from "../components/Modal";
import {Skeleton, EmptyState, ErrorState} from "../components/States";

const STATUSES = ["new", "contacted", "qualified", "converted", "closed", "spam"];

// createdAt is a full timestamp, so the time a lead was submitted is already
// there — the list just needs to show it. Kept in the browser's own locale and
// timezone: an admin wants "when did this arrive for me", not UTC.
const formatTime = (value) =>
  new Date(value).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
const formatDateTime = (value) =>
  `${new Date(value).toLocaleDateString()}, ${formatTime(value)}`;

const Leads = () => {
  const {can} = useAuth();
  const toast = useToast();
  // The dashboard links here as /leads?type=enrollment, so the filter starts
  // from the URL rather than ignoring it.
  const [params] = useSearchParams();

  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({page: 1, total: 0, totalPages: 0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState(() => params.get("type") || "");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leadsApi.list({
        page,
        limit: 25,
        search: search || undefined,
        status: status || undefined,
        type: type || undefined,
      });
      setItems(response.data);
      setMeta(response.meta);

      // Deliberately unfiltered: these are the totals for the whole inbox, not
      // for the current page of results. A failed summary must not take the
      // list down with it, so it is caught separately.
      leadsApi
        .stats()
        .then((summary) => setStats(summary.data))
        .catch(() => setStats(null));
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, type]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const updateStatus = async (lead, next) => {
    try {
      await leadsApi.update(lead._id, {status: next});
      toast.success("Status updated.");
      await load();
      if (open && open._id === lead._id) setOpen({...open, status: next});
    } catch (failure) {
      toast.error(failure.message || "Could not update the lead.");
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      const response = await leadsApi.addNote(open._id, note.trim());
      setOpen(response.data);
      setNote("");
      toast.success("Note added.");
    } catch (failure) {
      toast.error(failure.message || "Could not add the note.");
    }
  };

  const handleDelete = async (lead) => {
    setBusy(true);
    try {
      await leadsApi.remove(lead._id);
      toast.success("Lead deleted.");
      setConfirm(null);
      if (open && open._id === lead._id) setOpen(null);
      await load();
    } catch (failure) {
      toast.error(failure.message || "Could not delete the lead.");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    try {
      const blob = await leadsApi.exportCsv({
        search: search || undefined,
        status: status || undefined,
        type: type || undefined,
      });

      // A plain <a href> would be an unauthenticated request with no Bearer
      // header, so the file is fetched with credentials and handed to the
      // browser as an object URL.
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `careerveda-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success("Export downloaded.");
    } catch (failure) {
      toast.error(failure.message || "Export failed.");
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Leads</h1>
          <p className="page-sub">{meta.total} records</p>
        </div>
        {can("forms.export") ? (
          <button type="button" className="btn btn--primary" onClick={exportCsv}>
            Export CSV
          </button>
        ) : null}
      </div>

      {stats ? (
        <section className="panel dashboard-leads" aria-labelledby="lead-stats-title">
          <div className="panel-head">
            <div>
              <span className="section-kicker">Enquiries</span>
              <h2 id="lead-stats-title">Enrollment inquiries</h2>
            </div>
            <span className="panel-caption">{stats.total} total</span>
          </div>

          {/* One row: the two totals, then whichever user types actually
              appear in the data — no hard-coded list, so a new option on the
              form shows up here without a code change. */}
          <div className="lead-stats-row">
            <div className="enrollment-stat-card">
              <strong>{stats.total}</strong>
              <span>Total inquiries</span>
            </div>
            <div className="enrollment-stat-card">
              <strong>{stats.todayCount || 0}</strong>
              <span>Today</span>
            </div>
            {Object.entries(stats.byUserType || {}).map(([entry, count]) => (
              <div key={entry} className="enrollment-stat-card enrollment-stat-card--type">
                <strong>{count}</strong>
                <span>{entry}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search name, email, phone…"
          aria-label="Search leads"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Type">
          <option value="">All types</option>
          <option value="consultation">Consultation</option>
          <option value="enrollment">Enrollment</option>
          <option value="contact">Contact</option>
          <option value="newsletter">Newsletter</option>
        </select>
      </div>

      {loading ? <Skeleton /> : null}
      {!loading && error ? <ErrorState error={error} onRetry={load} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState title="No leads yet" body="Submissions from the public forms appear here." />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">Leads</caption>
            <thead>
              <tr>
                <th scope="col">Received</th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Type</th>
                <th scope="col">Program</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => (
                <tr key={lead._id}>
                  <td data-label="Received">
                    <span className="cell-date">{new Date(lead.createdAt).toLocaleDateString()}</span>
                    <span className="cell-time muted">{formatTime(lead.createdAt)}</span>
                  </td>
                  <td data-label="Name">{lead.name}</td>
                  <td data-label="Email">{lead.email}</td>
                  <td data-label="Type">{lead.type}</td>
                  <td data-label="Program">{lead.program || "—"}</td>
                  <td data-label="Status">
                    <select
                      value={lead.status}
                      aria-label={`Status for ${lead.name}`}
                      disabled={!can("forms.update")}
                      onChange={(event) => updateStatus(lead, event.target.value)}
                    >
                      {STATUSES.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Actions">
                    <button type="button" className="btn btn--small" onClick={() => setOpen(lead)}>
                      View
                    </button>
                    {can("forms.update") ? (
                      <button
                        type="button"
                        className="btn btn--small btn--danger"
                        onClick={() =>
                          setConfirm({
                            title: "Delete this lead?",
                            body: `"${lead.name}" (${lead.email}) will be permanently removed.`,
                            confirmLabel: "Delete",
                            tone: "danger",
                            onConfirm: () => handleDelete(lead),
                          })
                        }
                      >
                        Delete
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      {open ? (
        <Modal className="dialog--wide" label="Lead detail" onClose={() => setOpen(null)}>
            <div className="dialog-head">
              <h2>{open.name}</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setOpen(null)} aria-label="Close">
                ×
              </button>
            </div>

            <dl className="detail-list">
              <dt>Received</dt>
              <dd>{formatDateTime(open.createdAt)}</dd>
              <dt>Email</dt>
              <dd>{open.email}</dd>
              <dt>Mobile</dt>
              <dd>{open.mobile}</dd>
              <dt>Type</dt>
              <dd>{open.type}</dd>
              <dt>User type</dt>
              <dd>{open.userType || "—"}</dd>
              <dt>Program</dt>
              <dd>{open.program || "—"}</dd>
              <dt>Source page</dt>
              <dd>{open.sourcePage || "—"}</dd>
              <dt>UTM</dt>
              <dd>
                {open.utm && (open.utm.source || open.utm.campaign)
                  ? `${open.utm.source || "—"} / ${open.utm.medium || "—"} / ${open.utm.campaign || "—"}`
                  : "—"}
              </dd>
              <dt>Message</dt>
              <dd>{open.message || "—"}</dd>
              <dt>Spam score</dt>
              <dd>{open.spamScore}</dd>
            </dl>

            <h3>Notes</h3>
            {(open.notes || []).length === 0 ? <p className="muted">No notes yet.</p> : null}
            <ul className="note-list">
              {(open.notes || []).map((entry) => (
                <li key={entry._id || entry.createdAt}>
                  <p>{entry.body}</p>
                  <span className="muted">{new Date(entry.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>

            {can("forms.update") ? (
              <div className="note-compose">
                <label htmlFor="note" className="visually-hidden">
                  Add a note
                </label>
                <textarea
                  id="note"
                  rows={3}
                  placeholder="Add a note…"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <button type="button" className="btn btn--primary" onClick={addNote} disabled={!note.trim()}>
                  Add note
                </button>
              </div>
            ) : null}
        </Modal>
      ) : null}
      <ConfirmDialog
        open={Boolean(confirm)}
        busy={busy}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        tone={confirm?.tone}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

export default Leads;
