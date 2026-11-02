// Removes "Lifetime Placement Assistance" from published program copy.
//
// The phrase was dropped from the catalogue (src/data/programCatalog.js) and
// from the admin panel's default gains list, but programs that were already
// published keep their saved copy in the database — and the API's copy wins
// over the static catalogue on the program page. This strips it from the
// records that still carry it.
//
//   npm run clean:placement-assistance         read-only report
//   npm run clean:placement-assistance:apply   write the changes
//
// Only the exact phrase is touched: badge chips and gain list entries are
// removed, and the one sentence that mentions it in gainsIntro loses the
// clause, nothing else.

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";
import {Program} from "../src/models/Program.js";

const APPLY = process.argv.includes("--apply");
const PHRASE = "Lifetime Placement Assistance";

const stripArrays = (values = []) =>
  values.filter((value) => String(value).trim().toLowerCase() !== PHRASE.toLowerCase());

const stripIntro = (intro = "") =>
  intro
    .replace(/\s*,?\s*and lifetime placement assistance/i, "")
    .replace(/\s*,?\s*lifetime placement assistance/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1");

const run = async () => {
  const connection = await connectDatabase();
  console.log(`\nChecking ${connection.name} for "${PHRASE}"\n`);

  const programs = await Program.find({}).select("slug title badges gains gainsIntro").lean();
  const affected = programs.filter(
    (program) =>
      stripArrays(program.badges).length !== (program.badges || []).length ||
      stripArrays(program.gains).length !== (program.gains || []).length ||
      stripIntro(program.gainsIntro || "") !== (program.gainsIntro || ""),
  );

  console.log(`${affected.length} program(s) still mention it\n`);
  for (const program of affected) {
    const badgeHits = (program.badges || []).length - stripArrays(program.badges).length;
    const gainHits = (program.gains || []).length - stripArrays(program.gains).length;
    const introHit = stripIntro(program.gainsIntro || "") !== (program.gainsIntro || "");
    const parts = [
      badgeHits ? `${badgeHits} badge` : null,
      gainHits ? `${gainHits} gain` : null,
      introHit ? "gainsIntro sentence" : null,
    ].filter(Boolean);
    console.log(`  ${program.slug || program._id} · ${program.title || "(untitled)"} — ${parts.join(", ")}`);
  }

  if (!APPLY) {
    console.log(
      affected.length
        ? "\nDry run: nothing written. Re-run with --apply to remove the phrase.\n"
        : "\nNothing to clean up.\n",
    );
    return;
  }

  let updated = 0;
  for (const program of affected) {
    const update = {};
    if ((program.badges || []).length !== stripArrays(program.badges).length) {
      update.badges = stripArrays(program.badges);
    }
    if ((program.gains || []).length !== stripArrays(program.gains).length) {
      update.gains = stripArrays(program.gains);
    }
    const intro = stripIntro(program.gainsIntro || "");
    if (intro !== (program.gainsIntro || "")) update.gainsIntro = intro;

    const result = await Program.updateOne({_id: program._id}, {$set: update});
    updated += result.modifiedCount || 0;
  }

  console.log(`\nUpdated ${updated} program(s).\n`);
};

run()
  .catch((error) => {
    console.error("\nCleanup failed:", error.message, "\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
