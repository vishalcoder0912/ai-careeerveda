// The crawler-facing build steps read programs from the same public API the
// site uses, so a batch date edited in the admin panel reaches llms.txt,
// llms-full.txt, sitemap.xml and the prerendered <head> on the next deploy.
//
// The static catalogue is still the offline floor: if the API is not configured
// (local builds) or is briefly unavailable during a deploy, generation falls
// back to it with a warning rather than publishing an empty file.

import {programCatalog} from "../src/data/programCatalog.js";

const API_BASE = String(
  process.env.PUBLIC_API_BASE_URL || process.env.VITE_PUBLIC_API_BASE_URL || "",
).replace(/\/+$/, "");

const TIMEOUT_MS = 8000;

export const hasLiveProgramsApi = Boolean(API_BASE);

export async function loadLivePrograms() {
  if (!API_BASE) return programCatalog;

  const staticBySlug = new Map(programCatalog.map((program) => [program.id, program]));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/public/programs?limit=100`, {
      signal: controller.signal,
      headers: {Accept: "application/json"},
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const records = Array.isArray(payload?.data) ? payload.data : [];
    if (records.length === 0) throw new Error("empty program list");

    const live = records.map((record) => {
      const fallback = staticBySlug.get(record.slug) || {};
      return {
        // Static-only fields (modules, brochure, landingPath, rich curriculum
        // copy) fill anything an older database record does not carry. Admin
        // values always win where both exist.
        ...fallback,
        ...record,
        id: record.slug,
        landingPath: fallback.landingPath || `/programs/${record.slug}`,
      };
    });

    console.log(`live programs: ${live.length} records from ${API_BASE}`);
    return live;
  } catch (error) {
    console.warn(`live programs: ${error.message}; using the static catalogue`);
    return programCatalog;
  } finally {
    clearTimeout(timer);
  }
}
