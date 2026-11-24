import {useCallback, useEffect, useState} from "react";

import {applicationsApi} from "../services/api";
import {useAuth} from "../context/AuthContext";
import {useToast} from "../context/ToastContext";
import {ConfirmDialog} from "../components/ConfirmDialog";
import {Skeleton, EmptyState, ErrorState} from "../components/States";

const STATUS_OPTIONS = [
  {value: "new", label: "New"},
  {value: "under_review", label: "Under Review"},
  {value: "reviewing", label: "Under Review (legacy)"},
  {value: "shortlisted", label: "Shortlisted"},
  {value: "interview_scheduled", label: "Interview Scheduled"},
  {value: "selected", label: "Selected"},
  {value: "hired", label: "Selected (legacy)"},
  {value: "rejected", label: "Rejected"},
];

const CANONICAL = [
  {key: "new", label: "New Applications", match: ["new"]},
  {key: "under_review", label: "Under Review", match: ["under_review", "reviewing"]},
  {key: "shortlisted", label: "Shortlisted", match: ["shortlisted"]},
  {key: "interview_scheduled", label: "Interview Scheduled", match: ["interview_scheduled"]},
  {key: "selected", label: "Selected", match: ["selected", "hired"]},
  {key: "rejected", label: "Rejected", match: ["rejected"]},
];

// Presentation only: the icon, accent and filter value behind each KPI tile.
// Kept separate from the status mapping so adding a status does not change how
// the cards are counted — only CANONICAL and the API stats need to agree.
const KPI_META = {
  total: {label: "Total Applications", tone: "total", icon: "total"},
  new: {label: "New Applications", tone: "new", icon: "new"},
  under_review: {label: "Under Review", tone: "under_review", icon: "review"},
  shortlisted: {label: "Shortlisted", tone: "shortlisted", icon: "star"},
  interview_scheduled: {label: "Interview Scheduled", tone: "interview_scheduled", icon: "calendar"},
  selected: {label: "Selected", tone: "selected", icon: "check"},
  rejected: {label: "Rejected", tone: "rejected", icon: "cross"},
};

const KPI_ICONS = {
  total: <><rect x="4" y="3" width="16" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  new: <><path d="M4 5h16l2 9v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5z" /><path d="M4 14h4l2 3h4l2-3h4" /></>,
  review: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.5" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  cross: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
};

const KpiIcon = ({name}) => (
  <svg className="app-kpi__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {KPI_ICONS[name] || KPI_ICONS.total}
  </svg>
);

const statusLabel = (value) => STATUS_OPTIONS.find((s) => s.value === value)?.label || value || "New";

const fmt = (value) =>
  value ? `${new Date(value).toLocaleDateString()}, ${new Date(value).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}` : "—";

const makeFilters = ({search, status, job, from, to, sort}) => ({
  search: search || undefined,
  status: status || undefined,
  job: job || undefined,
  from: from || undefined,
  to: to || undefined,
  sort: sort || undefined,
});

const uniqueStatusOptions = STATUS_OPTIONS.filter((s, i, a) => a.findIndex((x) => x.value === s.value) === i);

const buildKpis = (meta) => {
  const stats = meta.stats || {};
  const get = (key) => {
    if (key === "new") return stats.new ?? 0;
    if (key === "under_review") return stats.underReview ?? 0;
    if (key === "shortlisted") return stats.shortlisted ?? 0;
    if (key === "interview_scheduled") return stats.interviewScheduled ?? 0;
    if (key === "selected") return stats.selected ?? 0;
    return stats.rejected ?? 0;
  };
  const total = stats.totalApplications ?? meta.total ?? 0;
  return [
    {...KPI_META.total, key: "total", value: total},
    ...CANONICAL.map((c) => ({...KPI_META[c.key], key: c.key, status: c.match[0], value: get(c.key)})),
  ];
};

