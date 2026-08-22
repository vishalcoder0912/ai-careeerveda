import {Link} from "react-router-dom";
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

// A scrolling article page — one URL, one post, read top to bottom. Headings are
// real <h2>s inside a single <article>, which is what lets search engines and
// screen readers see the structure the old paginated reader hid behind state.
const BlogArticle = ({post}) => {
  const blocks = toBlocks(post);
  const cta = safeCta(post.cta);
  const externalCta = /^https?:\/\//i.test(cta.url);

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

        <header className="ba-head">
          {post.tag && <span className="ba-tag">{post.tag}</span>}
          <h1>{post.title}</h1>
          <div className="ba-meta">
            <span className="ba-author">{post.author || "CareerVeda Team"}</span>
            {post.date && <span>Last Updated: {post.date}</span>}
            {post.readTime && <span>{post.readTime}</span>}
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

        <div className="ba-prose">
          {post.lead && <p className="ba-lead">{post.lead}</p>}

          {blocks.map((block, i) => (
            <section key={block.heading || i}>
              {block.heading && <h2>{block.heading}</h2>}
              {block.body.map((text, j) => (
                <p key={j}>{text}</p>
              ))}
            </section>
          ))}

          {post.highlights?.length > 0 && (
            <aside className="ba-highlights">
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
