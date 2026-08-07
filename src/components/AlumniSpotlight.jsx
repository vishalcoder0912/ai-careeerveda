import { useEffect, useMemo, useState } from "react";
import DomeGallery from "./DomeGallery";
import { alumniSpotlights } from "../data/alumniSpotlight";
import { useContentList } from "../hooks/useContent";
import { adaptAlumni } from "../lib/contentAdapters";
import { cdnImage } from "../lib/imageCdn";
import "./alumni-spotlight.css";

// A dome tile is at most ~200px across, and the portrait panel beside it tops out
// around 320px. The source photos are full-size — one is 163 KB — and the dome
// renders every one of them at once, so untransformed they were the heaviest
// thing on the page by a wide margin.
const DOME_TILE_WIDTH = 400;
const PROFILE_PHOTO_WIDTH = 640;

const COMPACT_QUERY = "(max-width: 640px)";

// The dome's radius is a pixel value, so the desktop minRadius would overflow a
// phone-width container and crop the outer portraits. Track the breakpoint and
// hand the gallery a radius its container can actually hold.
const useIsCompact = () => {
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY);
    const onChange = (event) => setIsCompact(event.matches);
    setIsCompact(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isCompact;
};

export default function AlumniSpotlight() {
  const {items: profiles} = useContentList("alumni", {
    fallback: alumniSpotlights,
    adapt: adaptAlumni,
  });

  const [activeId, setActiveId] = useState(alumniSpotlights[0]?.id || "");
  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeId) || profiles[0],
    [profiles, activeId],
  );
  const isCompact = useIsCompact();
  // The dome is built from the same list rather than a second export, so a story
  // added in the admin panel appears in the gallery and the panel together.
  const domeImages = useMemo(
    () =>
      profiles.map(({id, image, name}) => ({
        id,
        src: cdnImage(image, DOME_TILE_WIDTH),
        alt: `Portrait of ${name}`,
      })),
    [profiles],
  );

  if (!activeProfile) return null;

  return (
    <section className="alumni-spotlight" aria-labelledby="alumni-spotlight-title">
      <div className="alumni-spotlight__intro">
        <span className="alumni-spotlight__label">Alumni spotlight</span>
        <h2 id="alumni-spotlight-title">Where our learners are now.</h2>
        <p>Real transitions from CareerVeda learners into stronger, higher-impact roles.</p>
      </div>

      <div className="alumni-spotlight__experience">
        <div className="alumni-spotlight__gallery-wrap">
          <DomeGallery
            images={domeImages}
            ariaLabel="Interactive alumni portrait gallery. Drag to explore and select a portrait to open it."
            fit={0.5}
            minRadius={isCompact ? 340 : 500}
            /* Tile size is the dome's circumference divided by the segment count,
               so on a phone 26 segments produced ~30px tiles — below a finger.
               Fewer segments means fewer, bigger, tappable portraits. */
            segments={isCompact ? 16 : 26}
            dragDampening={2.4}
            padFactor={0.14}
            openedImageWidth={isCompact ? "min(72vw, 280px)" : "clamp(240px, 26vw, 320px)"}
            openedImageHeight={isCompact ? "min(94vw, 360px)" : "clamp(320px, 34vw, 410px)"}
            imageBorderRadius="18px"
            openedImageBorderRadius="24px"
            grayscale={false}
            onImageOpen={({ id }) => {
              if (profiles.some((profile) => profile.id === id)) setActiveId(id);
            }}
          />
          {/* On a phone the profile panel sits a full dome-height below the fold,
              so tapping a face would update information the reader can't see.
              This caption keeps the selection legible inside the frame. */}
          <p className="alumni-spotlight__caption" aria-hidden="true">
            <strong>{activeProfile.name}</strong>
            <span>
              {activeProfile.hike} &middot; {activeProfile.role}
            </span>
          </p>
          <p className="alumni-spotlight__hint">Drag or swipe to explore. Select a portrait to view it.</p>
        </div>

        <article className="alumni-spotlight__profile" aria-live="polite">
          <div className="alumni-spotlight__photo-wrap">
            <img
              src={cdnImage(activeProfile.image, PROFILE_PHOTO_WIDTH)}
              alt={`Portrait of ${activeProfile.name}`}
              decoding="async"
            />
          </div>

          <div className="alumni-spotlight__profile-copy">
            <p className="alumni-spotlight__profile-label">Career transition</p>
            <h3>{activeProfile.name}</h3>
            <p className="alumni-spotlight__role">
              {activeProfile.hike} <span aria-hidden="true">&middot;</span> {activeProfile.role}
            </p>
            <p className="alumni-spotlight__story">{activeProfile.story}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
