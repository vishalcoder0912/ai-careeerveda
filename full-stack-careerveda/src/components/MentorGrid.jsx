import {useState, useEffect, useRef, useCallback} from "react";
import {createPortal} from "react-dom";
import {Link} from "react-router-dom";
import {Reveal, StaggerGroup, StaggerItem} from "./motionPrimitives";
import {publishedMentors, initialsOf} from "../data/mentors";
import {useContentList} from "../hooks/useContent";
import {adaptFaculty} from "../lib/contentAdapters";
import {cdnImage} from "../lib/imageCdn";
import "./mentor-grid.css";

// The portrait renders at 132px wide (176px on the widest cards), so w-360 covers
// it on a 2x screen without shipping a full-size headshot.
const PORTRAIT_WIDTH = 360;

// A mentor is only clickable when there is more to show than the card already
// carries. A mentor with just a name, role and discipline stays a plain,
// non-interactive card — opening a modal that only repeats the card would be a
// dead end, so we don't offer it.
const hasProfile = (m) =>
  Boolean(
    m.bio ||
      m.education ||
      m.experience ||
      m.specialization ||
      m.achievements?.length ||
      m.expertise?.length ||
      m.facts?.length ||
      m.programs?.length,
  );

// "Product Strategy, User Research" -> ["Product Strategy", "User Research"].
const toChips = (value) =>
  (value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

// The headshot, or the initials monogram until one exists. Shared by the card and
// the modal so a mentor looks the same in both places.
const Portrait = ({mentor}) => {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(mentor.photo) && !photoFailed;

  return showPhoto ? (
    <img
      src={cdnImage(mentor.photo, PORTRAIT_WIDTH)}
      alt={mentor.name}
      width={PORTRAIT_WIDTH}
      height={PORTRAIT_WIDTH}
      loading="lazy"
      decoding="async"
      draggable="false"
      // A dead URL would leave an empty frame beside the name, so fall back to the
      // monogram rather than a broken-image icon.
      onError={() => setPhotoFailed(true)}
    />
  ) : (
    <span className="mentor-card__monogram" aria-hidden="true">
      {initialsOf(mentor.name)}
    </span>
  );
};

// One mentor. The photo is optional on purpose — faculty lists are assembled a
// name at a time, and a card that waits for a headshot is a card that never ships.
// Without one, the monogram takes the portrait frame at full size, so the row keeps
// its shape and the grid stays level.
const MentorCard = ({mentor, onOpen}) => {
  const clickable = hasProfile(mentor);

  return (
    <StaggerItem
      as="article"
      interactive
      className={`mentor-card${clickable ? " mentor-card--clickable" : ""}`}
    >
      <div className="mentor-card__portrait">
        <Portrait mentor={mentor} />
      </div>

      <div className="mentor-card__body">
        <span className="mentor-card__discipline">{mentor.discipline}</span>
        <h3>{mentor.name}</h3>
        <p className="mentor-card__role">{mentor.role}</p>

        {/* The card stays a scannable one-liner — field, name, role. Everything
            else (bio, credentials, teaching load) lives in the profile modal so
            every card keeps the same height and the page reads as one clean list. */}
        {clickable && (
          <span className="mentor-card__more" aria-hidden="true">
            View profile &#x2192;
          </span>
        )}
      </div>

      {/* A single button covering the whole card is the accessible way to make the
          card clickable: one Tab stop, a real Enter/Space activation, and a hit
          target the size of the card. It sits above the portrait and text but the
          program links above lift over it (see .mentor-card__programs in CSS). */}
      {clickable && (
        <button
          type="button"
          className="mentor-card__hit"
          onClick={() => onOpen(mentor)}
          aria-label={`View ${mentor.name}'s full profile`}
        />
      )}
    </StaggerItem>
  );
};

// The full record, shown over the page when a card is opened. Everything here is
// optional: a section renders only when its field is present, so the same modal
// serves a fully-written mentor and one with a bio and nothing else.
const MentorModal = ({mentor, onClose}) => {
  const dialogRef = useRef(null);

  const specializations = toChips(mentor.specialization);

  // A native <dialog> opened with showModal() owns the focus trap, Escape-to-close,
  // top-layer backdrop, and returns focus to the opener on close — all of which
  // this used to hand-wire. We keep only the body scroll lock, which the dialog
  // does not provide on its own.
  useEffect(() => {
    const node = dialogRef.current;
    node?.showModal();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      node?.close();
    };
  }, []);

  // Escape fires the native 'cancel' event; route it through onClose so the
  // parent's open state stays in sync.
  const onCancel = (e) => {
    e.preventDefault();
    onClose();
  };

  // A click that lands on the <dialog> itself (its padded gutter) rather than the
  // card inside it is a backdrop click.
  const onBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  const enrollTo = mentor.courseSlug ? `/programs/${mentor.courseSlug}` : "/programs";
  const titleId = `mentor-modal-${mentor.id}`;

  return createPortal(
    <dialog
      className="mentor-modal"
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onCancel}
      onClick={onBackdropClick}
    >
      <div className="mentor-modal__dialog">
        <button
          type="button"
          className="mentor-modal__close"
          onClick={onClose}
          aria-label="Close profile"
        >
          &#x2715;
        </button>

        <header className="mentor-modal__head">
          <div className="mentor-modal__portrait">
            <Portrait mentor={mentor} />
          </div>
          <div className="mentor-modal__id">
            <span className="mentor-card__discipline">{mentor.discipline}</span>
            <h2 id={titleId}>{mentor.name}</h2>
            <p className="mentor-modal__role">{mentor.role}</p>
          </div>
        </header>

        <div className="mentor-modal__scroll">
          {mentor.bio && (
            <section className="mentor-modal__section">
              <h3>About</h3>
              <p>{mentor.bio}</p>
            </section>
          )}

          {(mentor.education || mentor.experience) && (
            <div className="mentor-modal__pair">
              {mentor.education && (
                <section className="mentor-modal__section">
                  <h3>Education</h3>
                  <p>{mentor.education}</p>
                </section>
              )}
              {mentor.experience && (
                <section className="mentor-modal__section">
                  <h3>Industry Experience</h3>
                  <p>{mentor.experience}</p>
                </section>
              )}
            </div>
          )}

          {specializations.length > 0 && (
            <section className="mentor-modal__section">
              <h3>Area of Specialization</h3>
              <div className="mentor-modal__chips">
                {specializations.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </section>
          )}

          {mentor.achievements?.length > 0 && (
            <section className="mentor-modal__section">
              <h3>Key Achievements</h3>
              <ul className="mentor-modal__list">
                {mentor.achievements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {mentor.expertise?.length > 0 && (
            <section className="mentor-modal__section">
              <h3>Technical Expertise</h3>
              <div className="mentor-modal__chips">
                {mentor.expertise.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </section>
          )}

          {mentor.facts?.length > 0 && (
            <section className="mentor-modal__section">
              <h3>Highlights</h3>
              <ul className="mentor-modal__list">
                {mentor.facts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {mentor.programs?.length > 0 && (
            <section className="mentor-modal__section">
              <h3>Mentors On</h3>
              <div className="mentor-modal__programs">
                {mentor.programs.map((program) =>
                  program.slug ? (
                    <Link
                      key={program.label}
                      to={`/programs/${program.slug}`}
                      onClick={onClose}
                    >
                      {program.label}
                    </Link>
                  ) : (
                    <span key={program.label}>{program.label}</span>
                  ),
                )}
              </div>
            </section>
          )}
        </div>

        <footer className="mentor-modal__foot">
          <p className="mentor-modal__cta-line">
            Learn from {mentor.name.split(" ")[0]}
          </p>
          <Link className="mentor-modal__cta" to={enrollTo} onClick={onClose}>
            Enroll in Their Course &#x2192;
          </Link>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
};

const MentorGrid = () => {
  const [active, setActive] = useState(null);

  // The API only ever returns published faculty, so the `draft` filter the
  // static list applies is already done server-side — a mentor is hidden by
  // unpublishing them in the admin panel.
  const {items: mentors} = useContentList("faculty", {
    fallback: publishedMentors,
    adapt: adaptFaculty,
  });

  const openMentor = useCallback((mentor) => setActive(mentor), []);
  const closeMentor = useCallback(() => setActive(null), []);

  // The whole section — its heading included — is withheld until there is a real
  // mentor to put in it. An empty grid under "The people who will teach you" is
  // worse than no section, and the placeholder mentors it used to render were worse
  // than both: they told visitors the faculty were called "Add mentor name".
  if (mentors.length === 0) return null;

  return (
    <section className="section-block mentor-section" aria-labelledby="mentors-title">
      <Reveal className="section-heading">
        <p className="section-label">The people who will teach you</p>
        <h2 id="mentors-title">
          Practitioners first, instructors second
        </h2>
        <p>
          Every mentor still works in the field they teach, so what reaches the
          classroom is the job as it is done this year — not as it was written up
        </p>
      </Reveal>

      <StaggerGroup className="mentor-grid" stagger={0.08}>
        {mentors.map((mentor) => (
          <MentorCard key={mentor.id} mentor={mentor} onOpen={openMentor} />
        ))}
      </StaggerGroup>

      {active && <MentorModal mentor={active} onClose={closeMentor} />}
    </section>
  );
};

export default MentorGrid;
