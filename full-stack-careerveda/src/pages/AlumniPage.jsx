import {lazy} from "react";
import {Link} from "react-router-dom";
import {PageHero, SectionHeading} from "../components/PageShell";
import {Reveal, StaggerGroup, StaggerItem} from "../components/motionPrimitives";
import DeferUntilVisible from "../components/DeferUntilVisible";
import {ratings, stats} from "../data/siteData";
import {useContentList} from "../hooks/useContent";
import {adaptAlumniReview} from "../lib/contentAdapters";
import {cdnImage} from "../lib/imageCdn";
import BrandLogo from "../components/BrandLogo";

// The dome gallery renders every alumni portrait at once and drags them around in
// 3D; the partner trail runs its own GSAP loop. Both sit well below the hero.
const AlumniSpotlight = lazy(() => import("../components/AlumniSpotlight"));
const TrustedCompanies = lazy(() => import("../components/TrustedCompanies"));

// Review avatars render at 46px; the source portraits are full-size photos.
const REVIEW_AVATAR_WIDTH = 96;

const AlumniPage = () => {
  // The review grid is an editorial selection, not the roster: the stories an
  // admin ticked "Show on the alumni page". Independent of the home page's own
  // selection, so the two surfaces need not repeat each other.
  //
  // The dome gallery further down is deliberately not filtered this way — it
  // renders every published story, and is the page's complete record of the
  // network. Leaving someone out of this grid does not remove them from it.
  //
  // No static fallback — see the note on the home page. This grid renders what
  // the admin published or nothing at all.
  const {items: reviews} = useContentList("alumni", {
    adapt: adaptAlumniReview,
    params: {showOnAlumniPage: true},
  });

  return (
    <main className="spline-page page-shell">
      <PageHero
        eyebrow="Alumni Network"
        title={<>A community that keeps <span className="accent">growing together</span></>}
        lead="CareerVeda alumni work across product, analytics, data science, AI, and finance roles at leading companies — and stay connected through mentorship, referrals, and lifelong career support"
      >
        <Link className="page-btn page-btn--primary" to="/enroll">Join the network</Link>
        <Link className="page-btn page-btn--ghost" to="/jobs">See job openings</Link>
      </PageHero>

      <section className="page-section">
        <div className="ps-inner">
          <StaggerGroup className="page-stat-row">
            {stats.slice(0, 4).map(([value, label]) => (
              <StaggerItem className="page-stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="page-section">
        <div className="ps-inner">
          <SectionHeading label="Learner Reviews & Ratings" title="Hear from successful learners who transformed their careers with CareerVeda" />
          <StaggerGroup className="page-stat-row" stagger={0.08}>
            {ratings.map(([score, source]) => (
              <StaggerItem className="page-stat" key={source}>
                <BrandLogo source={source} />
                <strong>{score}</strong>
                <span>Star rating on {source}</span>
              </StaggerItem>
            ))}
          </StaggerGroup>
          {/* With nothing ticked for this page the ratings above still stand on
              their own; an empty grid under them would read as a failed load.
              The dome gallery below is unaffected either way. */}
          {reviews.length > 0 ? (
          <StaggerGroup className="page-grid" stagger={0.08} style={{marginTop: 24}}>
            {reviews.map(([name, role, quote, _program, photo]) => (
              <StaggerItem as="article" interactive className="page-card review-card" key={name}>
                {photo ? (
                  <img
                    className="review-card__avatar"
                    src={cdnImage(photo, REVIEW_AVATAR_WIDTH)}
                    alt=""
                    width={REVIEW_AVATAR_WIDTH}
                    height={REVIEW_AVATAR_WIDTH}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="card-icon" aria-hidden="true">{name[0]}</span>
                )}
                <h3>{name}</h3>
                <p className="review-card__role">{role}</p>
                <p>{quote}</p>
                {/* //<span className="review-card__program">{program}</span> */}
              </StaggerItem>
            ))}
          </StaggerGroup>
          ) : null}
        </div>
      </section>

      <section className="page-section">
        <div className="ps-inner">
          <DeferUntilVisible minHeight={620}>
            <AlumniSpotlight />
          </DeferUntilVisible>
        </div>
      </section>

      <section className="page-section">
        <div className="ps-inner">
          <SectionHeading label="Where they work" title="Trusted by teams that hire our talent" />
          {/* Two-row logo marquee. The section already supplies the heading, so
              the component renders headingless and embedded (no band padding or
              background of its own). */}
          <DeferUntilVisible minHeight={320}>
            <TrustedCompanies showHeading={false} embedded />
          </DeferUntilVisible>
        </div>
      </section>

      <section className="page-section">
        <div className="ps-inner">
          <Reveal className="page-cta">
            <h2>Become part of the CareerVeda alumni story</h2>
            <p>Start a program today and join a network built on mentorship, referrals, and lifelong support</p>
            <div className="page-hero__actions">
              <Link className="page-btn page-btn--primary" to="/enroll">Enroll Now</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
};

export default AlumniPage;
