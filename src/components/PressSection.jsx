import {useState} from "react";
import {Reveal} from "./motionPrimitives";
import ScrollStack, {ScrollStackItem} from "./ScrollStack";
import {pressArticles, pressLogos, pressOutlets} from "../data/pressArticles";
import {cdnImage} from "../lib/imageCdn";
import "./press-section.css";

// A logo chip is 76x18 at most. Press logos tend to arrive as whatever the outlet
// sends — often a full-resolution PNG — so an ImageKit URL pasted into pressLogos
// is resized on the way out rather than shipping a 200 KB masthead to paint a
// thumbnail. Non-ImageKit URLs (a local /press/*.png) pass through untouched.
const LOGO_WIDTH = 160;

// The story artwork in the card's top-right corner. It renders at ~300px wide at
// most, so 600 covers it on a retina screen.
const CARD_IMAGE_WIDTH = 600;

// One outlet chip, used by both the per-story "Featured in" row and the closing
// media wall — so a logo added to pressLogos appears in both without being wired
// up twice.
//
// The logo is optional and self-healing: an outlet with no logo renders as its
// name alone, and a logo whose URL 404s is dropped on error rather than left as
// a browser's broken-image icon. Either way the name is still there, so the chip
// can never degrade into an empty box.
const OutletChip = ({source}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = pressLogos[source.name];
  const showLogo = Boolean(logo) && !logoFailed;

  return (
    <a
      className={showLogo ? "has-logo" : undefined}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {showLogo ? (
        // Logo only — the masthead is the recognisable thing, and setting the name
        // beside it just repeats what the logo already says. The name moves into
        // `alt`, so it is still what a screen reader announces and still what shows
        // if the image fails to load.
        <img
          className="press-logo"
          src={cdnImage(logo, LOGO_WIDTH)}
          alt={source.name}
          loading="lazy"
          decoding="async"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        source.name
      )}
    </a>
  );
};

// The coverage cards stack and scale as the page scrolls past them, so the
// section reads as one deck being dealt rather than a list of press clippings.
// ScrollStack drives that off window scroll, which means this wants to be a
// full-width section with room above and below it — not a card in a grid.
const PressSection = () => (
  <section id="press" className="press-section">
    <Reveal className="press-section-heading">
      <span className="label">Media Coverage</span>
      <h2>CareerVeda in the News</h2>
      <p>
        Featured across India&apos;s leading publications for placement outcomes and
        upskilling excellence.
      </p>
    </Reveal>

    <ScrollStack
      className="press-stack"
      useWindowScroll
      itemDistance={80}
      itemScale={0.02}
      baseScale={0.88}
      stackPosition="18%"
      scaleEndPosition="8%"
      blurAmount={1}
    >
      {pressArticles.map((article) => (
        <ScrollStackItem key={article.id} itemClassName="press-card">
          {/* Head is a two-column grid: the story on the left, its artwork in the
              top-right. An article with no `image` keeps the whole width, so the
              layout does not depend on every story having one. */}
          <div className={`press-card-head${article.image ? " has-media" : ""}`}>
            <div className="press-card-copy">
              <span className="press-eyebrow">
                <span className="press-tag">{article.tag}</span>
                {article.date}
              </span>
              <h3>{article.title}</h3>
              <p className="press-excerpt">{article.excerpt}</p>
            </div>

            {article.image && (
              <div className="press-card-media">
                <img
                  src={cdnImage(article.image, CARD_IMAGE_WIDTH)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                  // A dead URL would leave an empty framed box in the corner of the
                  // card, so remove the frame and let the story run full width.
                  onError={(event) => {
                    event.currentTarget.parentElement?.remove();
                  }}
                />
              </div>
            )}
          </div>

          {article.stats && (
            <div className="press-stat-row">
              {article.stats.map(([value, label]) => (
                <div className="press-stat" key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}

          {article.highlights && (
            <div className="press-highlights">
              {article.highlights.map((point) => (
                <span key={point}>{point}</span>
              ))}
            </div>
          )}

          <div className="press-sources">
            <small>Featured in</small>
            {article.sources.map((source) => (
              <OutletChip key={source.name} source={source} />
            ))}
          </div>
        </ScrollStackItem>
      ))}

      {/* Last card in the deck: the long tail of outlets, as a wall of names
          rather than one card each. */}
      <ScrollStackItem itemClassName="press-card press-card--wall">
        <span className="press-eyebrow">
          <span className="press-tag">Coverage</span>
          Across India
        </span>
        <h3>Featured across India&apos;s media</h3>
        <p className="press-excerpt">
          CareerVeda&apos;s placement milestones and upskilling programs have been
          covered by publications nationwide.
        </p>
        <div className="press-wall-grid">
          {pressOutlets.map((source) => (
            <OutletChip key={source.name} source={source} />
          ))}
        </div>
      </ScrollStackItem>
    </ScrollStack>
  </section>
);

export default PressSection;
