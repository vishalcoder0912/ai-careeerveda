

import {Admin} from "../../src/models/Admin.js";
import {Program} from "../../src/models/Program.js";
import {Alumni} from "../../src/models/Alumni.js";
import {ROLES} from "../../src/config/permissions.js";
import {CONTENT_STATUS} from "../../src/models/plugins/contentPlugin.js";
import {hashPassword} from "../../src/services/password.service.js";

export const E2E_ROLES = Object.freeze({
  [ROLES.SUPER_ADMIN]: "e2e-super@careerveda.test",
  [ROLES.ADMIN]: "e2e-admin@careerveda.test",
  [ROLES.EDITOR]: "e2e-editor@careerveda.test",
  [ROLES.VIEWER]: "e2e-viewer@careerveda.test",
});

// A program that is complete enough to publish        it satisfies every rule in
// config/publishRules.js, so a spec can publish it without first filling in
// eleven fields through the UI.
export const SEEDED_PROGRAM = Object.freeze({
  title: "Seeded Integration Program",
  slug: "seeded-integration-program",
  subtitle: "Proves the public site renders live data",
  category: "Integration",
  description: "A program seeded for the end-to-end suite.",
  duration: "6 Months",
  mentorship: ["Expert Trainers"],
  format: "Live Online",
  image: {url: "https://ik.imagekit.io/ojoijfoinsdnfoodsnf/careerveda/programs/data-c3b60741.jpg", alt: "Seeded"},
  overview: ["Seeded overview point"],
  curriculum: ["Seeded curriculum point"],
  outcomes: ["Seeded outcome point"],
});

export const SEEDED_ALUMNI = Object.freeze({
  name: "Seeded Alumni Story",
  slug: "seeded-alumni-story",
  currentRole: "Product Manager",
  currentCompany: "SeededCo",
  percentageHike: "120% Hike",
  story: "A seeded alumni story for the end-to-end suite.",
  featured: true,
  showOnAlumniPage: true,
});

export const seedE2EData = async ({superAdmin}) => {
  const passwordHash = await hashPassword(superAdmin.password);

  await Admin.create(
    Object.entries(E2E_ROLES).map(([role, email]) => ({
      name: `E2E ${role}`,
      email,
      passwordHash,
      role,
      status: "active",
    })),
  );

  const published = {status: CONTENT_STATUS.PUBLISHED, publishedAt: new Date()};

  await Program.create({...SEEDED_PROGRAM, ...published});
  await Alumni.create({...SEEDED_ALUMNI, ...published});
};
