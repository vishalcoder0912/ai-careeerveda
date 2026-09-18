// Cheap shared derivations for the program-detail page. Kept here so the hero,
// the sticky information panel and the pricing section never disagree about the
// same record field.

export const feeText = (amount) =>
  amount ? `₹ ${String(amount).replace(/^₹/, "")}` : null;

// Gain and badge copy is real record content; the UI only flips a label from
// it rather than inventing a claim. Placement support is present (and the exact
// wording comes straight from the record) whenever the program's own material
// says so.
export const mentionPlacement = (program) =>
  Boolean(
    (program.badges || []).some((b) => /placement|assistance/i.test(b)) ||
      (program.gains || []).some((g) => /placement|hiring preparation|assistance/i.test(g)),
  );

export const placementText = (program) => {
  const match = (program.gains || []).find((g) =>
    /placement|hiring preparation/i.test(g),
  );
  return match || "Placement support";
};

// The three headline points shown in the right information panel: data comes
// exclusively from the program record, so the panel stays truthful when a field
// is missing (each row is optional and filtered before rendering).
export const panelHighlights = (program) => [
  program.duration && {label: "Duration", value: program.duration, icon: "clock"},
  program.format && {
    label: "Delivery",
    value: `${program.format} · Recorded access`,
    icon: "monitor",
  },
  mentionPlacement(program) && {
    label: "Placement",
    value: placementText(program),
    icon: "briefcase",
  },
  program.mentorship && {
    label: "Mentorship",
    value: Array.isArray(program.mentorship) ? program.mentorship.join(", ") : program.mentorship,
    icon: "user",
  },
  program.format && {label: "Format", value: program.format, icon: "monitor"},
].filter(Boolean);

export const panelMetaRows = (program) => [
  program.emi && {label: "EMI available", value: program.emi},
  program.nextBatch && {label: "Next batch", value: program.nextBatch},
  program.seats && {label: "Seats", value: program.seats},
].filter(Boolean);

// Splits "PG Program in X" so the hero can paint the X with the brand accent,
// matching the reference's two-tone headline. Falls back to the plain title
// when the prefix is absent.
export const titleParts = (title) => {
  const text = String(title || "");
  const match = text.match(/^(PG Program in\s+)(.*)$/i);
  return match ? {prefix: match[1], keyword: match[2]} : {prefix: "", keyword: text};
};