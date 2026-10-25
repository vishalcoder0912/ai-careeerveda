import {lazy, Suspense, useMemo, useState} from "react";
import {ArrowUpRight, Briefcase, Building2, Clock, Info, MapPin, Search, X} from "lucide-react";
import {jobs as staticJobs} from "../data/jobsData";
import {useContentList} from "../hooks/useContent";
import {adaptJob, LINKEDIN_SOURCE} from "../lib/contentAdapters";
import "../components/jobs-page.css";

// Only needed once someone clicks Apply, so it stays out of the page chunk.
const JobApplyDialog = lazy(() => import("../components/JobApplyDialog"));

// Categories are matched against the listing title with a pattern rather than a
// list of exact titles. The list version had to name every title in the
// catalogue verbatim, so any listing added here — or published from the admin
// panel, where no one is looking at this file — matched no category at all and
// dropped out of every filter but "All". A pattern covers titles nobody has
// written yet.
//
// Overlap is deliberate and harmless: only one category is selected at a time,
// so an Equity Research Analyst appearing under both Investment Banking and
// Finance is a listing found twice rather than a listing found never.
const CATEGORY_PATTERNS = {
  "Product Management": /product (manager|owner|management|marketing|operations|analyst)/i,
  "Business Analytics":
    /business (analyst|analytics|systems analyst|intelligence)|\bbi\b|reporting analyst|revenue operations|pricing analyst|marketing analytics/i,
  "Data Analytics":
    /data (analyst|analytics|visualization|quality)|analytics engineer|insights analyst|data scientist/i,
  "Data Engineering": /data engineer|analytics engineer|\betl\b/i,
  "Investment Banking":
    /investment banking|equity research|m&a|private equity|venture capital|capital markets|valuations|transaction advisory|credit research/i,
  Finance: /financial analyst|corporate finance|fp&a|financial planning|investment banking|equity research/i,
  "AI / ML": /machine learning|\bai\b|deep learning|\bnlp\b/i,
  Frontend: /frontend|front-end|react developer|angular|\bvue\b/i,
  Backend: /backend|back-end|node\.js|software development engineer|java developer/i,
  "Full-Stack": /full[- ]stack|\bmern\b/i,
  Cybersecurity: /cyber|security analyst|\bsoc\b|infosec/i,
  DevOps: /devops|site reliability|\bsre\b|platform engineer/i,
  Design: /designer|\bux\b|\bui\b/i,
  QA: /quality assurance|\bqa\b|test engineer|automation engineer/i,
  Writing: /content writer|technical writer|copywriter/i,
};

const categories = ["All", ...Object.keys(CATEGORY_PATTERNS)];

const workModes = ["All", "On-site", "Hybrid", "Remote"];

const jobTypes = ["All", "Full-time", "Internship", "Contract"];

// "2026-05-05" -> "5 May 2026". Parsed as a calendar date, not a UTC instant,
// so no timezone can shift it a day.
const formatPosted = (iso) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {day: "numeric", month: "short", year: "numeric"});
};

