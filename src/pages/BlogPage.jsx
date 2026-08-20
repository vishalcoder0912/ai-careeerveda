import {useState} from "react";
import {Link} from "react-router-dom";
import {PageHero, SectionHeading} from "../components/PageShell";
import {Reveal, StaggerGroup, StaggerItem} from "../components/motionPrimitives";
import staticBlogPosts from "../data/blogPosts";
import {adaptBlogPost} from "../lib/contentAdapters";
import "../components/blog-page.css";

// The blog renders from src/data/blogPosts.js and makes no network request.
//
// It used to read the API with this file as the fallback, which cost the index
// a ~140 KB JSON response: the public list projection strips only bookkeeping
// fields, so every article's full body was downloaded just to draw cards that
// show a title, an excerpt and a date. The file is already in the bundle and
// already complete, so the fastest correct thing is to render it.
//
// The database still holds this content — `npm --prefix backend run
// migrate:content` pushes this file into it — but the public site does not wait
// on it. A post that exists only in the admin panel therefore does not appear
// here; authoring happens in the file.
//
// The order posts appear in is the order they sit in the file, so reordering
// the file reorders the page. adaptBlogPost fills in a generated cover for a
// post with no image and the default CTA for one with no cta block.
const blogPosts = staticBlogPosts.map(adaptBlogPost);

// Built once at module scope — the list is a constant, so recomputing it per
// render (or memoising it) would both be work for an answer that cannot change.
// An empty `category` is dropped rather than rendered as a blank chip; those
// posts stay reachable under "All".
const categories = ["All", ...new Set(blogPosts.flatMap((p) => (p.category ? [p.category] : [])))];

const BlogPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");

  const active = categories.includes(activeCategory) ? activeCategory : "All";
  const filtered = active === "All" ? blogPosts : blogPosts.filter((p) => p.category === active);

  return (
    <main className="spline-page page-shell">
      <PageHero
        eyebrow="Our Blog"
        title={<>Insights from <span className="accent">CareerVeda</span></>}
        lead="Practical guides, industry insights, and career advice for professionals in analytics, data science, product management, and technology"
      />

      <section className="page-section">
        <div className="ps-inner">
          <SectionHeading label="Latest articles" title="Explore our latest posts">
            Learn from real-world case studies, program insights, and career strategies shared by our mentors and alumni
          </SectionHeading>

          <div className="blog-filter-bar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`blog-filter-chip ${active === cat ? "is-active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* key={active} remounts the group when the filter changes. Without it,
              cards re-added by a filter (e.g. back to "All") mount after the
              group's whileInView reveal has already fired and stay frozen at
              opacity 0 — the grid looks empty. A fresh mount replays the stagger
              for exactly the cards on screen. */}
          <StaggerGroup key={active} className="blog-grid" amount="some" stagger={0.06}>
            {filtered.map((post, i) => (
              <StaggerItem as="article" interactive className="blog-card is-readable" key={post.id || post.slug}>
                <Link
                  className="blog-card-open"
                  to={`/blog/${post.id || post.slug}`}
                  aria-label={`Read: ${post.title}`}
                >
                  {post.image && (
                    <div className="blog-card-media">
                      <img
                        src={post.image}
                        alt=""
                        width={400}
                        height={200}
                        // The top rows are on screen before anyone scrolls, so
                        // deferring them just means watching them pop in. The
                        // rest stay lazy — eagerly fetching all 38 covers would
                        // contend for bandwidth and make these slower, not faster.
                        loading={i < 6 ? "eager" : "lazy"}
                        fetchPriority={i < 3 ? "high" : "auto"}
                        decoding="async"
                        draggable="false"
                      />
                    </div>
                  )}
                  <div className="blog-card-body">
                    <div className="blog-card-meta">
                      <span className="blog-card-tag">{post.tag}</span>
                      <span className="blog-card-date">{post.date} &middot; {post.readTime}</span>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <div className="blog-card-footer">
                      <span className="blog-card-author">{post.author}</span>
                      <span className="blog-card-link">Read article &rarr;</span>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="page-section">
        <div className="ps-inner">
          <Reveal className="page-cta">
            <h2>Ready to build a career that matters?</h2>
            <p>Talk to a career expert, explore the right program, and start with a free consultation.</p>
            <div className="page-hero__actions">
              <Link className="page-btn page-btn--primary" to="/enroll">Enroll Now</Link>
              <Link className="page-btn page-btn--ghost" to="/contact">Contact Us</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
};

export default BlogPage;
