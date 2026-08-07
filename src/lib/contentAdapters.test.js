// The adapters are the inverse of backend/scripts/migrate-content.js, and a
// mismatch here is silent: the component renders, the field is just empty. These
// tests pin the field names on both sides.
//
// Each fixture below is the shape the API actually returns — taken from the
// Mongoose models, including the `id` virtual that Mongoose adds and that would
// otherwise shadow the slug the routes are built from.

import {describe, it, expect} from "vitest";

import {
  adaptProgram,
  adaptFaculty,
  adaptAlumni,
  adaptAlumniReview,
  adaptBlogPost,
  adaptJob,
  adaptPolicy,
  adaptPolicyMap,
  adaptFaq,
} from "./contentAdapters";

describe("adaptProgram", () => {
  const record = {
    _id: "6a60a554d5bd876677e432de",
    id: "6a60a554d5bd876677e432de", // Mongoose's virtual — must not survive
    slug: "product-management",
    title: "PG Program in Product Management",
    image: {url: "https://ik.imagekit.io/x/pm.jpg", alt: "PM", width: 1200, height: 900},
    overview: ["a"],
    curriculum: ["b"],
    outcomes: ["c"],
  };

  it("routes off the slug, not the ObjectId virtual", () => {
    // /programs/6a60a554… would be the bug; /programs/product-management is the URL.
    expect(adaptProgram(record).id).toBe("product-management");
  });

  it("flattens the media reference to the URL string components render", () => {
    expect(adaptProgram(record).image).toBe("https://ik.imagekit.io/x/pm.jpg");
  });

  it("leaves an unset image as an empty string rather than an object", () => {
    // ProgramExplorer branches on truthiness to decide between artwork and the
    // decorative orb; an empty object would always be truthy and render a broken
    // frame.
    expect(adaptProgram({...record, image: {url: ""}}).image).toBe("");
    expect(adaptProgram({...record, image: undefined}).image).toBe("");
  });

  it("builds the fee panel from the price the admin panel actually edits", () => {
    expect(adaptProgram({...record, startingPrice: "₹1,45,000"}).fee).toEqual({
      label: "Program Investment",
      amount: "₹1,45,000",
      note: "",
    });
  });

  it("lets an edited startingPrice override the seeded fee object", () => {
    const seeded = {label: "Fee", amount: "₹1,45,000", note: "Including GST"};
    const program = adaptProgram({...record, startingPrice: "₹99,000", fee: seeded});
    expect(program.fee).toEqual({label: "Fee", amount: "₹99,000", note: "Including GST"});
  });

  it("stays null when nothing is priced, so the panel drops instead of going blank", () => {
    expect(adaptProgram(record).fee).toBeNull();
  });

  it("keeps the three tab arrays the explorer indexes by tab name", () => {
    const program = adaptProgram(record);
    for (const tab of ["overview", "curriculum", "outcomes"]) {
      expect(Array.isArray(program[tab])).toBe(true);
    }
  });
});

describe("adaptJob", () => {
  const record = {
    slug: "frontend-developer-techwave",
    title: "Frontend Developer",
    experienceLevel: "0–2 years",
    employmentType: "Full-time",
    salaryRange: "₹4–7 LPA",
    applicationUrl: "https://example.com/apply",
    postedDate: "2026-07-13T00:00:00.000Z",
  };

  it("renames the API's fields to the ones the job card reads", () => {
    // The card reads job.experience / job.jobType / job.salary / job.applyUrl.
    expect(adaptJob(record)).toMatchObject({
      experience: "0–2 years",
      jobType: "Full-time",
      salary: "₹4–7 LPA",
      applyUrl: "https://example.com/apply",
    });
  });

  it("prints the posted date as a date, not an ISO timestamp", () => {
    // The card prints this verbatim: "Posted 2026-07-13", not
    // "Posted 2026-07-13T00:00:00.000Z".
    expect(adaptJob(record).postedDate).toBe("2026-07-13");
  });

  it("survives a listing with no posted date", () => {
    expect(adaptJob({...record, postedDate: null}).postedDate).toBe("");
  });
});

describe("adaptAlumni", () => {
  const record = {
    slug: "syed-arif",
    name: "Syed Arif",
    currentRole: "Product Manager",
    currentCompany: "Razorpay",
    percentageHike: "118% Hike",
    story: "Built strategic product thinking.",
    image: {url: "https://ik.imagekit.io/x/syed.jpg"},
  };

  it("recombines role and company the way the spotlight prints them", () => {
    // The migration split "Product Manager, Razorpay" on the last comma.
    expect(adaptAlumni(record).role).toBe("Product Manager, Razorpay");
  });

  it("omits the separator when there is no company", () => {
    expect(adaptAlumni({...record, currentCompany: ""}).role).toBe("Product Manager");
  });

  it("generates a monogram placeholder instead of a broken image", () => {
    const profile = adaptAlumni({...record, image: {url: ""}});

    expect(profile.initials).toBe("SA");
    expect(profile.image).toMatch(/^data:image\/svg\+xml/);
  });

  it("falls back to the quote when there is no long-form story", () => {
    const profile = adaptAlumni({...record, story: "", quote: "Short quote."});
    expect(profile.story).toBe("Short quote.");
  });

  it("produces the positional tuple the review grids destructure", () => {
    const [name, role, quote, program, photo] = adaptAlumniReview(record);

    expect(name).toBe("Syed Arif");
    expect(role).toBe("Product Manager, Razorpay");
    expect(quote).toBe("Built strategic product thinking.");
    expect(program).toBe("");
    expect(photo).toContain("syed.jpg");
  });
});

