import {useMemo, useState} from "react";
import {jobs as staticJobs} from "../data/jobsData";
import {useContentList} from "../hooks/useContent";
import {adaptJob} from "../lib/contentAdapters";
import "../components/jobs-page.css";

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

const JobsPage = () => {
  // Listings the admin panel publishes, newest first. Filtering below stays
  // client-side: the whole board is well under the API's 100-record page, and
  // filtering in the browser keeps the toolbar instant.
  const {items: jobs} = useContentList("jobs", {fallback: staticJobs, adapt: adaptJob});

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [workMode, setWorkMode] = useState("All");
  const [jobType, setJobType] = useState("All");

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
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
            <span className="jobs-search__icon" aria-hidden="true">&#x1F50D;</span>
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
            <label htmlFor="filter-category" className="sr-only">Category</label>
            <select
              id="filter-category"
              className="jobs-filters__select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label htmlFor="filter-workmode" className="sr-only">Work mode</label>
            <select
              id="filter-workmode"
              className="jobs-filters__select"
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
            >
              {workModes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <label htmlFor="filter-jobtype" className="sr-only">Job type</label>
            <select
              id="filter-jobtype"
              className="jobs-filters__select"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
            >
              {jobTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button className="jobs-filters__clear" onClick={clearFilters} type="button">
                &#x2715; Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="jobs-count-row">
          <p className="jobs-count" role="status">
            Showing <strong>{filteredJobs.length}</strong>{" "}
            {filteredJobs.length === 1 ? "job" : "jobs"}
          </p>
        </div>

        <div className="jobs-grid">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <article key={job.id} className="job-card">
                <div className="job-card__header">
                  <h2 className="job-card__title">{job.title}</h2>
                  {job.featured && <span className="job-card__badge">Featured</span>}
                </div>

                <div className="job-card__company">{job.company}</div>

                <div className="job-card__meta">
                  <span>&#x1F4CD; {job.location}</span>
                  <span>&#x1F3E2; {job.workMode}</span>
                  <span>&#x1F4C5; {job.experience}</span>
                  <span>&#x1F4CB; {job.jobType}</span>
                  {job.salary && <span className="job-card__salary">{job.salary}</span>}
                </div>

                <p className="job-card__description">{job.description}</p>

                <div className="job-card__skills">
                  {job.skills.map((skill) => (
                    <span key={skill} className="job-card__skill">{skill}</span>
                  ))}
                </div>

                <div className="job-card__footer">
                  <span className="job-card__date">
                    Posted {job.postedDate}
                    {job.source && (
                      <span className="job-card__source"> · via {job.source}</span>
                    )}
                  </span>
                  <a
                    className="job-card__apply"
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Search live "${job.title}" openings on ${job.source}`}
                  >
                    View Jobs on LinkedIn &#x2192;
                  </a>
                </div>
              </article>
            ))
          ) : (
            <div className="jobs-empty" role="status">
              <div className="jobs-empty__icon" aria-hidden="true">&#x1F50D;</div>
              <p className="jobs-empty__text">No jobs match your current filters.</p>
              <button className="jobs-empty__action" onClick={clearFilters} type="button">
                &#x2715; Clear all filters
              </button>
            </div>
          )}
        </div>

        <p
          className="jobs-thirdparty-note"
          title="These listings are aggregated for reference from publicly available third-party job platforms. CareerVeda does not own, post, or guarantee any of these openings, and the company names shown are illustrative. Selecting Apply Now opens a live search on LinkedIn Jobs — always confirm the role and employer on the official source before applying or sharing personal information."
        >
          <span aria-hidden="true">&#x2139;</span> Aggregated from third-party job sites &middot; for reference only
        </p>
      </div>
    </main>
  );
};

export default JobsPage;
