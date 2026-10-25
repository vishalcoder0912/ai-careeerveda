import {useCallback, useEffect, useState} from "react";

import {applicationsApi} from "../services/api";
import {useAuth} from "../context/AuthContext";
import {useToast} from "../context/ToastContext";
import {ConfirmDialog} from "../components/ConfirmDialog";
import {Skeleton, EmptyState, ErrorState} from "../components/States";

const STATUSES = ["new", "reviewing", "shortlisted", "rejected", "hired"];

const formatDateTime = (value) =>
  `${new Date(value).toLocaleDateString()}, ${new Date(value).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}`;

// Blank filters are left off the query rather than sent as "".
const filters = ({search, status, job}) => ({
  search: search || undefined,
  status: status || undefined,
  job: job || undefined,
});

// Who applied to which CareerVeda-posted job. Same layout and permissions as
// the Leads inbox: forms.read to see, forms.update to change, forms.export to
// download.
const JobApplications = () => {
  const {can} = useAuth();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({page: 1, total: 0, totalPages: 0});
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [job, setJob] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await applicationsApi.list({page, limit: 25, ...filters({search, status, job})});
      setItems(response.data);
      setMeta(response.meta);
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, job]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    applicationsApi
      .jobs()
      .then((response) => setJobs(response.data))
      .catch(() => {});
  }, []);

  const updateStatus = async (row, next) => {
    setItems((rows) => rows.map((entry) => (entry._id === row._id ? {...entry, status: next} : entry)));
    try {
      await applicationsApi.update(row._id, {status: next});
      toast.success("Status updated.");
    } catch (failure) {
      setItems((rows) => rows.map((entry) => (entry._id === row._id ? {...entry, status: row.status} : entry)));
      toast.error(failure.message || "Could not update the application.");
    }
  };

  const handleDelete = async (row) => {
    setBusy(true);
    try {
      await applicationsApi.remove(row._id);
      toast.success("Application deleted.");
      setConfirm(null);
      setItems((rows) => rows.filter((entry) => entry._id !== row._id));
      setMeta((current) => ({...current, total: Math.max(0, current.total - 1)}));
      if (page > 1 && items.length === 1) setPage(page - 1);
    } catch (failure) {
      toast.error(failure.message || "Could not delete the application.");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    try {
      const blob = await applicationsApi.exportCsv(filters({search, status, job}));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `careerveda-job-applications-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch (failure) {
      toast.error(failure.message || "Export failed.");
    }
  };

  const resetPage = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Job applications</h1>
          <p className="page-sub">{meta.total} records</p>
        </div>
        {can("forms.export") ? (
          <button type="button" className="btn btn--primary" onClick={exportCsv}>
            Export CSV
          </button>
        ) : null}
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search name, mobile, LMS ID, job…"
          aria-label="Search applications"
          value={search}
          onChange={resetPage(setSearch)}
        />
        <select value={job} onChange={resetPage(setJob)} aria-label="Job">
          <option value="">All jobs</option>
          {jobs.map((entry) => (
            <option key={entry._id} value={entry._id}>
              {entry.title}
              {entry.company ? ` · ${entry.company}` : ""} ({entry.count})
            </option>
          ))}
        </select>
        <select value={status} onChange={resetPage(setStatus)} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </div>

      {loading ? <Skeleton /> : null}
      {!loading && error ? <ErrorState error={error} onRetry={load} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No applications yet"
          body='Turn on "Accept applications on CareerVeda" on a job listing; applications from the Jobs page appear here.'
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="table-wrap">
          <table className="leads-table">
            <caption className="visually-hidden">Job applications</caption>
            <thead>
              <tr>
                <th scope="col">Applied</th>
                <th scope="col">Job</th>
                <th scope="col">Name</th>
                <th scope="col">Mobile</th>
                <th scope="col">LMS ID</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row._id}>
                  <td data-label="Applied">{formatDateTime(row.createdAt)}</td>
                  <td data-label="Job">
                    {row.jobTitle}
                    {row.jobCompany ? <span className="muted"> · {row.jobCompany}</span> : null}
                  </td>
                  <td data-label="Name">{row.name}</td>
                  <td data-label="Mobile">
                    <a href={`tel:${row.mobile.replace(/[^\d+]/g, "")}`}>{row.mobile}</a>
                  </td>
                  <td data-label="LMS ID">{row.lmsId}</td>
                  <td data-label="Status">
                    <select
                      value={row.status}
                      aria-label={`Status for ${row.name}`}
                      disabled={!can("forms.update")}
                      onChange={(event) => updateStatus(row, event.target.value)}
                    >
                      {STATUSES.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Actions">
                    {can("forms.update") ? (
                      <button
                        type="button"
                        className="btn btn--small btn--danger"
                        onClick={() =>
                          setConfirm({
                            title: "Delete this application?",
                            body: `${row.name}'s application for "${row.jobTitle}" will be permanently removed.`,
                            onConfirm: () => handleDelete(row),
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
          <button
            type="button"
            className="btn"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        busy={busy}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

export default JobApplications;