const useJobApplications = ({can, toast}) => {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({page: 1, total: 0, totalPages: 0, stats: null});
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [job, setJob] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [remark, setRemark] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await applicationsApi.list({page, limit: 25, ...makeFilters({search, status, job, from, to, sort})});
      setItems(response.data || []);
      setMeta(response.meta || {page: 1, total: 0, totalPages: 0});
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, job, from, to, sort]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    applicationsApi.jobs().then((r) => setJobs(r.data || [])).catch(() => {});
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const res = await applicationsApi.get(id);
      setDetail(res.data);
    } catch (e) {
      toast.error(e.message || "Could not load application details.");
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (selectedId) loadDetail(selectedId); else setDetail(null); }, [selectedId, loadDetail]);

  const updateStatus = async (row, next, note = "") => {
    try {
      const res = await applicationsApi.updateStatus(row._id, {status: next, remark: note || undefined});
      const updated = res.data;
      setItems((rows) => rows.map((r) => (r._id === row._id ? {...r, ...updated} : r)));
      if (detail?._id === row._id) setDetail(updated);
      toast.success("Application updated.");
      return updated;
    } catch (failure) {
      toast.error(failure.message || "Could not update the application.");
      return null;
    }
  };

  const handleDelete = async (row) => {
    setBusy(true);
    try {
      await applicationsApi.remove(row._id);
      toast.success("Application deleted.");
      setConfirm(null);
      if (selectedId === row._id) setSelectedId(null);
      await load();
    } catch (failure) {
      toast.error(failure.message || "Could not delete the application.");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    try {
      const blob = await applicationsApi.exportCsv(makeFilters({search, status, job, from, to, sort}));
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

  const openResume = async (id) => {
    try {
      toast.info("Opening resume...");
      const result = await applicationsApi.openResume(id);
      if (result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (result.blob) {
        const url = URL.createObjectURL(result.blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (e) {
      toast.error(e.message || "Could not open resume.");
    }
  };

  const resetPage = (setter) => (event) => { setter(event.target.value); setPage(1); };

  return {
    can, items, meta, jobs, loading, error, search, status, job, from, to, sort, page, confirm, busy, selectedId, detail, detailLoading, remark,
    setSearch, setStatus, setJob, setFrom, setTo, setSort, setPage, setConfirm, setSelectedId, setRemark,
    load, updateStatus, handleDelete, exportCsv, openResume, resetPage,
  };
};

const JobKpis = ({kpis, activeStatus, onSelect, loading}) => {
  const total = kpis[0]?.value ?? 0;
  const share = (value) => (total > 0 ? Math.round((value / total) * 100) : 0);

  return (
    <section className="app-kpis" aria-label="Application overview" aria-busy={loading || undefined}>
      <div className="app-kpis__grid">
        {kpis.map((k) => {
          const selected = k.status ? activeStatus === k.status : !activeStatus;
          const percent = k.status ? share(k.value) : (total > 0 ? 100 : 0);
          return (
            <button
              type="button"
              key={k.key}
              className={`app-kpi kpi-tone--${k.tone}${selected ? " is-active" : ""}`}
              aria-pressed={selected}
              onClick={() => onSelect(k.status || "")}
              title={k.status ? `Show only ${k.label.toLowerCase()}` : "Show all applications"}
            >
              <span className="app-kpi__top">
                <span className="app-kpi__icon-wrap"><KpiIcon name={k.icon} /></span>
                <span className="app-kpi__label">{k.label}</span>
              </span>
              <span className="app-kpi__value">{k.value.toLocaleString()}</span>
              <span className="app-kpi__foot">
                <span>{k.status ? `${share(k.value)}% of total` : "All applications"}</span>
                <span className="app-kpi__bar" aria-hidden="true"><span style={{width: `${percent}%`}} /></span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

const JobFilters = ({state}) => (
  <div className="toolbar" style={{flexWrap:"wrap",gap:8}}>
    <input type="search" placeholder="Search name, email, phone, job…" aria-label="Search applications" value={state.search} onChange={state.resetPage(state.setSearch)} />
    <select value={state.job} onChange={state.resetPage(state.setJob)} aria-label="Job">
      <option value="">All jobs</option>
      {state.jobs.map((entry) => <option key={entry._id} value={entry._id}>{entry.title}{entry.company ? ` · ${entry.company}` : ""} ({entry.count})</option>)}
    </select>
    <select value={state.status} onChange={state.resetPage(state.setStatus)} aria-label="Status">
      <option value="">All statuses</option>
      {CANONICAL.map((s) => <option key={s.key} value={s.match[0]}>{s.label}</option>)}
    </select>
    <input type="date" value={state.from} onChange={state.resetPage(state.setFrom)} aria-label="From date" />
    <input type="date" value={state.to} onChange={state.resetPage(state.setTo)} aria-label="To date" />
    <select value={state.sort} onChange={state.resetPage(state.setSort)} aria-label="Sort">
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
    </select>
  </div>
);

const ApplicationRow = ({row, can, onStatus, onDelete, onOpen, onOpenResume}) => {
  const resumeOk = row.resumeUrl || row.resume?.resumeUrl || row.resumeFileId || row.resume?.resumeFileId;
  return (
    <tr onClick={() => onOpen(row._id)} style={{cursor:"pointer"}}>
      <td data-label="Candidate">{row.fullName || row.name}</td>
      <td data-label="Job">{row.jobTitle}{row.jobCompany ? <span className="muted"> · {row.jobCompany}</span> : null}</td>
      <td data-label="Email">{row.email ? <a href={`mailto:${row.email}`} onClick={(e)=>e.stopPropagation()}>{row.email}</a> : <span className="muted">—</span>}</td>
      <td data-label="Phone">{(row.mobile || row.phone) ? <a href={`tel:${String(row.mobile||row.phone).replace(/[^\d+]/g,"")}`} onClick={(e)=>e.stopPropagation()}>{row.mobile || row.phone}</a> : "—"}</td>
      <td data-label="Applied">{fmt(row.appliedAt || row.createdAt)}</td>
      <td data-label="Status" onClick={(e)=>e.stopPropagation()}>
        <select value={row.status} aria-label={`Status for ${row.name}`} disabled={!can("forms.update")} onChange={(e) => onStatus(row, e.target.value)}>
          {uniqueStatusOptions.map((entry) => <option key={entry.value} value={entry.value}>{statusLabel(entry.value)}</option>)}
        </select>
      </td>
      <td data-label="Resume">{resumeOk ? <button type="button" className="btn btn--small" onClick={(e)=>{e.stopPropagation(); onOpenResume(row._id);}}>View</button> : <span className="muted">—</span>}</td>
      <td data-label="Actions" onClick={(e)=>e.stopPropagation()}>
        {can("forms.update") ? <button type="button" className="btn btn--small btn--danger" onClick={() => onDelete(row)}>Delete</button> : null}
      </td>
    </tr>
  );
};

const CandidateSummary = ({detail}) => (
  <>
    <div><strong>{detail.fullName || detail.name}</strong><div className="muted">{detail.jobTitle}{detail.jobCompany ? ` · ${detail.jobCompany}` : ""}</div></div>
    <div><strong>Email:</strong> {detail.email || "—"}</div>
    <div><strong>Phone:</strong> {detail.mobile || detail.phone || "—"}</div>
    <div><strong>Location:</strong> {detail.currentLocation || "—"}</div>
    <div><strong>Gender:</strong> {detail.gender || "—"}</div>
    <div><strong>Experience:</strong> {detail.totalExperience || detail.experience || "—"}</div>
    <div><strong>Employment:</strong> {detail.currentEmploymentStatus || detail.employmentStatus || "—"}</div>
    <div><strong>LinkedIn:</strong> {detail.linkedinUrl ? <a href={detail.linkedinUrl} target="_blank" rel="noreferrer">Open</a> : "—"}</div>
    <div><strong>Portfolio/GitHub:</strong> {detail.portfolioUrl ? <a href={detail.portfolioUrl} target="_blank" rel="noreferrer">Open</a> : "—"}</div>
    <div><strong>Applied:</strong> {fmt(detail.appliedAt || detail.createdAt)}</div>
    <div><strong>Status:</strong> {statusLabel(detail.status)}</div>
  </>
);

const CandidateResume = ({detail, onOpenResume}) => {
  const hasResume = detail.resumeUrl || detail.resume?.resumeUrl || detail.resumeFileId;
  const name = detail.resumeFileName || detail.resume?.resumeFileName;
  return (
    <div>
      <strong>Resume:</strong>{" "}
      {hasResume ? <button type="button" className="btn btn--small" onClick={() => onOpenResume(detail._id)}>Preview / Download</button> : "—"}
      {name ? <div className="muted" style={{fontSize:12}}>{name}</div> : null}
    </div>
  );
};

const RemarksSection = ({detail, canUpdate, remark, setRemark, onSave}) => (
  <div>
    <label htmlFor="app-remark"><strong>Admin remarks</strong></label>
    <textarea id="app-remark" value={remark} onChange={(e)=>setRemark(e.target.value)} rows={3} style={{width:"100%",marginTop:4}} placeholder="Add internal remark..." />
    {canUpdate ? <button type="button" className="btn btn--small" style={{marginTop:6}} onClick={onSave}>Save remark</button> : null}
    <ul style={{margin:"8px 0 0",paddingLeft:18}}>
      {(detail.adminRemarks||[]).slice().reverse().map((r,i)=>(<li key={i}><span className="muted">{fmt(r.addedAt)}:</span> {r.body}</li>))}
      {!detail.adminRemarks?.length ? <li className="muted">No remarks yet.</li> : null}
    </ul>
  </div>
);

const HistorySection = ({detail}) => (
  <div>
    <strong>Status history</strong>
    <ul style={{margin:"4px 0 0",paddingLeft:18}}>
      {(detail.statusHistory||[]).slice().reverse().map((h,i)=>(<li key={i}>{fmt(h.changedAt)}: {statusLabel(h.from||"new")} → {statusLabel(h.to)}{h.note ? ` — ${h.note}` : ""}</li>))}
      {!detail.statusHistory?.length ? <li className="muted">No history.</li> : null}
    </ul>
  </div>
);

const CandidateProfile = ({state, onSaveRemark}) => {
  if (state.detailLoading || !state.detail) return <p className="muted">Loading…</p>;
  const detail = state.detail;
  return (
    <div style={{display:"grid",gap:10,marginTop:12}}>
      <CandidateSummary detail={detail} />
      <CandidateResume detail={detail} onOpenResume={state.openResume} />
      <div>
        <strong>Cover letter</strong>
        <p style={{whiteSpace:"pre-wrap",margin:"4px 0 0"}}>{detail.coverLetter || "—"}</p>
      </div>
      <RemarksSection
        detail={detail}
        canUpdate={state.can("forms.update")}
        remark={state.remark}
        setRemark={state.setRemark}
        onSave={onSaveRemark}
      />
      <HistorySection detail={detail} />
    </div>
  );
};

const ApplicationsContent = ({state, onDelete, onSaveRemark}) => {
  if (state.loading) return <Skeleton />;
  if (state.error) return <ErrorState error={state.error} onRetry={state.load} />;
  if (state.items.length === 0) return <EmptyState title="No applications found" body="Applications submitted from the Jobs page will appear here." />;
  return (
    <div style={{display:"grid",gridTemplateColumns: state.selectedId ? "minmax(0,1.6fr) minmax(320px,1fr)" : "1fr",gap:16,alignItems:"start"}}>
      <div className="table-wrap">
        <table className="leads-table">
          <caption className="visually-hidden">Job applications</caption>
          <thead>
            <tr>
              <th scope="col">Candidate</th>
              <th scope="col">Job Title</th>
              <th scope="col">Email</th>
              <th scope="col">Phone</th>
              <th scope="col">Applied</th>
              <th scope="col">Status</th>
              <th scope="col">Resume</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.items.map((row) => (
              <ApplicationRow
                key={row._id}
                row={row}
                can={state.can}
                onStatus={state.updateStatus}
                onDelete={onDelete}
                onOpen={state.setSelectedId}
                onOpenResume={state.openResume}
              />
            ))}
          </tbody>
        </table>
      </div>
      {state.selectedId ? (
        <aside className="card" style={{padding:16,position:"sticky",top:16,maxHeight:"80vh",overflow:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"start"}}>
            <h2 style={{margin:0,fontSize:18}}>Candidate profile</h2>
            <button type="button" className="btn btn--small" onClick={() => state.setSelectedId(null)}>Close</button>
          </div>
          <CandidateProfile state={state} onSaveRemark={onSaveRemark} />
        </aside>
      ) : null}
    </div>
  );
};

const Pagination = ({meta, page, setPage}) => {
  if (meta.totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</button>
      <span>Page {meta.page} of {meta.totalPages}</span>
      <button type="button" className="btn" disabled={page >= meta.totalPages} onClick={() => setPage((v) => v + 1)}>Next</button>
    </nav>
  );
};

const JobApplications = () => {
  const {can} = useAuth();
  const toast = useToast();
  const state = useJobApplications({can, toast});

  const onDelete = (row) => state.setConfirm({
    title: "Delete this application?",
    body: `${row.fullName || row.name}'s application for "${row.jobTitle}" will be permanently removed.`,
    onConfirm: () => state.handleDelete(row),
  });

  const onSaveRemark = async () => {
    if (!state.remark.trim() || !state.detail) return;
    await state.updateStatus(state.detail, state.detail.status, state.remark.trim());
    state.setRemark("");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Job applications</h1>
          <p className="page-sub">{state.meta.total} records</p>
        </div>
        {state.can("forms.export") ? <button type="button" className="btn btn--primary" onClick={state.exportCsv}>Export CSV</button> : null}
      </div>
      <JobKpis
        kpis={buildKpis(state.meta)}
        activeStatus={state.status}
        loading={state.loading}
        onSelect={(next) => { state.setStatus(next); state.setPage(1); }}
      />
      <JobFilters state={state} />
      <ApplicationsContent state={state} onDelete={onDelete} onSaveRemark={onSaveRemark} />
      <Pagination meta={state.meta} page={state.page} setPage={state.setPage} />
      <ConfirmDialog
        open={Boolean(state.confirm)}
        busy={state.busy}
        title={state.confirm?.title}
        body={state.confirm?.body}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => state.confirm?.onConfirm()}
        onCancel={() => state.setConfirm(null)}
      />
    </div>
  );
};

export default JobApplications;