import {iconComponent, iconToken} from "./cinematicIcons";

/* Shared, serialisable building blocks for every cinematic programme's
   "Load current page copy" template and runtime override merge. No catalogue
   data and no React components live here — only the shape both the admin and
   the page need to agree on. */

export const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const cloneCopy = (value) => structuredClone(value);

export const pad = (n) => String(n).padStart(2, "0");

export const art = (name) => `/images/curriculum/${name}.webp`;

export const artwork = (value) => (!value ? value : value.startsWith("/") ? value : art(value));

export const moduleRange = (from, to) => (from === to ? `Module ${pad(from)}` : `Modules ${pad(from)}–${pad(to)}`);

export const modulesAsWeeks = (modules, from, to) =>
  modules.slice(from - 1, to).map((m) => ({
    id: `M${pad(m.n)}`,
    title: m.title,
    topics: m.points,
    build: m.deliverable ? `Deliverable — ${m.deliverable}` : undefined,
  }));

/* An admin record is an optional-field document. Live values win, but a blank
   or missing one must fall back to the shipped catalogue rather than blanking a
   section of the page. */
export const withFallback = (record, fallback = {}) => ({
  ...fallback,
  ...Object.fromEntries(
    Object.entries(record || {}).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ),
});

/* Section-by-section overrides. Missing keys and missing sections keep the
   built-in copy; arrays are replaced wholesale (that is what a repeater edit
   should do), while nested objects merge so an editor can change one line of
   `certs.roadmap` without retyping the other ten. `id` and the live title are
   never editable here. */
const mergeValue = (base, override) =>
  isPlainObject(base) && isPlainObject(override)
    ? {
        ...base,
        ...Object.fromEntries(
          Object.entries(override)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, mergeValue(base[key], value)]),
        ),
      }
    : override;

export const mergeSection = (base, override) =>
  isPlainObject(override) ? mergeValue(base, override) : base;

export const applyOverrides = (base, overrides) => {
  if (!isPlainObject(overrides)) return base;
  const merged = {...base};
  for (const [section, value] of Object.entries(overrides)) {
    if (section === "id" || section === "programTitle" || !(section in base)) continue;
    merged[section] = mergeSection(base[section], value);
  }
  return merged;
};

/* Duration, module count, format, batch and seats are facts, not copy. Keep the
   editor's extra badges but replace — and de-duplicate — the ones the page
   derives from the programme record. */
const DERIVED_BADGE = /^(?:\d+\s*(?:weeks?|months?)|\d+\s+modules?|live\s+online)$/i;

export const reapplyHeroBadges = (badges, liveBadges) => {
  const live = (liveBadges || []).map(String).filter(Boolean);
  const kept = (Array.isArray(badges) ? badges : []).filter((badge) => {
    const value = String(badge);
    return !live.some((item) => item.toLowerCase() === value.toLowerCase()) && !DERIVED_BADGE.test(value);
  });
  return [...live, ...kept];
};

/* Turns a live content object (React icons and all) into the JSON an editor can
   load. Icons become tokens. Only the page's identity is removed here — nested
   ids (stage "01", week "W01") are structural and the module grid renders them,
   so they must survive serialization. Section-specific live facts are removed
   by templateFromContent, and the page builders re-apply them after a merge. */
export const toSerializableCopy = (content) => {
  const seen = new WeakSet();
  const copy = JSON.parse(
    JSON.stringify(content, (key, value) => {
      const token = iconToken(value);
      if (token) return token;
      if (typeof value === "function") return undefined;
      if (isPlainObject(value) || Array.isArray(value)) {
        if (seen.has(value)) return undefined;
        seen.add(value);
      }
      return value;
    }),
  );
  if (isPlainObject(copy)) {
    delete copy.id;
    delete copy.programTitle;
  }
  return copy;
};

/* The template needs the same section keys as the page, minus values the page
   re-derives on every render. Keeping them out of the stored JSON is what stops
   a stale duration badge or old batch date being saved back into the record. */
export const templateFromContent = (content, {keepTimelineFacts = false, keepWeeks = false} = {}) => {
  const copy = toSerializableCopy(content);
  if (copy.hero) {
    delete copy.hero.ariaLabel;
    delete copy.hero.stats;
    delete copy.hero.metaRight;
    delete copy.hero.image;
    delete copy.hero.video;
  }
  if (Array.isArray(copy.timeline?.items)) {
    copy.timeline.items = keepTimelineFacts
      ? copy.timeline.items.map(({num, ...item}) => item)
      : copy.timeline.items.map(({num, year, tags, image, ...item}) => item);
  }
  if (Array.isArray(copy.modules?.stages) && !keepWeeks) {
    copy.modules.stages = copy.modules.stages.map(({weeks, ...stage}) => stage);
  }
  if (copy.modules?.lockCard) delete copy.modules.lockCard.programId;
  if (Array.isArray(copy.projects?.items)) {
    copy.projects.items = copy.projects.items.map(({id, icon, ...item}) => item);
  }
  if (Array.isArray(copy.system?.nodes)) {
    copy.system.nodes = copy.system.nodes.map(({img, ...node}) => node);
  }
  if (Array.isArray(copy.careers?.roles)) {
    const liveRoleKeys = [
      "salary", "years", "location", "year", "source",
      "salaryVaried", "salaryMappedTo", "salaryMappedRange",
    ];
    copy.careers.roles = copy.careers.roles.map((role) =>
      Object.fromEntries(Object.entries(role).filter(([key]) => !liveRoleKeys.includes(key))),
    );
  }
  if (Array.isArray(copy.stats?.items)) {
    copy.stats.items = copy.stats.items.map(({value, ...item}) => item);
  }
  if (Array.isArray(copy.certs?.certificates)) {
    copy.certs.certificates = copy.certs.certificates.map(({mark, stage, ...certificate}) => certificate);
  }
  return copy;
};

export {iconComponent};