const JobsPage = () => {
  // Listings the admin panel publishes, newest first. Filtering below stays
  // client-side: the whole board is well under the API's 100-record page, and
  // filtering in the browser keeps the toolbar instant.
  const {items: jobs} = useContentList("jobs", {fallback: staticJobs, adapt: adaptJob});

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [workMode, setWorkMode] = useState("All");
  const [jobType, setJobType] = useState("All");
  const [applying, setApplying] = useState(null);

  // How many listings each category matches, shown in the dropdown.
  const categoryCounts = useMemo(() => {
    const counts = {All: jobs.length};
    for (const [name, pattern] of Object.entries(CATEGORY_PATTERNS)) {
      counts[name] = jobs.filter((job) => pattern.test(job.title)).length;
    }
    return counts;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const matches = jobs.filter((job) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch =
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          job.skills.some((s) => s.toLowerCase().includes(q)) ||
          job.location.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      if (workMode !== "All" && job.workMode !== workMode) return false;
      if (jobType !== "All" && job.jobType !== jobType) return false;

      if (category !== "All" && !CATEGORY_PATTERNS[category]?.test(job.title)) return false;

      return true;
    });
    // Newest first. ISO dates compare correctly as strings; undated sort last.
    return matches.sort((a, b) => String(b.postedDate || "").localeCompare(String(a.postedDate || "")));
  }, [jobs, search, category, workMode, jobType]);

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setWorkMode("All");
    setJobType("All");
  };

  const hasActiveFilters = search || category !== "All" || workMode !== "All" || jobType !== "All";

  return (
    <main className="jobs-page">
      <div className="jp-inner">
        <section className="jobs-hero">
          <div className="jobs-hero__eyebrow">Career Opportunities</div>
          <h1 className="jobs-hero__title">
            Find Your Next <span className="accent">Career Move</span>
          </h1>
          <p className="jobs-hero__lead">
            Explore curated opportunities across technology, analytics, finance, product management,
            cybersecurity, and artificial intelligence.
          </p>
          <p className="jobs-hero__stat">{jobs.length}+ curated job opportunities</p>
        </section>

        <div className="jobs-toolbar">
          <div className="jobs-search">
            <Search className="jobs-search__icon" size={18} aria-hidden="true" />
            <label htmlFor="job-search" className="sr-only">Search jobs</label>
            <input
              id="job-search"
              className="jobs-search__input"
              type="search"
              placeholder="Search by title, company, skill, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="jobs-filters">
            <div className="jobs-filter">
              <label htmlFor="filter-category" className="jobs-filter__label">Category</label>
              <select
                id="filter-category"
                className="jobs-filters__select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c} disabled={c !== "All" && !categoryCounts[c]}>
                    {c === "All" ? "All categories" : c} ({categoryCounts[c] || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="jobs-filter">
              <label htmlFor="filter-workmode" className="jobs-filter__label">Work mode</label>
              <select
                id="filter-workmode"
                className="jobs-filters__select"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
              >
                {workModes.map((m) => (
                  <option key={m} value={m}>{m === "All" ? "Any work mode" : m}</option>
                ))}
              </select>
            </div>

            <div className="jobs-filter">
              <label htmlFor="filter-jobtype" className="jobs-filter__label">Job type</label>
              <select
                id="filter-jobtype"
                className="jobs-filters__select"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
              >
                {jobTypes.map((t) => (
                  <option key={t} value={t}>{t === "All" ? "Any job type" : t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="jobs-count-row">
          <p className="jobs-count" role="status">
            Showing <strong>{filteredJobs.length}</strong>{" "}
            {filteredJobs.length === 1 ? "job" : "jobs"} · newest first
          </p>
          {hasActiveFilters && (
            <button className="jobs-filters__clear" onClick={clearFilters} type="button">
              <X size={14} aria-hidden="true" /> Clear filters
            </button>
          )}
        </div>

        <p className="jobs-live-note">
          <Info size={16} aria-hidden="true" />
          <span>
            <strong>See latest openings</strong> opens a live LinkedIn search for that role and city,
            sorted newest first and limited to posts from the past 3 days.
          </span>
        </p>

        <div className="jobs-grid">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <article key={job.id} className="job-card">
                <div className="job-card__header">
                  <h2 className="job-card__title">{job.title}</h2>
                  {job.acceptsApplications ? (
                    <span className="job-card__badge job-card__badge--direct">Hiring via CareerVeda</span>
                  ) : (
                    job.featured && <span className="job-card__badge">Featured</span>
                  )}
                </div>

                <div className="job-card__company">{job.company}</div>

                {/* Blank details are skipped, not rendered as a bare icon. */}
                <ul className="job-card__meta">
                  {job.location && <li><MapPin size={15} aria-hidden="true" />{job.location}</li>}
                  {job.workMode && <li><Building2 size={15} aria-hidden="true" />{job.workMode}</li>}
                  {job.experience && <li><Briefcase size={15} aria-hidden="true" />{job.experience}</li>}
                  {job.jobType && <li><Clock size={15} aria-hidden="true" />{job.jobType}</li>}
                </ul>

                {job.salary && <p className="job-card__salary">{job.salary}</p>}

                <p className="job-card__description">{job.description}</p>

                {job.skills.length > 0 && (
                  <div className="job-card__skills">
                    {job.skills.map((skill) => (
                      <span key={skill} className="job-card__skill">{skill}</span>
                    ))}
                  </div>
                )}

                <div className="job-card__footer">
                  <span className="job-card__date">
                    {job.postedDate && `Listed ${formatPosted(job.postedDate)}`}
                  </span>
                  {job.acceptsApplications ? (
                    <button type="button" className="job-card__apply" onClick={() => setApplying(job)}>
                      Apply on CareerVeda
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </button>
                  ) : (
                    <a
                      className="job-card__apply"
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={
                        job.source === LINKEDIN_SOURCE
                          ? `Newest "${job.title}" posts on LinkedIn (past 3 days)`
                          : `Apply for ${job.title} at ${job.company}`
                      }
                    >
                      {job.source === LINKEDIN_SOURCE ? "See latest openings" : "Apply Now"}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="jobs-empty" role="status">
              <Search className="jobs-empty__icon" size={32} aria-hidden="true" />
              <p className="jobs-empty__text">No jobs match your current filters.</p>
              <button className="jobs-empty__action" onClick={clearFilters} type="button">
                <X size={14} aria-hidden="true" /> Clear all filters
              </button>
            </div>
          )}
        </div>

        <p
          className="jobs-thirdparty-note"
          title="These listings are aggregated for reference from publicly available third-party job platforms. CareerVeda does not own, post, or guarantee any of these openings, and the company names shown are illustrative. Selecting See latest openings opens a live search on LinkedIn Jobs — always confirm the role and employer on the official source before applying or sharing personal information."
        >
          <Info size={14} aria-hidden="true" /> Aggregated from third-party job sites &middot; for reference only
        </p>
      </div>

      {applying && (
        <Suspense fallback={null}>
          <JobApplyDialog job={applying} onClose={() => setApplying(null)} />
        </Suspense>
      )}
    </main>
  );
};

export default JobsPage;