describe("adaptFaculty, adaptBlogPost", () => {
  it("flattens the mentor photo and routes off the slug", () => {
    const mentor = adaptFaculty({
      slug: "aditya-sharma",
      id: "objectid",
      name: "Aditya Sharma",
      photo: {url: "https://ik.imagekit.io/x/aditya.jpg"},
    });

    expect(mentor.id).toBe("aditya-sharma");
    expect(mentor.photo).toBe("https://ik.imagekit.io/x/aditya.jpg");
  });

  it("leaves a photoless mentor falsy so the card draws its monogram", () => {
    expect(adaptFaculty({slug: "x", name: "X", photo: {}}).photo).toBe("");
  });

  it("flattens the blog cover image and routes off the slug", () => {
    const post = adaptBlogPost({
      slug: "product-management-genai",
      id: "objectid",
      title: "Why PM + GenAI",
      image: {url: "https://ik.imagekit.io/x/cover.jpg"},
    });

    expect(post.id).toBe("product-management-genai");
    expect(post.image).toBe("https://ik.imagekit.io/x/cover.jpg");
  });

  it("keeps the reader fields sent by the admin API", () => {
    const post = adaptBlogPost({
      slug: "admin-made",
      title: "Created in the panel",
      highlights: ["One practical takeaway"],
      cta: {label: "Apply now", url: "/enroll"},
    });

    expect(post.id).toBe("admin-made");
    expect(post.highlights).toEqual(["One practical takeaway"]);
    expect(post.cta).toEqual({label: "Apply now", url: "/enroll"});
  });

  it("makes legacy/static posts routeable and readable when CTA fields are absent", () => {
    const post = adaptBlogPost({id: "legacy-post", title: "Older article"});

    expect(post.id).toBe("legacy-post");
    expect(post.highlights).toEqual([]);
    expect(post.cta).toEqual({label: "Explore CareerVeda programs", url: "/programs"});
  });

  // A post published from the panel with no cover picked arrives as an empty
  // media reference, not as a missing key — every field of it is present and
  // blank, so a truthiness check on `image` alone would pass.
  it("draws a cover for a post published without one", () => {
    const post = adaptBlogPost({
      slug: "hello",
      title: "data science",
      category: "Data Science",
      image: {media: null, url: "", fileId: "", thumbnailUrl: "", alt: ""},
    });

    expect(post.image).toMatch(/^data:image\/svg\+xml/);
    // The card is only rendered at all because `image` is truthy — that is the
    // condition in BlogPage that this fallback exists to satisfy.
    expect(post.image).toBeTruthy();
    expect(decodeURIComponent(post.image)).toContain("Data Science");
  });

  it("keeps a post's cover stable across calls but distinct between posts", () => {
    const one = adaptBlogPost({slug: "hello", title: "a", category: "X"});
    const again = adaptBlogPost({slug: "hello", title: "a", category: "X"});
    const other = adaptBlogPost({slug: "different-slug", title: "b", category: "X"});

    expect(one.image).toBe(again.image);
    expect(one.image).not.toBe(other.image);
  });

  // "M&A Deals Explained" is a real title in this collection, and an unescaped
  // ampersand inside the SVG's aria-label makes the document malformed — the
  // browser then renders nothing at all for the data URI.
  it("escapes XML syntax in the category it prints on the cover", () => {
    const post = adaptBlogPost({slug: "ma-deals", title: "M&A", category: "M&A <Deals>"});
    const svg = decodeURIComponent(post.image);

    expect(svg).toContain("M&amp;A &lt;Deals&gt;");
    expect(svg).not.toContain("M&A <Deals>");
  });
});

describe("adaptPolicy", () => {
  const record = {
    slug: "privacy-policy",
    title: "Privacy Policy",
    lead: "How we protect your data.",
    updated: "20 February 2026",
    stats: [{value: "Secure", label: "Data protection"}],
    sections: [{heading: "1. Introduction", body: ["..."]}],
  };

  it("keeps the shape PolicyPage renders", () => {
    expect(adaptPolicy(record)).toEqual({
      slug: "privacy-policy",
      eyebrow: "Legal",
      title: "Privacy Policy",
      lead: "How we protect your data.",
      updated: "20 February 2026",
      stats: record.stats,
      sections: record.sections,
    });
  });

  it("keys the map by slug, which is what the route looks up", () => {
    const map = adaptPolicyMap([record, {...record, slug: "terms", title: "Terms of Use"}]);

    expect(Object.keys(map)).toEqual(["privacy-policy", "terms"]);
    expect(map.terms.title).toBe("Terms of Use");
  });

  it("never marks an API policy as draft — the endpoint already excluded those", () => {
    // PolicyPage redirects on policy.draft. A stray truthy draft flag arriving
    // from the API would blank a published policy.
    expect(adaptPolicy(record).draft).toBeUndefined();
  });
});

describe("adaptFaq", () => {
  it("produces the [question, answer] tuple the home page destructures", () => {
    expect(adaptFaq({question: "Who is this for?", answer: "Anyone."})).toEqual([
      "Who is this for?",
      "Anyone.",
    ]);
  });
});
