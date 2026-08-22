import {useEffect, useState} from "react";
import {Link} from "react-router-dom";

import {RESOURCE_LIST, resourcePermission} from "../config/resources";
import {contentApi, leadsApi} from "../services/api";
import {useAuth} from "../context/AuthContext";
import {Skeleton, ErrorState, StatusBadge} from "../components/States";

const relativeTime = (value) => {
  if (!value) return "";
  const then = new Date(value).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toISOString().slice(0, 10);
};

const Dashboard = () => {
  const {admin, can} = useAuth();
  const [counts, setCounts] = useState(null);
  const [recent, setRecent] = useState([]);
  const [leadStats, setLeadStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const visible = RESOURCE_LIST.filter((resource) => can(resourcePermission(resource, "read")));

        const results = await Promise.all(
          visible.map(async (resource) => {
            const response = await contentApi(resource.name).list({
              limit: 6,
              sort: "updatedAt",
              order: "desc",
            });
            return {resource, total: response.meta.total, items: response.data};
          }),
        );

        const leads = can("forms.read") ? await leadsApi.stats() : null;

        if (cancelled) return;

        setCounts(results.map(({resource, total}) => ({resource, total})));

        const merged = results
          .flatMap(({resource, items}) => items.map((item) => ({resource, item})))
          .sort((a, b) => new Date(b.item.updatedAt || 0) - new Date(a.item.updatedAt || 0))
          .slice(0, 8);

        setRecent(merged);
        setLeadStats(leads ? leads.data : null);
      } catch (failure) {
        if (!cancelled) setError(failure);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [can]);

  const firstName = admin?.name ? admin.name.split(" ")[0] : null;
  const createLinks = (counts || [])
    .filter(({resource}) => can(resourcePermission(resource, "create")))
    .slice(0, 3);

  return (
    <div className="page dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="dashboard-eyebrow">CareerVeda CMS</span>
          <h1>{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</h1>
          <p>
            Manage website content, review recent changes, and publish updates from one clear workspace.
          </p>
        </div>

        <div className="dashboard-hero-actions">
          {createLinks.map(({resource}, index) => (
            <Link
              key={resource.name}
              className={index === 0 ? "btn btn--primary" : "btn"}
              to={`/${resource.name}/new`}
            >
              <span aria-hidden="true">+</span>
              New {resource.singular.toLowerCase()}
            </Link>
          ))}
        </div>
      </section>

      {loading ? <Skeleton rows={4} /> : null}
      {!loading && error ? <ErrorState error={error} /> : null}

      {!loading && !error ? (
        <>
          <section className="dashboard-section" aria-labelledby="content-overview-title">
            <div className="section-head">
              <div>
                <span className="section-kicker">Content overview</span>
                <h2 id="content-overview-title">Everything on your website</h2>
              </div>
              <p>Select a section to review, edit, or publish its content.</p>
            </div>

            <div className="dashboard-resource-grid">
              {(counts || []).map(({resource, total}) => {
                const canCreate = can(resourcePermission(resource, "create"));

                return (
                  <article className="dashboard-resource-card" key={resource.name}>
                    <Link className="dashboard-resource-main" to={`/${resource.name}`}>
                      <span className="dashboard-resource-icon" aria-hidden="true">
                        {resource.singular.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="dashboard-resource-copy">
                        <strong>{resource.label}</strong>
                        <small>{total} {total === 1 ? "item" : "items"}</small>
                      </span>
                      <span className="dashboard-resource-arrow" aria-hidden="true">→</span>
                    </Link>

                    {canCreate ? (
                      <Link className="dashboard-resource-create" to={`/${resource.name}/new`}>
                        <span aria-hidden="true">+</span>
                        Create new
                      </Link>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <div className="dashboard-columns">
            <section className="panel dashboard-activity">
              <div className="panel-head">
                <div>
                  <span className="section-kicker">Activity</span>
                  <h2>Recently edited</h2>
                </div>
                <span className="panel-caption">Latest 8 updates</span>
              </div>

              {recent.length > 0 ? (
                <ul className="recent-list">
                  {recent.map(({resource, item}) => (
                    <li key={`${resource.name}-${item._id}`} className="recent-item">
                      <span className="recent-item-icon" aria-hidden="true">
                        {resource.singular.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="recent-item-content">
                        <Link className="recent-item-title" to={`/${resource.name}/${item._id}`}>
                          {item[resource.titleField] || "Untitled"}
                        </Link>
                        <span className="recent-item-meta">
                          <span>{resource.singular}</span>
                          <span aria-hidden="true">•</span>
                          <span>{relativeTime(item.updatedAt)}</span>
                        </span>
                      </span>
                      <StatusBadge status={item.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dashboard-empty">No content has been edited yet.</p>
              )}
            </section>

            <aside className="dashboard-side">
              <section className="panel dashboard-guide">
                <span className="section-kicker">Publishing workflow</span>
                <h2>Three steps to update the site</h2>
                <ol className="workflow-steps">
                  <li>
                    <span>1</span>
                    <div>
                      <strong>Create or edit</strong>
                      <small>Complete the content fields and save a draft.</small>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <strong>Review the checklist</strong>
                      <small>Resolve fields marked as required for publishing.</small>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <strong>Publish</strong>
                      <small>The update becomes available on the public website.</small>
                    </div>
                  </li>
                </ol>
              </section>

              {leadStats ? (
                <section className="panel dashboard-leads">
                  <div className="panel-head">
                    <div>
                      <span className="section-kicker">Enquiries</span>
                      <h2>Enrollment inquiries</h2>
                    </div>
                    <Link className="text-link" to="/leads?type=enrollment">View all →</Link>
                  </div>

                  <div className="enrollment-stats-grid">
                    <div className="enrollment-stat-card">
                      <strong>{leadStats.total}</strong>
                      <span>Total Inquiries</span>
                    </div>
                    <div className="enrollment-stat-card">
                      <strong>{leadStats.todayCount || 0}</strong>
                      <span>Today</span>
                    </div>
                  </div>

                  {leadStats.byUserType ? (
                    <div className="enrollment-user-types">
                      <h3>By user type</h3>
                      <div className="user-type-chips">
                        {Object.entries(leadStats.byUserType).map(([type, count]) => (
                          <div key={type} className="user-type-chip">
                            <strong>{count}</strong>
                            <span>{type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;
