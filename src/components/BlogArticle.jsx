import {useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import staticBlogPosts from "../data/blogPosts";
import {adaptBlogPost} from "../lib/contentAdapters";
import "./blog-article.css";

const DEFAULT_CTA = {label: "Explore CareerVeda programs", url: "/programs"};

// Kept from InteractiveBook: a post written before the cta field existed, or one
// coming straight from the API, must still render a usable button.
const safeCta = (cta) => ({
  label: typeof cta?.label === "string" && cta.label.trim() ? cta.label.trim() : DEFAULT_CTA.label,
  url: typeof cta?.url === "string" && cta.url.trim() ? cta.url.trim() : DEFAULT_CTA.url,
});

// Modern posts are `lead` + `sections`; older ones carry a flat `content` array
// of paragraphs. Both flatten to one list of blocks so the layout below never
// needs to know which vintage it is rendering.
const toBlocks = (post) => {
  if (post.sections?.length) {
    return post.sections.map((section) => ({
      heading: section.heading || "",
      body: section.body || [],
    }));
  }
  if (post.content?.length) return [{heading: "", body: post.content}];
  return [];
};

// "Where the roles and the money are" -> "where-the-roles-and-the-money-are".
// Only Latin alphanumerics survive so the id works in every browser regardless
// of how the heading is encoded; duplicate slugs get a numeric suffix below.
const slugify = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

// Every post ships a cover, so related cards can rely on one existing. A post
// without an image is handled the same way adaptBlogPost handles the grid.
const allPosts = () => staticBlogPosts.map(adaptBlogPost);

const TocLink = ({id, heading, activeId}) => (
  <a
    className={activeId === id ? "is-active" : ""}
    href={`#${id}`}
    aria-current={activeId === id ? "true" : undefined}
  >
    <span className="ba-toc-indicator" aria-hidden="true" />
    {heading}
  </a>
);

const TableOfContents = ({items, activeId}) => (
  <nav className="ba-toc" aria-label="On this page">
    <strong>On this page</strong>
    {items.map(({id, heading}) => (
      <TocLink key={id} id={id} heading={heading} activeId={activeId} />
    ))}
  </nav>
);

// A scrolling article page — one URL, one post, read top to bottom. Headings are
// real <h2>s inside a single <article>, which is what lets search engines and
// screen readers see the structure the old paginated reader hid behind state.
const BlogArticle = ({post}) => {
  const [activeId, setActiveId] = useState("");

  // Give every heading a stable, unique anchor so the "On this page" rail can
  // link down the page and the IntersectionObserver below knows what to watch.
  const {toc, blocks} = useMemo(() => {
    const taken = new Set();
    const list = [];
    const blocksList = toBlocks(post);
    blocksList.forEach((block) => {
      block.id = undefined;
      if (!block.heading) return;
      const base = slugify(block.heading);
      let id = base;
      let n = 1;
      while (taken.has(id)) {
        n += 1;
        id = `${base}-${n}`;
      }
      taken.add(id);
      block.id = id;
      list.push({id, heading: block.heading});
    });
    if (post.highlights?.length > 0) {
      list.push({id: "key-takeaways", heading: "Key takeaways"});
    }
    return {toc: list, blocks: blocksList};
  }, [post]);

  // The rail's active item tracks which section is under the reading band.
  // Delegated to a single observer so scrolling never re-renders per frame — it
  // only fires when a heading crosses the band, which happens a few times.
  useEffect(() => {
    if (toc.length === 0) return undefined;
    if (typeof IntersectionObserver === "undefined") return undefined;
    const targets = toc.map(({id}) => document.getElementById(id)).filter(Boolean);
    if (targets.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      {rootMargin: "-15% 0px -65% 0px", threshold: 0},
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  const cta = safeCta(post.cta);
  const externalCta = /^https?:\/\//i.test(cta.url);

  const related = useMemo(() => {
    const current = post.id;
    const siblings = allPosts().filter((p) => p.id !== current);
    const sameCategory = siblings.filter((p) => p.category === post.category);
    const others = siblings.filter((p) => p.category !== post.category);
    return [...sameCategory, ...others].slice(0, 3);
  }, [post.id, post.category]);

  return (
    <main className="spline-page page-shell blog-article">
      <article className="ba-shell">
        <nav className="ba-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">&rsaquo;</span>
          <Link to="/blog">Blog</Link>
          {post.category && (
            <>
              <span aria-hidden="true">&rsaquo;</span>
              <span className="ba-crumb-current">{post.category}</span>
            </>
          )}
        </nav>

        <div className="ba-layout">
          <div className="ba-col">
            <header className="ba-head">
              {post.tag && <span className="ba-tag">{post.tag}</span>}
              <h1>{post.title}</h1>
              <div className="ba-meta">
                <span className="ba-author">{post.author || "CareerVeda Team"}</span>
                {post.date && (
                  <>
                    <span className="ba-meta-sep" aria-hidden="true">&middot;</span>
                    <span>Last Updated: {post.date}</span>
                  </>
                )}
                {post.readTime && (
                  <>
                    <span className="ba-meta-sep" aria-hidden="true">&middot;</span>
                    <span>{post.readTime}</span>
                  </>
                )}
              </div>
            </header>

            {post.image && (
              <figure className="ba-cover">
                {/* The cover is this page's largest paint and is always above the
                    fold, so it is fetched eagerly and at high priority rather than
                    queued behind the rest of the page. */}
                <img
                  src={post.image}
                  alt=""
                  width={1200}
                  height={675}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  draggable="false"
                />
              </figure>
            )}

            {toc.length > 0 && (
              <details className="ba-toc-mobile" aria-label="On this page">
                <summary>On this page</summary>
                <nav>
                  {toc.map(({id, heading}) => (
                    <TocLink key={id} id={id} heading={heading} activeId={activeId} />
                  ))}
                </nav>
              </details>
            )}

            <div className="ba-prose">
              {post.lead && <p className="ba-lead">{post.lead}</p>}

              {blocks.map((block, i) => (
                <section key={block.heading || i} id={block.id}>
                  {block.heading && <h2>{block.heading}</h2>}
                  {block.body.map((text, j) => (
                    <p key={j}>{text}</p>
                  ))}
                </section>
              ))}

              {post.highlights?.length > 0 && (
                <aside className="ba-highlights" id="key-takeaways">
                  <h2>Key takeaways</h2>
                  <ul>
                    {post.highlights.map((item) => (
                      <li key={item}>
                        <span className="ba-check" aria-hidden="true">&#10003;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </div>
          </div>

          {toc.length > 0 && (
            <aside className="ba-toc-rail">
              <div className="ba-sticky">
                <TableOfContents items={toc} activeId={activeId} />
              </div>
            </aside>
          )}
        </div>

        {related.length > 0 && (
          <section className="ba-related" aria-labelledby="ba-related-title">
            <div className="ba-related-head">
              <p className="ba-eyebrow">Keep learning</p>
              <h2 id="ba-related-title">Related articles</h2>
            </div>
            <div className="ba-related-grid">
              {related.map((item) => (
                <Link
                  key={item.id}
                  className="ba-related-card"
                  to={`/blog/${item.id}`}
                  aria-label={`Read: ${item.title}`}
                >
                  {item.image && (
                    <div className="ba-related-media">
                      <img
                        src={item.image}
                        alt=""
                        width={400}
                        height={225}
                        loading="lazy"
                        decoding="async"
                        draggable="false"
                      />
                    </div>
                  )}
                  <div className="ba-related-body">
                    <div className="ba-related-meta">
                      <span className="ba-related-tag">{item.tag}</span>
                      <span>{item.readTime}</span>
                    </div>
                    <h3>{item.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="ba-cta">
          <h2>Ready to go further?</h2>
          <p>
            This article is a taste of what you&rsquo;ll master inside CareerVeda
            {post.category ? `'s ${post.category}` : "'s"} program &mdash; live mentorship,
            hands-on projects, and dedicated placement support.
          </p>
          {externalCta ? (
            <a className="ba-cta-btn" href={cta.url} target="_blank" rel="noreferrer">
              {cta.label} &rarr;
            </a>
          ) : (
            <Link className="ba-cta-btn" to={cta.url}>
              {cta.label} &rarr;
            </Link>
          )}
        </section>

        <Link className="ba-back" to="/blog">
          &larr; Back to all articles
        </Link>
      </article>
    </main>
  );
};

export default BlogArticle;