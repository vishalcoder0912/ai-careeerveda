import {useCallback, useEffect, useRef, useState} from "react";
import {ArrowUpRight, Briefcase, Building2, Calendar, Clock, MapPin, Users, X} from "lucide-react";

const LINKEDIN_SOURCE = "LinkedIn Jobs";

const Section = ({title, children}) => {
  if (!children) return null;
  return (
    <section className="job-details__section">
      <h3>{title}</h3>
      {children}
    </section>
  );
};

const List = ({items}) => {
  const clean = (Array.isArray(items) ? items : []).map((v) => String(v || "").trim()).filter(Boolean);
  if (!clean.length) return null;
  return (
    <ul className="job-details__list">
      {clean.map((item, i) => <li key={`${i}-${item.slice(0,20)}`}>{item}</li>)}
    </ul>
  );
};

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {day: "numeric", month: "short", year: "numeric"});
};

const useJobDetailsData = (job) => {
  const [full, setFull] = useState(job);

  useEffect(() => { setFull(job); }, [job]);

  useEffect(() => {
    const slug = job?.slug || (typeof job?.id === "string" ? job.id : null);
    if (!slug) return;
    const base = String(import.meta.env.VITE_PUBLIC_API_BASE_URL || (import.meta.env.DEV ? "/api/v1" : "")).replace(/\/+$/, "");
    if (!base) return;
    const controller = new AbortController();
    fetch(`${base}/public/jobs/${encodeURIComponent(slug)}`, {signal: controller.signal, headers: {Accept: "application/json"}})
      .then((r) => r.ok ? r.json() : null)
      .then((body) => {
        if (body?.success && body.data) setFull((prev) => ({...prev, ...body.data, slug: body.data.slug || slug, id: prev.id || body.data.slug || slug}));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [job?.slug, job?.id]);

  return full || job;
};

const getJobView = (data, job) => {
  const deadline = formatDate(data.applicationDeadline || data.deadline);
  const posted = formatDate(data.postedDate || data.postedAt || data.createdAt);
  const salary = data.salary || data.salaryRange || (data.salaryMin || data.salaryMax ? `${data.salaryMin || ""}${data.salaryMin && data.salaryMax ? " - " : ""}${data.salaryMax || ""}` : "");
  const experience = data.experience || data.experienceLevel || "";
  const employmentType = data.jobType || data.employmentType || "";
  const overview = data.jobOverview || data.description || "";
  const isClosed = Boolean((data.applicationDeadline || data.deadline) && new Date(data.applicationDeadline || data.deadline).getTime() < Date.now());
  const slug = data.slug || job?.slug || (typeof data.id === "string" ? data.id : typeof job?.id === "string" ? job.id : "");
  const canApplyWithCareerVeda = data.acceptsApplications === true;
  const meta = [
    data.location && {icon: MapPin, label: data.location},
    data.workMode && {icon: Building2, label: data.workMode},
    experience && {icon: Briefcase, label: experience},
    employmentType && {icon: Clock, label: employmentType},
    data.vacancies != null && data.vacancies !== "" && {icon: Users, label: `${data.vacancies} vacancies`},
    posted && {icon: Calendar, label: `Posted ${posted}`},
    deadline && {icon: Calendar, label: `Apply by ${deadline}`},
  ].filter(Boolean);
  return {deadline, posted, salary, experience, employmentType, overview, isClosed, slug, canApplyWithCareerVeda, meta};
};

const JobDetailsBody = ({data, view}) => {
  // The admin editor writes `requirements`; older and aggregator-fed records
  // carry `qualifications` instead. Both keys exist on those records, with
  // `qualifications` an empty array, so `data.qualifications || data.requirements`
  // quietly hid everything an editor typed. Show both lists, de-duplicated, so
  // an admin edit is never swallowed by a stale sibling field.
  const qualifications = [
    ...new Set([
      ...(Array.isArray(data.requirements) ? data.requirements : []),
      ...(Array.isArray(data.qualifications) ? data.qualifications : []),
    ]),
  ];

  return (
    <div className="job-details__body">
      {view.meta.length ? (
        <ul className="job-details__meta">
          {view.meta.map((m, i) => {
            const Icon = m.icon;
            return <li key={i}><Icon size={15} aria-hidden="true" /><span>{m.label}</span></li>;
          })}
        </ul>
      ) : null}
      {view.salary ? <p className="job-details__salary">{view.salary}</p> : null}
      <Section title="About the company">{data.aboutCompany ? <p className="job-details__text">{data.aboutCompany}</p> : null}</Section>
      <Section title="Job overview">{view.overview ? <p className="job-details__text">{view.overview}</p> : null}</Section>
      <Section title="Roles and responsibilities"><List items={data.responsibilities} /></Section>
      <Section title="Required qualifications"><List items={qualifications} /></Section>
      <Section title="Required technical skills"><List items={data.skills} /></Section>
      <Section title="Preferred skills"><List items={data.preferredSkills} /></Section>
      <Section title="Experience requirements">{view.experience ? <p className="job-details__text">{view.experience}</p> : null}</Section>
      <Section title="Education requirements">{data.educationRequirements ? <p className="job-details__text">{data.educationRequirements}</p> : null}</Section>
      <Section title="Benefits and perks"><List items={data.benefits} /></Section>
      <Section title="Selection process"><List items={data.selectionProcess} /></Section>
      <Section title="Additional instructions">{data.additionalInstructions ? <p className="job-details__text">{data.additionalInstructions}</p> : null}</Section>
    </div>
  );
};

const JobDetailsFooter = ({data, view, onApply}) => (
  <footer className="job-details__footer">
    {view.isClosed ? (
      <p className="job-apply__error">Applications for this role are closed.</p>
    ) : view.canApplyWithCareerVeda ? (
      <button type="button" className="job-card__apply" onClick={() => { onApply?.({...data, slug: view.slug}); }}>
        Apply with CareerVeda <ArrowUpRight size={16} aria-hidden="true" />
      </button>
    ) : data.applyUrl ? (
      <a className="job-card__apply" href={data.applyUrl} target="_blank" rel="noopener noreferrer">
        {data.source === LINKEDIN_SOURCE ? "See latest openings" : "Apply Now"}
        <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    ) : (
      <p className="job-apply__error">Applications for this role are closed.</p>
    )}
  </footer>
);

const JobDetailsModal = ({job, onClose, onApply}) => {
  const ref = useRef(null);
  const [show, setShow] = useState(false);
  const showRafRef = useRef(0);
  const closeTimerRef = useRef(0);
  const data = useJobDetailsData(job);
  const view = getJobView(data, job);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal?.();
    showRafRef.current = requestAnimationFrame(() => setShow(true));
    return () => {
      if (showRafRef.current) cancelAnimationFrame(showRafRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const close = useCallback(() => {
    setShow(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = 0;
      onClose?.();
    }, 180);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <dialog
      ref={ref}
      className={`job-details${show ? " is-open" : ""}`}
      aria-labelledby="job-details-title"
      onClose={onClose}
      data-lenis-prevent
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="job-details__panel" role="document">
        <header className="job-details__head">
          <div>
            <p className="job-details__eyebrow">{data.department || data.category || "Job Overview"}</p>
            <h2 id="job-details-title">{data.title}</h2>
            {data.company ? <p className="job-details__company">{data.company}</p> : null}
          </div>
          <button type="button" className="job-apply__close" onClick={close} aria-label="Close job details">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <JobDetailsBody data={data} view={view} />
        <JobDetailsFooter data={data} view={view} onApply={onApply} />
      </div>
    </dialog>
  );
};

export default JobDetailsModal;