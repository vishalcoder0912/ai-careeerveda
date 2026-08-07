import {Navigate, useParams} from "react-router-dom";
import {PageHero} from "../components/PageShell";
import {policies as staticPolicies} from "../data/policies";
import {useContentMap} from "../hooks/useContent";
import {adaptPolicyMap} from "../lib/contentAdapters";

// Reusable renderer for every legal/policy route.
//
// The slug comes from the prop for the four routes the app declares by name, and
// from the URL for the catch-all that serves any other policy. A policy created
// in the admin panel therefore gets a working page the moment it is published —
// it is linked from the footer (also API-driven) and served here — without a new
// <Route> having to be added by hand for each one.
const PolicyPage = ({slug: slugProp}) => {
  const params = useParams();
  const slug = slugProp || params.slug;

  // The public endpoint refuses anything not published, so the draft rule this
  // page enforces below is also enforced server-side: an unfinished policy is
  // simply absent from the API's answer and this falls through to the redirect.
  const {map: policies, isLoading} = useContentMap("policies", {
    fallback: staticPolicies,
    toMap: adaptPolicyMap,
  });

  const policy = policies[slug];

  // A policy that exists only in the database is absent from the static map, so
  // redirecting on that absence would bounce every admin-created policy before
  // the list arrived. Wait for an answer before deciding the URL is unknown.
  if (!policy && isLoading) {
    return <main className="spline-page page-shell" aria-busy="true" />;
  }

  // A draft policy is treated exactly like a policy that does not exist, because to
  // a visitor it doesn't: the alternative is serving them "[PLACEHOLDER] State the
  // number of days within which refunds must be requested" as though it were the
  // refund terms they are bound by. The guard is here rather than in the router so
  // it holds however the URL is reached — a link, a bookmark, a search result.
  if (!policy || policy.draft) return <Navigate to="/" replace />;

  // Terms of Use puts its dates in the hero tiles, and the meta line under the first
  // heading printed the same two facts again a few inches lower — "21 Feb 2026 / Last
  // updated" followed immediately by "Last updated: 21 February 2026". Whichever tile
  // already carries a date wins, and the line only prints what the tiles left out.
  const statLabels = (policy.stats || []).map(({label}) => label.toLowerCase());
  const showEffective = policy.effective && !statLabels.includes("effective date");
  const showUpdated = !statLabels.includes("last updated");

  return (
    <main className="spline-page page-shell">
      <PageHero eyebrow={policy.eyebrow} title={policy.title} lead={policy.lead}>
        {/* The three tiles the live site puts under each policy title. Optional: a
            policy with no `stats` simply has none, so the hero does not depend on
            every page having a headline figure to show. */}
        {policy.stats && (
          <div className="legal-stats">
            {policy.stats.map(({value, label}) => (
              <div className="legal-stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </PageHero>

      <section className="page-section">
        <div className="ps-inner">
          <div className="legal-body">
            <div className="legal-article">
              {/* No "this is placeholder content" banner any more: a draft policy no
                  longer renders at all (see the guard above), so every page that
                  reaches here is real copy. Warning a reader that the terms binding
                  them might be fake was never a fix — not showing them fake terms is. */}
              {(showEffective || showUpdated) && (
                <p className="legal-meta">
                  {showEffective && <span>Effective: {policy.effective}</span>}
                  {showUpdated && <span>Last updated: {policy.updated}</span>}
                </p>
              )}

              {/* Rendered as plain, static markup — no scroll-reveal. A legal page
                  must be readable the instant it opens; fading twelve sections in as
                  the reader scrolls only delayed the one thing they came for. */}
              <div>
                {policy.sections.map((section) => (
                  <section className="legal-block" id={section.id} key={section.id}>
                    <h3>{section.heading}</h3>
                    {/* A clause that changes what the rest of the section means — the
                        "we are not affiliated with any other provider" disclaimer —
                        rather than one more paragraph in the run of them. */}
                    {section.callout && <p className="legal-callout">{section.callout}</p>}
                    {section.body.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                    {section.list && (
                      <ul>
                        {section.list.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                    {/* Sub-groups within a section — e.g. the privacy policy's split
                        between the data you hand over (2.1) and the data the site
                        records as you browse (2.2). Each keeps its own heading and
                        list rather than being flattened into one run of bullets. */}
                    {section.groups?.map((group) => (
                      <div className="legal-group" key={group.title}>
                        <h4>{group.title}</h4>
                        <ul>
                          {group.list.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {section.closing && <p className="legal-closing">{section.closing}</p>}
                  </section>
                ))}
              </div>
            </div>

            <aside className="legal-toc">
              <strong>On this page</strong>
              {policy.sections.map((section) => (
                <a href={`#${section.id}`} key={section.id}>{section.heading}</a>
              ))}
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PolicyPage;
