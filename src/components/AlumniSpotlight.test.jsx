// The spotlight's selection logic, separated from the dome's animation work.
//
// DomeGallery is mocked because it is a heavy, gesture-driven 3D widget whose
// behaviour is already its own concern — what would be tested here is that
// AlumniSpotlight feeds it the right per-profile images and reacts to its
// onImageOpen callback. The dome mock records the props it is given so a test
// can assert the wiring without running the sphere.

import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {render, cleanup, within, act} from "@testing-library/react";

let alumniProfiles = [];
const domeLog = {images: null, onImageOpen: null};

vi.mock("./DomeGallery", () => ({
  default: (props) => {
    domeLog.images = props.images;
    domeLog.onImageOpen = props.onImageOpen;
    return <div data-testid="dome-gallery" aria-label={props.ariaLabel} />;
  },
}));

vi.mock("../hooks/useContent", () => ({
  useContentList: () => ({items: alumniProfiles}),
}));

const {default: AlumniSpotlight} = await import("./AlumniSpotlight");

const PROFILES = [
  {
    id: "anant-shiva",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/anant.png",
    name: "Anant Shiva",
    hike: "86% Hike",
    role: "Product Development, HighRadius",
    story: "This program was exactly what I needed.",
  },
  {
    id: "syed-arif",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/syed.png",
    name: "Syed Arif",
    hike: "118% Hike",
    role: "Product Manager at Razorpay",
    story: "Built strategic product thinking.",
  },
];

const renderSpotlight = () => render(<AlumniSpotlight />);

// The name appears twice — in the floating caption and in the profile panel —
// so assertions about the selected story scope to the profile article.
const profilePanel = (container) => within(container.querySelector(".alumni-spotlight__profile"));

beforeEach(() => {
  alumniProfiles = PROFILES;
});

afterEach(cleanup);

describe("AlumniSpotlight selection", () => {
  it("renders the first profile in the panel by default", () => {
    const {container} = renderSpotlight();

    expect(profilePanel(container).getByText("Anant Shiva")).toBeDefined();
    expect(profilePanel(container).getByText("This program was exactly what I needed.")).toBeDefined();
  });

  it("feeds the dome one image per profile, keyed by id and alt text", () => {
    renderSpotlight();

    expect(domeLog.images).toHaveLength(PROFILES.length);
    expect(domeLog.images[0]).toMatchObject({
      id: "anant-shiva",
      alt: "Portrait of Anant Shiva",
    });
  });

  it("switches the panel when the dome opens another profile", () => {
    const {container} = renderSpotlight();

    // The mock captures the callback the component registered.
    act(() => domeLog.onImageOpen({id: "syed-arif"}));

    expect(profilePanel(container).getByText("Syed Arif")).toBeDefined();
    expect(profilePanel(container).getByText("Built strategic product thinking.")).toBeDefined();
  });

  it("ignores an onImageOpen for an id that is not in the current list", () => {
    const {container} = renderSpotlight();

    act(() => domeLog.onImageOpen({id: "does-not-exist"}));

    // Still the first profile.
    expect(profilePanel(container).getByText("Anant Shiva")).toBeDefined();
  });

  it("renders nothing when there are no profiles at all", () => {
    alumniProfiles = [];
    const {container} = renderSpotlight();

    expect(container.innerHTML).toBe("");
  });

  it("labels the section for assistive tech", () => {
    renderSpotlight();

    expect(
      document.querySelector("#alumni-spotlight-title").textContent,
    ).toContain("Where our learners are now.");
  });
});
